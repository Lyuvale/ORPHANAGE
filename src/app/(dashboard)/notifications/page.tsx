import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission, getUserRoleName } from "@/lib/auth/authorization.service";
import { listNotifications } from "@/lib/notifications/notifications.service";
import {
  getNotificationTypeDisplay,
  getNotificationTypeBadge,
  getNotificationEntityDisplay,
  formatNotificationTime,
} from "@/types/notifications";
import NotificationsControls from "./_components/notifications-controls";
import NotificationPreferences from "./_components/notification-preferences";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
  const role = await getUserRoleName(supabase as unknown as SupabaseClient, ctx);
  const isAdmin = role === "PLATFORM_ADMINISTRATOR";

  if (isAdmin) {
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "audit.view");
  } else {
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "notifications.view");
  }

  const adminSupabase = createAdminClient();

  let notifications: Awaited<ReturnType<typeof listNotifications>> = [];
  if (isAdmin) {
    // Platform admin sees all notifications across all centres
    const { data, error } = await adminSupabase
      .from("notifications")
      .select("*")
      .eq("recipient_user_id", ctx.profile.id)
      .order("created_at", { ascending: false })
      .limit(100);
    notifications = (data ?? []) as Awaited<ReturnType<typeof listNotifications>>;
  } else {
    notifications = await listNotifications(
      adminSupabase,
      ctx.profile.id,
      ctx.centre.id,
      { limit: 100 },
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-1 text-sm text-gray-600">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "You're all caught up."}
          </p>
        </div>
        <NotificationsControls unreadCount={unreadCount} />
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {notifications.length === 0 && (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-gray-500">No notifications yet.</p>
            <p className="mt-1 text-xs text-gray-400">
              Important events across the platform will appear here.
            </p>
          </div>
        )}

        {notifications.length > 0 && (
          <ul className="divide-y divide-gray-200">
            {notifications.map((n) => (
              <li key={n.id} className="flex gap-4 px-6 py-4">
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                    n.is_read ? "bg-gray-300" : "bg-indigo-600"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getNotificationTypeBadge(n.type)}`}
                    >
                      {getNotificationTypeDisplay(n.type)}
                    </span>
                    <span className="text-xs text-gray-400">{getNotificationEntityDisplay(n.entity_type)}</span>
                    {n.is_critical && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                        Critical
                      </span>
                    )}
                  </div>
                  <p className={`mt-1 text-sm font-semibold text-gray-900 ${n.is_read ? "" : ""}`}>{n.title}</p>
                  <p className="mt-0.5 text-sm text-gray-600">{n.message}</p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="text-xs text-gray-400">{formatNotificationTime(n.created_at)}</span>
                    {n.route && (
                      <Link
                        href={n.route}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                      >
                        View related record →
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <NotificationPreferences />
    </div>
  );
}
