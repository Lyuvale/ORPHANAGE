import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "@/types/user-profile";
import type { Centre } from "@/types/centre";
import type {
  SubscriptionWithPlan,
  PlanFeatureKey,
} from "@/types/subscription";
import { loadSubscriptionForContext } from "@/lib/subscriptions/subscription-access.service";

/**
 * Full server-side user context.
 *
 * Contains everything a module needs to know about the current
 * authenticated user, their profile, and their centre.
 *
 * ACCESS CHAIN:
 *   USER AUTHENTICATED -> USER ACTIVE -> CENTRE ACTIVE -> SUBSCRIPTION VALID
 *     -> PLAN ALLOWS FEATURE -> USER ROLE/PERMISSION ALLOWS ACTION -> ALLOW
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
  /** The centre's current subscription (with plan + features), if any. */
  subscription: SubscriptionWithPlan | null;
  /** Whether the centre's subscription is currently valid (service access). */
  isSubscriptionValid: boolean;
  /** Feature keys enabled by the centre's current plan (centre-level access). */
  enabledPlanFeatures: Set<PlanFeatureKey>;
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
    super(`[${code}] ${message}`);
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

  // 4. Load the centre's subscription (subscription = what the centre can use).
  //    Read via the session client -> RLS scopes to the user's own centre only.
  const subCtx = await loadSubscriptionForContext(
    supabase as never,
    profile.centre_id,
  );

  // 5. Determine access status
  const isUserActive = profile.status === "active";
  const isCentreActive = centre.status === "active";
  const isSubscriptionValid = subCtx.isSubscriptionValid;
  const canAccess = isUserActive && isCentreActive && isSubscriptionValid;

  return {
    authUserId: user.id,
    profile: profile as UserProfile,
    centre: centre as Centre,
    isUserActive,
    isCentreActive,
    subscription: subCtx.subscription,
    isSubscriptionValid,
    enabledPlanFeatures: subCtx.enabledFeatures,
    canAccess,
  };
}

/**
 * Get the application user context and enforce access.
 *
 * Same as getAppUserContext(), but throws if the user cannot access
 * normal application services.
 *
 * ACCESS GATE:
 *   - user inactive                          -> USER_DEACTIVATED
 *   - centre inactive (suspended/deactivated)-> CENTRE_NOT_ACTIVE
 *   - centre subscription invalid (inactive /
 *     expired / suspended / cancelled / lapsed trial) -> SUBSCRIPTION_INACTIVE
 *
 * Use this for any request that requires normal application access.
 *
 * @param supabase - A Supabase client with the user's session.
 * @param opts.allowInactiveSubscription - when true, an invalid subscription is
 *   tolerated so that subscription-related routes (e.g. the "my subscription"
 *   page, restricted-access messaging, and platform administration) can still
 *   run. Defaults to false (normal routes enforce the subscription gate).
 * @returns The full AppUserContext (guaranteed to have canAccess = true when
 *   allowInactiveSubscription is false; otherwise user+centre access is enforced).
 * @throws AuthError if the user cannot access normal services.
 */
export async function requireAppAccess(
  supabase: SupabaseClient,
  opts: { allowInactiveSubscription?: boolean } = {},
): Promise<AppUserContext> {
  const ctx = await getAppUserContext(supabase);

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
  if (!ctx.isSubscriptionValid && !opts.allowInactiveSubscription) {
    throw new AuthError(
      "Access denied: your centre's subscription is currently inactive. Please contact the platform administrator.",
      "SUBSCRIPTION_INACTIVE",
    );
  }

  return ctx;
}
