import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "@/types/user-profile";
import type { Centre } from "@/types/centre";
import type {
  SubscriptionWithPlan,
  PlanFeatureKey,
} from "@/types/subscription";
import { loadSubscriptionForContext } from "@/lib/subscriptions/subscription-access.service";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Full server-side user context.
 */
export interface AppUserContext {
  authUserId: string;
  profile: UserProfile;
  centre: Centre;
  isUserActive: boolean;
  isCentreActive: boolean;
  subscription: SubscriptionWithPlan | null;
  isSubscriptionValid: boolean;
  enabledPlanFeatures: Set<PlanFeatureKey>;
  canAccess: boolean;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(`[${code}] ${message}`);
    this.name = "AuthError";
  }
}

/** Placeholder centre for platform admin (no real centre). */
const ADMIN_PLACEHOLDER_CENTRE: Centre = {
  id: "00000000-0000-0000-0000-000000000000",
  name: "Platform Administration",
  code: "PLATFORM",
  status: "active",
  contact_email: null,
  contact_phone: null,
  address_line1: null,
  address_line2: null,
  city: null,
  state: null,
  postal_code: null,
  country: "Kenya",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export async function getAppUserContext(
  supabase: SupabaseClient,
): Promise<AppUserContext> {
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

  // Check role for platform admin (use admin client — RLS blocks session client when centre_id is NULL)
  const adminClient = createAdminClient();
  const { data: roleData } = await adminClient
    .from("user_roles")
    .select("role:roles(name)")
    .eq("user_id", profile.id)
    .limit(1)
    .maybeSingle();

  const roleName = (roleData as { role: { name: string } | null } | null)
    ?.role?.name;
  const isPlatformAdmin = roleName === "PLATFORM_ADMINISTRATOR";

  // Platform admin always gets placeholder centre — they operate across all centres
  if (isPlatformAdmin) {
    return {
      authUserId: user.id,
      profile: profile as UserProfile,
      centre: ADMIN_PLACEHOLDER_CENTRE,
      isUserActive: profile.status === "active",
      isCentreActive: true,
      subscription: null,
      isSubscriptionValid: true,
      enabledPlanFeatures: new Set(),
      canAccess: true,
    };
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

  // 4. Load subscription
  const subCtx = await loadSubscriptionForContext(
    supabase as never,
    profile.centre_id,
  );

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
