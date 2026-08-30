/**
 * Notifications Service
 *
 * ONE central notification system. Every module calls these helpers to
 * deliver an IMPORTANT event to the RIGHT users.
 *
 * SECURITY MODEL:
 *  - Delivery is always performed via the service-role client (bypasses RLS)
 *    and only after the calling route has enforced its own permission.
 *  - Notifications are created per-recipient, always scoped to a CENTRE
 *    (tenant isolation) and a single USER.
 *  - Only a SAFE SUMMARY is stored in the notification. Sensitive child /
 *    safeguarding detail is never placed in the message — the notification
 *    links to the protected record instead.
 *  - CRITICAL events (safeguarding / security / financial accountability)
 *    are ALWAYS delivered. Optional events respect the recipient's
 *    notification preferences.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Notification,
  NotificationPreference,
  NotificationFilters,
  NotificationType,
  NotificationEvent,
  NotificationEntity,
} from "@/types/notifications";
import { isCriticalEvent } from "@/types/notifications";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

export interface NotificationPayload {
  title: string;
  message: string;
  type?: NotificationType;
  event_type: NotificationEvent;
  entity_type?: NotificationEntity;
  entity_id?: string | null;
  route?: string | null;
}

// ─── Recipient resolution ────────────────────────────────────

/**
 * Resolve the user_profile ids of users who have an ACTIVE role named in
 * `roleNames` within the given centre. Used to target role-based delivery.
 */
export async function getCentreRecipientIds(
  admin: AdminClient,
  centreId: string,
  roleNames: string[],
): Promise<string[]> {
  const { data, error } = await admin
    .from("user_roles")
    .select("user_id, role:roles(name)")
    .eq("centre_id", centreId)
    .eq("status", "active");

  if (error) throw new Error(`Failed to resolve notification recipients: ${error.message}`);

  const ids = new Set<string>();
  for (const row of data ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const role = (row as any).role as { name?: string } | null;
    if (role?.name && roleNames.includes(role.name)) {
      ids.add(row.user_id);
    }
  }
  return Array.from(ids);
}

/**
 * Load the enabled-state of a given optional event for a set of users.
 * Returns a Set of user_ids that have DISABLED that event.
 */
async function getDisabledRecipients(
  admin: AdminClient,
  eventType: NotificationEvent,
  recipientIds: string[],
): Promise<Set<string>> {
  const disabled = new Set<string>();
  if (recipientIds.length === 0) return disabled;

  const { data, error } = await admin
    .from("notification_preferences")
    .select("user_id, enabled")
    .eq("event_type", eventType)
    .eq("enabled", false)
    .in("user_id", recipientIds);

  if (error) return disabled;
  for (const row of data ?? []) disabled.add(row.user_id);
  return disabled;
}

// ─── Core delivery ───────────────────────────────────────────

/**
 * Create one notification for a single recipient. If the event is optional
 * and the recipient has disabled it in preferences, the notification is
 * skipped (critical events always deliver).
 *
 * Returns null if the notification was suppressed by preferences.
 */
export async function createNotification(
  admin: AdminClient,
  centreId: string,
  recipientUserId: string,
  payload: NotificationPayload,
  actorUserId?: string | null,
): Promise<Notification | null> {
  const critical = isCriticalEvent(payload.event_type);

  if (!critical) {
    const disabled = await getDisabledRecipients(admin, payload.event_type, [recipientUserId]);
    if (disabled.has(recipientUserId)) return null;
  }

  const { data, error } = await admin
    .from("notifications")
    .insert({
      centre_id: centreId,
      recipient_user_id: recipientUserId,
      title: payload.title,
      message: payload.message,
      type: payload.type ?? "INFORMATION",
      event_type: payload.event_type,
      entity_type: payload.entity_type ?? null,
      entity_id: payload.entity_id ?? null,
      route: payload.route ?? null,
      is_critical: critical,
      created_by: actorUserId ?? null,
    })
    .select()
    .single();

  if (error) {
    // A failed notification must never break the primary operation.
    console.error("[NOTIFICATIONS] Failed to create notification:", error.message);
    return null;
  }
  return data as Notification;
}

/**
 * Deliver a notification to every user with one of the given role names in
 * the centre (respecting preferences; critical events always deliver).
 */
export async function notifyRole(
  admin: AdminClient,
  centreId: string,
  roleNames: string[],
  payload: NotificationPayload,
  actorUserId?: string | null,
): Promise<Notification[]> {
  const recipients = await getCentreRecipientIds(admin, centreId, roleNames);
  const created: Notification[] = [];

  for (const userId of recipients) {
    const n = await createNotification(admin, centreId, userId, payload, actorUserId);
    if (n) created.push(n);
  }
  return created;
}

/**
 * Deliver a notification to a set of explicit recipients (by user_profile id).
 * Useful when the correct recipient is already known (e.g. the submitter of
 * an expense that was just approved).
 */
export async function notifyUsers(
  admin: AdminClient,
  centreId: string,
  recipientUserIds: string[],
  payload: NotificationPayload,
  actorUserId?: string | null,
): Promise<Notification[]> {
  const created: Notification[] = [];
  for (const userId of Array.from(new Set(recipientUserIds))) {
    const n = await createNotification(admin, centreId, userId, payload, actorUserId);
    if (n) created.push(n);
  }
  return created;
}

// ─── Reading / updating (server-side, permission-gated) ──────

export async function listNotifications(
  admin: AdminClient,
  userId: string,
  centreId: string,
  filters: NotificationFilters = {},
): Promise<Notification[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = admin
    .from("notifications")
    .select("*")
    .eq("recipient_user_id", userId)
    .eq("centre_id", centreId)
    .order("created_at", { ascending: false });

  if (filters.unread === true) q = q.eq("is_read", false);
  if (filters.type) q = q.eq("type", filters.type);
  if (filters.limit && filters.limit > 0) q = q.limit(filters.limit);

  const { data, error } = await q;
  if (error) throw new Error(`Failed to list notifications: ${error.message}`);
  return (data ?? []) as Notification[];
}

export async function getUnreadCount(
  admin: AdminClient,
  userId: string,
  centreId: string,
): Promise<number> {
  const { count, error } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", userId)
    .eq("centre_id", centreId)
    .eq("is_read", false);

  if (error) throw new Error(`Failed to get unread count: ${error.message}`);
  return count ?? 0;
}

export async function markNotificationRead(
  admin: AdminClient,
  notificationId: string,
  userId: string,
  centreId: string,
): Promise<Notification | null> {
  const { data: existing } = await admin
    .from("notifications")
    .select("id")
    .eq("id", notificationId)
    .eq("recipient_user_id", userId)
    .eq("centre_id", centreId)
    .maybeSingle();

  if (!existing) return null;

  const { data, error } = await admin
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .select()
    .single();

  if (error) throw new Error(`Failed to mark notification read: ${error.message}`);
  return data as Notification;
}

export async function markAllNotificationsRead(
  admin: AdminClient,
  userId: string,
  centreId: string,
): Promise<number> {
  const { error, count } = await admin
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("recipient_user_id", userId)
    .eq("centre_id", centreId)
    .eq("is_read", false);

  if (error) throw new Error(`Failed to mark all read: ${error.message}`);
  return count ?? 0;
}

// ─── Preferences ─────────────────────────────────────────────

export async function listPreferences(
  admin: AdminClient,
  userId: string,
): Promise<NotificationPreference[]> {
  const { data, error } = await admin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId);
  if (error) return [];
  return (data ?? []) as NotificationPreference[];
}

export async function setPreference(
  admin: AdminClient,
  userId: string,
  eventType: NotificationEvent,
  enabled: boolean,
): Promise<NotificationPreference> {
  const { data, error } = await admin
    .from("notification_preferences")
    .upsert(
      { user_id: userId, event_type: eventType, enabled },
      { onConflict: "user_id,event_type" },
    )
    .select()
    .single();
  if (error) throw new Error(`Failed to update notification preference: ${error.message}`);
  return data as NotificationPreference;
}
