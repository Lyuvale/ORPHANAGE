import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission, getUserRoleName } from "@/lib/auth/authorization.service";

// ─── PATCH /api/notifications/[id]/read ──────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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

    let query = adminSupabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("recipient_user_id", ctx.profile.id);

    if (!isAdmin) {
      query = query.eq("centre_id", ctx.centre.id);
    }

    const { data, error } = await query.select().single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Notification not found or not yours to read." },
        { status: 404 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("NOT_AUTHENTICATED") ? 401
      : message.includes("PERMISSION_DENIED") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
