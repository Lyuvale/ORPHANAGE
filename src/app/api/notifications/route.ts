import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { listNotifications } from "@/lib/notifications/notifications.service";
import { NOTIFICATION_TYPES, type NotificationType } from "@/types/notifications";
import { statusFromError } from "@/lib/resources/route-helpers";
import type { NotificationFilters } from "@/types/notifications";

// ─── GET /api/notifications ──────────────────────────────────
// Returns the CURRENT user's own notifications (their centre, their inbox).
// Query: ?unread=true&limit=10&type=WARNING

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "notifications.view");

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
    const data = await listNotifications(adminSupabase, ctx.profile.id, ctx.centre.id, filters);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
