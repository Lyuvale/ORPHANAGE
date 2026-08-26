import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "@/types/user-profile";
import type { Centre } from "@/types/centre";

/**
 * Full server-side user context.
 *
 * Contains everything a module needs to know about the current
 * authenticated user, their profile, and their centre.
 *
 * Future modules should use this context instead of looking up
 * tenant/user information independently.
 */
export interface AppUserContext {
  /** The Supabase auth user ID (from auth.users). */
  authUserId: string;
  /** The application user profile. */
  profile: UserProfile;
  /** The user's centre. */
  centre: Centre;
  /** Whether the user's profile is active. */
  isUserActive: boolean;
  /** Whether the user's centre is active. */
  isCentreActive: boolean;
  /** Whether the user can access normal application services. */
  canAccess: boolean;
}

/**
 * Error thrown when authentication or authorization fails.
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Obtain the full application user context for the current request.
 *
 * This is THE authoritative function for determining:
 * - Who is this user?
 * - Which centre do they belong to?
 * - Is the user active?
 * - Is the user's centre active?
 * - Can the user access normal application services?
 *
 * SECURITY: This function derives ALL information from the server-side
 * session and database. It NEVER trusts client-supplied centre_id or
 * user_id. The centre_id is looked up from user_profiles based on
 * the authenticated auth.uid().
 *
 * @param supabase - A Supabase client with the user's session (anon key, RLS enforced).
 * @returns The full AppUserContext if the user is authenticated and has an active profile.
 * @throws AuthError if the user is not authenticated, has no profile, or is inactive.
 */
export async function getAppUserContext(
  supabase: SupabaseClient,
): Promise<AppUserContext> {
  // 1. Get the authenticated user from the session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthError(
      "Authentication required: no active session.",
      "NOT_AUTHENTICATED",
    );
  }

  // 2. Load the user profile from the database (NOT from JWT)
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile) {
    throw new AuthError(
      "Access denied: no application profile found for this user.",
      "NO_PROFILE",
    );
  }

  // 3. Load the centre from the database
  const { data: centre, error: centreError } = await supabase
    .from("centres")
    .select("*")
    .eq("id", profile.centre_id)
    .single();

  if (centreError || !centre) {
    throw new AuthError(
      "Access denied: the user's associated centre does not exist.",
      "CENTRE_NOT_FOUND",
    );
  }

  // 4. Determine access status
  const isUserActive = profile.status === "active";
  const isCentreActive = centre.status === "active";
  const canAccess = isUserActive && isCentreActive;

  return {
    authUserId: user.id,
    profile: profile as UserProfile,
    centre: centre as Centre,
    isUserActive,
    isCentreActive,
    canAccess,
  };
}

/**
 * Get the application user context and enforce access.
 *
 * Same as getAppUserContext(), but throws if the user cannot access
 * normal application services (user inactive OR centre inactive).
 *
 * Use this for any request that requires normal application access.
 *
 * @param supabase - A Supabase client with the user's session.
 * @returns The full AppUserContext (guaranteed to have canAccess = true).
 * @throws AuthError if the user cannot access normal services.
 */
export async function requireAppAccess(
  supabase: SupabaseClient,
): Promise<AppUserContext> {
  const ctx = await getAppUserContext(supabase);

  if (!ctx.canAccess) {
    if (!ctx.isUserActive) {
      throw new AuthError(
        "Access denied: your account has been deactivated.",
        "USER_DEACTIVATED",
      );
    }
    if (!ctx.isCentreActive) {
      throw new AuthError(
        `Access denied: your centre (${ctx.centre.name}) is currently ${ctx.centre.status}.`,
        "CENTRE_NOT_ACTIVE",
      );
    }
  }

  return ctx;
}
