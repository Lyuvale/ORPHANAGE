import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission, getUserRoleName } from "@/lib/auth/authorization.service";
import { listNotifications } from "@/lib/notifications/notifications.service";
import { NOTIFICATION_TYPES, type NotificationType, type NotificationFilters } from "@/types/notifications";

// ─── GET /api/notifications ──────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    const role = await getUserRoleName(supabase as unknown as SupabaseClient, ctx);
    const isAdmin = role === "PLATFORM_ADMINISTRATOR";

    if (isAdmin) {
      await requirePermission(supabase as unknown as SupabaseClient, ctx, "audit.view");
    } else {
      await requirePermission(supabase as unknown as SupabaseClient, ctx, "notifications.view");
    }

    const sp = request.nextUrl.searchParams;
    const filters: NotificationFilters = {};
    if (sp.get("unread") === "true") filters.unread = true;
    const limitRaw = Number(sp.get("limit") ?? 0);
    if (limitRaw > 0) filters.limit = limitRaw;
    const type = sp.get("type");
    if (type && (NOTIFICATION_TYPES as readonly string[]).includes(type)) {
      filters.type = type as NotificationType;
    }

    const adminSupabase = createAdminClient();

    if (isAdmin) {
      let q = adminSupabase
        .from("notifications")
        .select("*")
        .eq("recipient_user_id", ctx.profile.id)
        .order("created_at", { ascending: false });
      if (filters.unread === true) q = q.eq("is_read", false);
      if (filters.type) q = q.eq("type", filters.type);
      if (filters.limit && filters.limit > 0) q = q.limit(filters.limit);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return NextResponse.json({ data: data ?? [] });
    }

    const data = await listNotifications(adminSupabase, ctx.profile.id, ctx.centre.id, filters);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("NOT_AUTHENTICATED") ? 401
      : message.includes("PERMISSION_DENIED") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
