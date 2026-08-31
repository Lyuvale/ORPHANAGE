/**
 * Notifications Types
 *
 * ONE central notification system used by every module for IMPORTANT events.
 *
 * A notification:
 *  - Belongs to a Centre and a single recipient User (tenant + user isolation).
 *  - Contains a SAFE SUMMARY (never raw sensitive child/safeguarding detail).
 *  - References an EXISTING record via entity_type + entity_id and a client
 *    route so clicking opens the real protected record.
 *  - Has a simple type (Information / Action Required / Warning / Urgent).
 *  - Tracks read/unread status.
 *
 * SECURITY: notifications.* permissions are deny-by-default. Delivery is
 * centralised server-side via the service-role client. A user can only ever
 * see their own notifications within their centre (RLS enforced).
 */

// ─── Enumerations ────────────────────────────────────────────

export const NOTIFICATION_TYPES = [
  "INFORMATION",
  "ACTION_REQUIRED",
  "WARNING",
  "URGENT",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_EVENTS = [
  "CHILD_ADMITTED",
  "CHILD_STATUS_CHANGED",
  "HEALTH_FOLLOWUP",
  "EDUCATION_UPDATE",
  "SAFEGUARDING_CONCERN",
  "SAFEGUARDING_ACTION",
  "VISIT_SCHEDULED",
  "SOURCE_RECORDED",
  "FUND_APPROVED",
  "EXPENSE_AWAITING_APPROVAL",
  "EXPENSE_APPROVED",
  "EXPENSE_REJECTED",
  "FUND_BALANCE_ALERT",
  "ASSET_MAINTENANCE",
  "ASSET_DAMAGED",
  "ACCOUNT_ACTION",
  "CENTRE_STATUS_CHANGED",
  "SUBSCRIPTION_EXPIRING",
  "SUBSCRIPTION_EXPIRED",
  "SUBSCRIPTION_ACTIVATED",
  "SUBSCRIPTION_SUSPENDED",
  "SUBSCRIPTION_TRIAL_EXPIRING",
  "PAYMENT_RECEIVED",
  "CONTRIBUTION_RECEIVED",
  "PAYMENT_FAILED",
  "PLATFORM_ALERT",
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export const NOTIFICATION_ENTITIES = [
  "CHILD",
  "CASE",
  "HEALTH",
  "EDUCATION",
  "SAFEGUARDING",
  "VISIT",
  "SOURCE",
  "FUND",
  "EXPENSE",
  "ASSET",
  "ACCOUNT",
  "CENTRE",
  "SUBSCRIPTION",
  "PAYMENT",
  "CONTRIBUTION",
  "PLATFORM",
] as const;
export type NotificationEntity = (typeof NOTIFICATION_ENTITIES)[number];

/** Notification categories an authorised user may opt out of (optional events). */
export const OPTIONAL_NOTIFICATION_EVENTS: NotificationEvent[] = [
  "CHILD_ADMITTED",
  "CHILD_STATUS_CHANGED",
  "HEALTH_FOLLOWUP",
  "EDUCATION_UPDATE",
  "VISIT_SCHEDULED",
  "SOURCE_RECORDED",
  "FUND_APPROVED",
  "EXPENSE_APPROVED",
  "EXPENSE_REJECTED",
  "ASSET_MAINTENANCE",
  "ASSET_DAMAGED",
  "SUBSCRIPTION_EXPIRING",
  "SUBSCRIPTION_TRIAL_EXPIRING",
  "PAYMENT_RECEIVED",
  "CONTRIBUTION_RECEIVED",
];

/** CRITICAL events are ALWAYS delivered and cannot be disabled by preferences. */
export const CRITICAL_NOTIFICATION_EVENTS: NotificationEvent[] = [
  "SAFEGUARDING_CONCERN",
  "SAFEGUARDING_ACTION",
  "EXPENSE_AWAITING_APPROVAL",
  "FUND_BALANCE_ALERT",
  "ACCOUNT_ACTION",
  "CENTRE_STATUS_CHANGED",
  "SUBSCRIPTION_EXPIRED",
  "SUBSCRIPTION_ACTIVATED",
  "SUBSCRIPTION_SUSPENDED",
  "PAYMENT_FAILED",
  "PLATFORM_ALERT",
];

export function isCriticalEvent(event: NotificationEvent | null | undefined): boolean {
  if (!event) return false;
  return CRITICAL_NOTIFICATION_EVENTS.includes(event);
}

// ─── Entities ────────────────────────────────────────────────

export interface Notification {
  id: string;
  centre_id: string;
  recipient_user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  event_type: NotificationEvent | null;
  entity_type: NotificationEntity | null;
  entity_id: string | null;
  route: string | null;
  is_critical: boolean;
  is_read: boolean;
  read_at: string | null;
  created_by: string | null;
  created_at: string;
}

export type NotificationFilters = {
  unread?: boolean;
  limit?: number;
  type?: NotificationType;
};

export interface NotificationPreference {
  id: string;
  user_id: string;
  event_type: NotificationEvent;
  enabled: boolean;
  created_at: string;
}

// ─── Display helpers ─────────────────────────────────────────

export function getNotificationTypeDisplay(t: NotificationType): string {
  const map: Record<NotificationType, string> = {
    INFORMATION: "Information",
    ACTION_REQUIRED: "Action Required",
    WARNING: "Warning",
    URGENT: "Urgent",
  };
  return map[t];
}

export function getNotificationTypeBadge(t: NotificationType): string {
  const map: Record<NotificationType, string> = {
    INFORMATION: "bg-sky-100 text-sky-700",
    ACTION_REQUIRED: "bg-amber-100 text-amber-700",
    WARNING: "bg-orange-100 text-orange-700",
    URGENT: "bg-red-100 text-red-700",
  };
  return map[t];
}

export function getNotificationEntityDisplay(e: NotificationEntity | null | undefined): string {
  if (!e) return "System";
  const map: Record<NotificationEntity, string> = {
    CHILD: "Child",
    CASE: "Case",
    HEALTH: "Health",
    EDUCATION: "Education",
    SAFEGUARDING: "Safeguarding",
    VISIT: "Visit",
    SOURCE: "Source",
    FUND: "Fund",
    EXPENSE: "Expense",
    ASSET: "Asset",
    ACCOUNT: "Account",
    CENTRE: "Centre",
    SUBSCRIPTION: "Subscription",
    PAYMENT: "Payment",
    CONTRIBUTION: "Contribution",
    PLATFORM: "Platform",
  };
  return map[e];
}

/** ISO datetime -> short readable string, e.g. "Aug 30, 14:22". */
export function formatNotificationTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
