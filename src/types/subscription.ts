/**
 * Subscription Management Types
 *
 * SaaS layer: each Centre subscribes to a Plan, giving it a Subscription with a
 * Status that controls SYSTEM ACCESS.
 *
 * RELATIONSHIP:  CENTRE -> PLAN -> SUBSCRIPTION -> STATUS -> SYSTEM ACCESS
 *
 * DISTINCTION:
 *   SUBSCRIPTION / PLAN FEATURE  = WHAT THE CENTRE CAN USE (centre-level service access)
 *   ROLE / PERMISSION            = WHAT THE USER CAN DO (user-level, unchanged)
 *
 * SECURITY:
 *   - A centre can only ever read its OWN subscription (RLS + service-role writes).
 *   - Only platform-level operations (subscriptions.manage) may create / change
 *     plans, activate, suspend, cancel or extend subscriptions.
 *   - Important changes are recorded in subscription_history AND the audit trail.
 */

// ─── Enumerations ────────────────────────────────────────────

export const SUBSCRIPTION_STATUSES = [
  "trial",
  "active",
  "expired",
  "suspended",
  "cancelled",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const BILLING_PERIODS = [
  "ONETIME",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

/** Statuses that grant normal system access (a valid, in-date subscription). */
export const ACTIVE_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  "trial",
  "active",
] as const;

/** Statuses that RESTRICT normal system access. */
export const RESTRICTED_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  "expired",
  "suspended",
  "cancelled",
] as const;

/**
 * Feature keys used for centre-level PLAN FEATURE access.
 * These are stored per-plan in plan_features and are NOT user permissions.
 */
export const PLAN_FEATURE_KEYS = [
  "CORE",
  "MANAGEMENT",
  "EXPORT",
  "ANALYTICS",
] as const;
export type PlanFeatureKey = (typeof PLAN_FEATURE_KEYS)[number];

// ─── Entities ────────────────────────────────────────────────

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  billing_period: BillingPeriod;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanFeature {
  id: string;
  plan_id: string;
  feature_key: PlanFeatureKey | string;
  feature_label: string | null;
  enabled: boolean;
  created_at: string;
}

export interface PlanWithFeatures extends Plan {
  features: PlanFeature[];
}

/** Representative user-facing summary of a plan (no price/internal admin detail). */
export interface PlanSummary {
  id: string;
  name: string;
  description: string | null;
}

export interface Subscription {
  id: string;
  centre_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  start_date: string | null;
  end_date: string | null;
  trial_ends_at: string | null;
  payment_status: string | null;
  payment_provider: string | null;
  payment_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionWithPlan extends Subscription {
  plan: PlanWithFeatures;
}

/** A subscription joined with its plan and centre, for platform administration. */
export interface SubscriptionRecord extends Subscription {
  plan: Plan;
  centre: { id: string; name: string; code: string } | null;
}

export interface SubscriptionHistoryEntry {
  id: string;
  subscription_id: string;
  centre_id: string;
  action: string;
  plan_id: string | null;
  previous_status: SubscriptionStatus | null;
  new_status: SubscriptionStatus | null;
  changed_by: string | null;
  reason: string | null;
  changed_at: string;
}

/** The result of evaluating whether a centre currently has service access. */
export interface SubscriptionAccess {
  /** The centre's current subscription summary, or null if none exists. */
  subscription: SubscriptionWithPlan | null;
  status: SubscriptionStatus | "none";
  /** Whether the centre is allowed normal service access based ONLY on subscription. */
  valid: boolean;
  /** Enhanced by date checks too (end_date / trial expiry). */
  validOnDate: boolean;
  /** A friendly, non-technical reason for restricted access. */
  reason: string;
  /** The set of feature keys enabled by the current plan. */
  enabledFeatures: Set<PlanFeatureKey>;
}

// ─── Display helpers ─────────────────────────────────────────

export function isSubscriptionActiveStatus(
  status: SubscriptionStatus,
): boolean {
  return ACTIVE_SUBSCRIPTION_STATUSES.includes(status);
}

export function getSubscriptionStatusDisplay(s: SubscriptionStatus | "none"): string {
  const map: Record<SubscriptionStatus | "none", string> = {
    trial: "Trial",
    active: "Active",
    expired: "Expired",
    suspended: "Suspended",
    cancelled: "Cancelled",
    none: "No Subscription",
  };
  return map[s];
}

export function getSubscriptionStatusBadge(s: SubscriptionStatus | "none"): string {
  const map: Record<SubscriptionStatus | "none", string> = {
    trial: "bg-sky-100 text-sky-700",
    active: "bg-green-100 text-green-800",
    expired: "bg-red-100 text-red-700",
    suspended: "bg-yellow-100 text-yellow-800",
    cancelled: "bg-gray-100 text-gray-700",
    none: "bg-gray-100 text-gray-700",
  };
  return map[s];
}

/** ISO/date string -> short readable date, e.g. "31 Dec 2026". */
export function formatPlanDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
