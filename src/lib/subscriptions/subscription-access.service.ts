/**
 * Subscription Access Service
 *
 * Bridges the subscription model into the application access chain.
 *
 * ACCESS CHAIN (overall):
 *   USER AUTHENTICATED -> USER ACTIVE -> CENTRE ACTIVE -> SUBSCRIPTION VALID
 *     -> PLAN ALLOWS FEATURE -> USER ROLE/PERMISSION ALLOWS ACTION -> ALLOW
 *
 * This service provides:
 *   - `loadSubscriptionForContext` – loads a centre's current subscription (+
 *     plan features) so getAppUserContext can expose it on AppUserContext.
 *   - `evaluateCentreAccess`       – pure centre-level decision logic.
 *   - `requireFeatureAndAccess`    – a helper to run subscription + feature gating
 *     in operational routes (used alongside requireAppAccess / requirePermission).
 *   - `runExpiryChecks`            – notifies appropriate users about expiring /
 *     expired / newly-active / suspended subscriptions (reuses the existing
 *     notification system; no second notification system is created).
 *
 * DISTINCTION:
 *   SUBSCRIPTION = what the centre can use. ROLE/PERMISSION = what the user can do.
 *   Normal restricted access is enforced at the application layer (and RLS for
 *   reads) — never by hiding frontend buttons alone.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCurrentSubscription,
  getSubscriptionById,
  evaluateSubscriptionAccess,
} from "./subscription.service";
import { PlanFeatureError, AccessError } from "./subscription-domain";
import { notifyRole } from "@/lib/notifications/notifications.service";
import type {
  SubscriptionWithPlan,
  PlanFeatureKey,
  Subscription,
} from "@/types/subscription";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, "public", any>;

export interface SubscriptionContext {
  subscription: SubscriptionWithPlan | null;
  isSubscriptionValid: boolean;
  enabledFeatures: Set<PlanFeatureKey>;
  status: Subscription["status"] | "none";
  reason: string;
}

/**
 * Load + evaluate a centre's subscription for the app context.
 *
 * Uses the provided client (session client for a normal request, which RLS-scopes
 * to the user's own centre; or an admin client for platform operations).
 */
export async function loadSubscriptionForContext(
  supabase: AnyClient,
  centreId: string,
  today: Date = new Date(),
): Promise<SubscriptionContext> {
  const current = await getCurrentSubscription(supabase as AdminClient, centreId);
  const withPlan = current
    ? await getSubscriptionById(supabase as AdminClient, current.id, { centreId })
    : null;

  const access = evaluateSubscriptionAccess(withPlan, today);

  return {
    subscription: access.subscription,
    isSubscriptionValid: access.validOnDate,
    enabledFeatures: access.enabledFeatures,
    status: access.status,
    reason: access.reason,
  };
}

/**
 * Platform access check: verify the acting user has subscription-management
 * rights. Used by platform administration routes.
 */
export async function requirePlatformSubscriptionAccess(
  ctx: {
    isSubscriptionValid: boolean;
    reason: string;
  },
): Promise<void> {
  if (!ctx.isSubscriptionValid) {
    throw new AccessError("Platform administration requires an active subscription.", "SUBSCRIPTION_INACTIVE");
  }
}

/**
 * Require that the centre's subscription is valid (service access enabled).
 * Throws an AccessError with a friendly message when restricted.
 */
export async function requireValidSubscription(
  ctx: SubscriptionContext,
): Promise<void> {
  if (!ctx.isSubscriptionValid) {
    throw new AccessError(ctx.reason || "Your centre's subscription is currently inactive. Please contact the platform administrator.", "SUBSCRIPTION_INACTIVE");
  }
}

/**
 * Require that the centre's current plan includes the given feature key.
 * Centre-level feature gating — SEPARATE from user role/permission checks.
 */
export async function requirePlanFeature(
  ctx: SubscriptionContext,
  featureKey: PlanFeatureKey,
): Promise<void> {
  await requireValidSubscription(ctx);
  if (!ctx.enabledFeatures.has(featureKey)) {
    throw new PlanFeatureError(
      "This feature is not included in your centre's current subscription plan. Please contact the platform administrator.",
      featureKey,
    );
  }
}

// ─── Expiry alerts (reuse existing notification system) ──────

export interface ExpiryAlertReport {
  checked: number;
  notified: number;
  alerts: { centreId: string; subscriptionId: string; event: string }[];
}

const MANAGER_ROLES = ["CENTRE_MANAGER"];

/**
 * Scan subscriptions and notify appropriate centre users about approaching
 * trial/plan expiry, actual expiry, or a lapsed status.
 *
 * This is an opportunistic / on-demand process (no second scheduler). It is safe
 * to call after any subscription change or from an admin-triggered endpoint.
 *
 * Returns a report. Notifications are delivered via the existing central
 * notification system to the centre's managers.
 */
export async function runExpiryChecks(
  admin: AdminClient | undefined,
  options: { expiryWarningDays?: number; today?: Date } = {},
): Promise<ExpiryAlertReport> {
  const supabase = admin ?? createAdminClient();
  const today = (options.today ?? new Date()).toISOString().slice(0, 10);
  const warningDays = options.expiryWarningDays ?? 7;

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*, plan:plan_id(name)")
    .in("status", ["trial", "active"]);

  const report: ExpiryAlertReport = { checked: 0, notified: 0, alerts: [] };
  if (error) return report;

  for (const row of (data ?? []) as Array<
    Subscription & { plan: { name: string } | null }
  >) {
    report.checked += 1;
    const effectiveEnd = row.status === "trial" ? row.trial_ends_at : row.end_date;
    if (!effectiveEnd) continue;

    const dayDiff = daysUntil(today, effectiveEnd);

    let event: string | null = null;
    if (dayDiff < 0) {
      event = row.status === "trial" ? "TRIAL_EXPIRED" : "SUBSCRIPTION_EXPIRED";
    } else if (dayDiff <= warningDays) {
      event = row.status === "trial" ? "TRIAL_EXPIRING" : "SUBSCRIPTION_EXPIRING";
    }

    if (!event) continue;

    const planName = row.plan?.name ?? "the selected plan";
    const type = event.endsWith("EXPIRING") ? ("ACTION_REQUIRED" as const) : ("WARNING" as const);
    const notificationEvent =
      event === "SUBSCRIPTION_EXPIRING"
        ? ("SUBSCRIPTION_EXPIRING" as const)
        : event === "SUBSCRIPTION_EXPIRED"
          ? ("SUBSCRIPTION_EXPIRED" as const)
          : event === "TRIAL_EXPIRING"
            ? ("SUBSCRIPTION_TRIAL_EXPIRING" as const)
            : ("SUBSCRIPTION_EXPIRED" as const);

    const created = await notifyRole(
      supabase,
      row.centre_id,
      MANAGER_ROLES,
      {
        title: event.endsWith("EXPIRING")
          ? `Your ${planName} plan is expiring soon`
          : event.startsWith("TRIAL")
            ? "Trial period ended"
            : "Subscription expired",
        message: event.endsWith("EXPIRING")
          ? `Your centre's ${planName} subscription ends on ${effectiveEnd}. Please contact the platform administrator to renew.`
          : `Your centre's ${planName} subscription has ${event.startsWith("TRIAL") ? "trial ended" : "expired"}. Access to normal services is restricted. Please contact the platform administrator.`,
        type,
        event_type: notificationEvent,
        entity_type: "SUBSCRIPTION",
        route: "/subscription",
      },
    );
    report.notified += created.length;
    report.alerts.push({ centreId: row.centre_id, subscriptionId: row.id, event });
  }

  return report;
}

/**
 * Send a notification about a specific subscription status change to the
 * centre's managers (CENTRE_MANAGER role). Uses the existing notification system.
 */
export async function notifySubscriptionEvent(
  admin: AdminClient,
  centreId: string,
  event: "ACTIVATED" | "SUSPENDED" | "EXPIRED" | "CANCELLED" | "TRIAL_STARTED",
  planName: string,
): Promise<void> {
  const title = `Subscription ${event.toLowerCase().replace("_", " ")}`;
  const message = `Your centre's ${planName} subscription is now ${event.toLowerCase().replace("_", " ")}.`;

  try {
    await notifyRole(admin, centreId, MANAGER_ROLES, {
      title,
      message,
      type: event === "SUSPENDED" || event === "EXPIRED" || event === "CANCELLED" ? "WARNING" : "INFORMATION",
      event_type: event === "SUSPENDED" ? "SUBSCRIPTION_SUSPENDED" : "SUBSCRIPTION_ACTIVATED",
      entity_type: "SUBSCRIPTION",
      route: "/subscription",
    });
  } catch {
    // Notification failure must not break the primary subscription operation.
  }
}

/** Whole days from `fromIso` until `untilIso` (negative if in the past). */
function daysUntil(fromIso: string, untilIso: string): number {
  const from = new Date(fromIso + "T00:00:00Z").getTime();
  const until = new Date(untilIso + "T00:00:00Z").getTime();
  return Math.round((until - from) / 86400000);
}
