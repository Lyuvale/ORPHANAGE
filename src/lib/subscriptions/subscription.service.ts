/**
 * Subscription Service
 *
 * Platform-level business logic for Plans, Plan Features and Subscriptions.
 *
 * All reads/writes here use the service-role (admin) client, bypassing RLS.
 * Authorization is enforced at the application layer BEFORE calling these
 * functions (requireAppAccess + requirePermission + subscriptions.manage for
 * mutations; subscriptions.view for platform listing; normal access for a
 * centre viewing its own subscription).
 *
 * Relationships:
 *   CENTRE -> PLAN -> SUBSCRIPTION -> STATUS -> SYSTEM ACCESS
 *
 * SECURITY:
 *   - Tenant isolation: functions that return a centre's subscription scope
 *     their queries to that centre_id. Cross-centre listing is platform-only.
 *   - No subscription status may be changed by a client; only these
 *     platform functions change status and record history.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SubscriptionStatusError,
  AccessError,
} from "./subscription-domain";
import type {
  Plan,
  PlanWithFeatures,
  PlanFeature,
  PlanFeatureKey,
  Subscription,
  SubscriptionStatus,
  SubscriptionWithPlan,
  SubscriptionRecord,
  SubscriptionHistoryEntry,
  SubscriptionAccess,
  BillingPeriod,
  PlanSummary,
} from "@/types/subscription";
import {
  RESTRICTED_SUBSCRIPTION_STATUSES,
  PLAN_FEATURE_KEYS,
  isSubscriptionActiveStatus,
} from "@/types/subscription";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

// ─── Validation helpers (domain) ───────────────────────────────

export function isSubscriptionStatus(value: string): value is SubscriptionStatus {
  return (
    value === "trial" ||
    value === "active" ||
    value === "expired" ||
    value === "suspended" ||
    value === "cancelled"
  );
}

export function isBillingPeriod(value: string): value is BillingPeriod {
  return (
    value === "ONETIME" ||
    value === "DAILY" ||
    value === "WEEKLY" ||
    value === "MONTHLY" ||
    value === "QUARTERLY" ||
    value === "YEARLY"
  );
}

export function isPlanFeatureKey(value: string): value is PlanFeatureKey {
  return (PLAN_FEATURE_KEYS as readonly string[]).includes(value);
}

// ─── Plans ─────────────────────────────────────────────────────

export interface PlanInput {
  name: string;
  description?: string | null;
  price?: number | string;
  billing_period?: BillingPeriod;
  is_active?: boolean;
}

export interface PlanUpdateInput {
  name?: string;
  description?: string | null;
  price?: number | string;
  billing_period?: BillingPeriod;
  is_active?: boolean;
}

export async function listPlans(
  admin: AdminClient,
  options: { includeInactive?: boolean } = {},
): Promise<PlanWithFeatures[]> {
  let query = admin.from("plans").select("*").order("price", { ascending: true });
  if (!options.includeInactive) {
    query = query.eq("is_active", true);
  }
  const { data, error } = await query;
  if (error) throw new Error(`Failed to list plans: ${error.message}`);

  const plans = (data ?? []) as Plan[];
  const out: PlanWithFeatures[] = [];
  for (const plan of plans) {
    out.push(await getPlanWithFeatures(admin, plan));
  }
  return out;
}

export async function getPlanById(
  admin: AdminClient,
  id: string,
): Promise<PlanWithFeatures | null> {
  const { data, error } = await admin.from("plans").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to get plan: ${error.message}`);
  if (!data) return null;
  return getPlanWithFeatures(admin, data as Plan);
}

export async function getActivePlansSummary(
  admin: AdminClient,
): Promise<PlanSummary[]> {
  const { data, error } = await admin
    .from("plans")
    .select("id, name, description")
    .eq("is_active", true)
    .order("price", { ascending: true });
  if (error) return [];
  return (data ?? []) as PlanSummary[];
}

async function getPlanWithFeatures(admin: AdminClient, plan: Plan): Promise<PlanWithFeatures> {
  const { data: features, error } = await admin
    .from("plan_features")
    .select("*")
    .eq("plan_id", plan.id);
  if (error) throw new Error(`Failed to get plan features: ${error.message}`);
  return { ...plan, features: (features ?? []) as PlanFeature[] };
}

export async function createPlan(admin: AdminClient, input: PlanInput): Promise<PlanWithFeatures> {
  const { data, error } = await admin
    .from("plans")
    .insert({
      name: input.name,
      description: input.description ?? null,
      price: input.price ?? 0,
      billing_period: input.billing_period ?? "MONTHLY",
      is_active: input.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("A plan with this name already exists.");
    throw new Error(`Failed to create plan: ${error.message}`);
  }
  return getPlanWithFeatures(admin, data as Plan);
}

export async function updatePlan(
  admin: AdminClient,
  id: string,
  input: PlanUpdateInput,
): Promise<PlanWithFeatures> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.description !== undefined) payload.description = input.description;
  if (input.price !== undefined) payload.price = input.price;
  if (input.billing_period !== undefined) payload.billing_period = input.billing_period;
  if (input.is_active !== undefined) payload.is_active = input.is_active;

  if (Object.keys(payload).length === 0) throw new Error("No fields to update.");

  const { data, error } = await admin
    .from("plans")
    .update(payload)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) {
    if (error.code === "23505") throw new Error("A plan with this name already exists.");
    throw new Error(`Failed to update plan: ${error.message}`);
  }
  if (!data) throw new Error("Plan not found.");
  return getPlanWithFeatures(admin, data as Plan);
}

/** Fully replace the feature access set for a plan. */
export async function setPlanFeatures(
  admin: AdminClient,
  planId: string,
  features: { feature_key: string; feature_label?: string | null; enabled: boolean }[],
): Promise<PlanWithFeatures> {
  // Replace in a transaction-ish manner: delete existing, then insert new.
  await admin.from("plan_features").delete().eq("plan_id", planId);

  if (features.length > 0) {
    const { error } = await admin.from("plan_features").insert(
      features.map((f) => ({
        plan_id: planId,
        feature_key: f.feature_key,
        feature_label: f.feature_label ?? null,
        enabled: f.enabled,
      })),
    );
    if (error) throw new Error(`Failed to set plan features: ${error.message}`);
  }
  const plan = await getPlanById(admin, planId);
  if (!plan) throw new Error("Plan not found.");
  return plan;
}

// ─── Subscriptions ────────────────────────────────────────────

export interface SubscriptionInput {
  centreId: string;
  planId: string;
  status?: SubscriptionStatus;
  startDate?: string | null;
  endDate?: string | null;
  trialEndsAt?: string | null;
  paymentStatus?: string | null;
  paymentProvider?: string | null;
  paymentReference?: string | null;
}

/**
 * Assign a plan to a centre by creating a new subscription period.
 * If the centre already has an active (trial/active) subscription, it is first
 * ended (status -> 'cancelled'/expired with end_date set) to keep one active
 * subscription at a time. History is recorded for the change.
 */
export async function createSubscription(
  admin: AdminClient,
  input: SubscriptionInput,
  opts: { actorUserId?: string | null; reason?: string } = {},
): Promise<Subscription> {
  const current = await getCurrentSubscription(admin, input.centreId);
  if (current && isSubscriptionActiveStatus(current.status)) {
    await setSubscriptionStatus(admin, current.id, "cancelled", {
      actorUserId: opts.actorUserId,
      reason: opts.reason ?? "Superseded by a new plan assignment",
      endDate: new Date().toISOString().slice(0, 10),
    });
  }

  const { data, error } = await admin
    .from("subscriptions")
    .insert({
      centre_id: input.centreId,
      plan_id: input.planId,
      status: input.status ?? "trial",
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      trial_ends_at: input.trialEndsAt ?? null,
      payment_status: input.paymentStatus ?? null,
      payment_provider: input.paymentProvider ?? null,
      payment_reference: input.paymentReference ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create subscription: ${error.message}`);
  const sub = data as Subscription;

  await recordHistory(admin, sub.id, {
    centreId: input.centreId,
    action: "CREATED",
    planId: input.planId,
    newStatus: sub.status,
    actorUserId: opts.actorUserId ?? null,
    reason: opts.reason ?? null,
  });

  return sub;
}

/**
 * Get a subscription by id (platform context). Scoped optional to a centre.
 */
export async function getSubscriptionById(
  admin: AdminClient,
  id: string,
  opts: { centreId?: string } = {},
): Promise<SubscriptionWithPlan | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = admin
    .from("subscriptions")
    .select("*, plan:plan_id(*)")
    .eq("id", id);
  if (opts.centreId) q = q.eq("centre_id", opts.centreId);

  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(`Failed to get subscription: ${error.message}`);
  if (!data) return null;

  const { plan, ...sub } = data as unknown as { plan: Plan } & Omit<Subscription, "plan_id"> & { plan_id: string };
  if (!(plan as unknown as Plan)?.id) {
    throw new Error("Subscription references a missing plan.");
  }
  const planWithFeatures = await getPlanWithFeatures(admin, plan as unknown as Plan);
  return { ...(sub as unknown as Subscription), plan: planWithFeatures };
}

/**
 * Get the CURRENT subscription (most recent non-terminal row, else most recent)
 * for a centre, with its plan features. Tenancy scoped by centre_id.
 */
export async function getCurrentSubscription(
  admin: AdminClient,
  centreId: string,
): Promise<Subscription | null> {
  // Most recent active/trial first, otherwise most recent.
  const { data, error } = await admin
    .from("subscriptions")
    .select("*")
    .eq("centre_id", centreId)
    .in("status", ["trial", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    // Fall back to the most recent subscription row regardless of status.
    const { data: latest } = await admin
      .from("subscriptions")
      .select("*")
      .eq("centre_id", centreId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (latest as Subscription) ?? null;
  }

  if (error) throw new Error(`Failed to get current subscription: ${error.message}`);
  return (data as Subscription) ?? null;
}

/** Change a subscription's status (activate / suspend / cancel / expire). */
export async function setSubscriptionStatus(
  admin: AdminClient,
  id: string,
  status: SubscriptionStatus,
  opts: { actorUserId?: string | null; reason?: string; endDate?: string | null } = {},
): Promise<SubscriptionWithPlan> {
  const current = await getSubscriptionWithPlanById(admin, id);
  if (!current) throw new Error("Subscription not found.");

  const payload: Record<string, unknown> = { status };
  if (opts.endDate !== undefined) payload.end_date = opts.endDate;

  const { data, error } = await admin
    .from("subscriptions")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Failed to update subscription: ${error.message}`);

  const updated = data as Subscription;
  await recordHistory(admin, id, {
    centreId: updated.centre_id,
    action: "STATUS_CHANGED",
    planId: updated.plan_id,
    previousStatus: current.status,
    newStatus: updated.status,
    actorUserId: opts.actorUserId ?? null,
    reason: opts.reason ?? null,
  });

  return getSubscriptionWithPlanById(admin, id) as Promise<SubscriptionWithPlan>;
}

/**
 * Activate a subscription (used to grant normal access, e.g. after a renewal).
 */
export async function activateSubscription(
  admin: AdminClient,
  id: string,
  opts: { actorUserId?: string | null; reason?: string; endDate?: string | null } = {},
): Promise<SubscriptionWithPlan> {
  return setSubscriptionStatus(admin, id, "active", {
    actorUserId: opts.actorUserId,
    reason: opts.reason ?? "Subscription activated",
    endDate: opts.endDate,
  });
}

/** Extend subscription dates (end_date / trial_ends_at) without changing plan. */
export async function extendSubscription(
  admin: AdminClient,
  id: string,
  input: { endDate?: string | null; trialEndsAt?: string | null },
  opts: { actorUserId?: string | null; reason?: string } = {},
): Promise<SubscriptionWithPlan> {
  const current = await getSubscriptionWithPlanById(admin, id);
  if (!current) throw new Error("Subscription not found.");

  const payload: Record<string, unknown> = {};
  if (input.endDate !== undefined) payload.end_date = input.endDate;
  if (input.trialEndsAt !== undefined) payload.trial_ends_at = input.trialEndsAt;
  if (Object.keys(payload).length === 0) throw new Error("No dates to extend.");

  const { data, error } = await admin
    .from("subscriptions")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Failed to extend subscription: ${error.message}`);

  const updated = data as Subscription;
  await recordHistory(admin, id, {
    centreId: updated.centre_id,
    action: "EXTENDED",
    planId: updated.plan_id,
    newStatus: updated.status,
    actorUserId: opts.actorUserId ?? null,
    reason: opts.reason ?? null,
  });

  return getSubscriptionWithPlanById(admin, id) as Promise<SubscriptionWithPlan>;
}

async function getSubscriptionWithPlanById(
  admin: AdminClient,
  id: string,
): Promise<SubscriptionWithPlan | null> {
  return getSubscriptionById(admin, id);
}

/** List subscriptions (platform administration, cross-centre). */
export async function listSubscriptions(
  admin: AdminClient,
  options: { status?: SubscriptionStatus; centreId?: string; limit?: number; offset?: number } = {},
): Promise<{ data: SubscriptionRecord[]; count: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = admin
    .from("subscriptions")
    .select("*, plan:plan_id(*), centre:centre_id(id, name, code)", { count: "exact" })
    .order("created_at", { ascending: false });

  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  q = q.range(offset, offset + limit - 1);

  if (options.status) q = q.eq("status", options.status);
  if (options.centreId) q = q.eq("centre_id", options.centreId);

  const { data, error, count } = await q;
  if (error) throw new Error(`Failed to list subscriptions: ${error.message}`);
  return { data: (data ?? []) as SubscriptionRecord[], count: count ?? 0 };
}

export async function listSubscriptionHistory(
  admin: AdminClient,
  subscriptionId: string,
  opts: { centreId?: string } = {},
): Promise<SubscriptionHistoryEntry[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = admin
    .from("subscription_history")
    .select("*")
    .eq("subscription_id", subscriptionId)
    .order("changed_at", { ascending: false });
  if (opts.centreId) q = q.eq("centre_id", opts.centreId);

  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as SubscriptionHistoryEntry[];
}

async function recordHistory(
  admin: AdminClient,
  subscriptionId: string,
  entry: {
    centreId: string;
    action: string;
    planId: string | null;
    previousStatus?: SubscriptionStatus | null;
    newStatus?: SubscriptionStatus | null;
    actorUserId?: string | null;
    reason?: string | null;
  },
): Promise<void> {
  const { error } = await admin.from("subscription_history").insert({
    subscription_id: subscriptionId,
    centre_id: entry.centreId,
    action: entry.action,
    plan_id: entry.planId,
    previous_status: entry.previousStatus ?? null,
    new_status: entry.newStatus ?? null,
    changed_by: entry.actorUserId ?? null,
    reason: entry.reason ?? null,
  });
  if (error) {
    // History must never break the main operation.
    console.error("[SUBSCRIPTION] Failed to record history:", error.message);
  }
}

/**
 * Evaluate a centre's subscription access (CENTRE-level service access).
 * This is the pure decision function used by the access gate.
 */
export function evaluateSubscriptionAccess(
  subscription: SubscriptionWithPlan | null,
  today: Date = new Date(),
): SubscriptionAccess {
  if (!subscription) {
    return {
      subscription: null,
      status: "none",
      valid: false,
      validOnDate: false,
      reason: "Your centre does not have an active subscription. Please contact the platform administrator.",
      enabledFeatures: new Set<PlanFeatureKey>(),
    };
  }

  const activeStatus = isSubscriptionActiveStatus(subscription.status);
  const todayIso = today.toISOString().slice(0, 10);

  const endDate = subscription.end_date;
  const trialEnd = subscription.trial_ends_at;
  const effectiveEnd = subscription.status === "trial" && trialEnd ? trialEnd : endDate;

  const dateValid = !effectiveEnd || effectiveEnd >= todayIso;
  const valid = activeStatus;
  const validOnDate = activeStatus && dateValid;

  let reason: string;
  if (RESTRICTED_SUBSCRIPTION_STATUSES.includes(subscription.status)) {
    reason =
      subscription.status === "suspended"
        ? "Your centre's subscription has been suspended. Please contact the platform administrator."
        : "Your centre's subscription is currently inactive. Please contact the platform administrator.";
  } else if (!dateValid) {
    reason =
      subscription.status === "trial"
        ? "Your centre's trial period has ended. Please contact the platform administrator."
        : "Your centre's subscription has expired. Please contact the platform administrator.";
  } else {
    reason = "";
  }

  const enabledFeatures = new Set<PlanFeatureKey>();
  for (const f of subscription.plan.features ?? []) {
    if (f.enabled && isPlanFeatureKey(f.feature_key)) {
      enabledFeatures.add(f.feature_key as PlanFeatureKey);
    }
  }

  return {
    subscription,
    status: subscription.status,
    valid,
    validOnDate,
    reason,
    enabledFeatures,
  };
}

/**
 * Return whether a plan (by features) allows access to a given plan feature.
 */
export function planAllowsFeature(
  features: PlanFeature[],
  featureKey: PlanFeatureKey,
): boolean {
  const f = features.find((x) => x.feature_key === featureKey);
  return !!f?.enabled;
}

export { SubscriptionStatusError, AccessError };
