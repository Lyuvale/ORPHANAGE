import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission, getUserRoleName } from "@/lib/auth/authorization.service";

// ─── GET /api/notifications/unread-count ─────────────────────

export async function GET() {
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

    const adminSupabase = createAdminClient();

    if (isAdmin) {
      const { count, error } = await adminSupabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_user_id", ctx.profile.id)
        .eq("is_read", false);
      return NextResponse.json({ count: count ?? 0 });
    }

    const { count, error } = await adminSupabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_user_id", ctx.profile.id)
      .eq("centre_id", ctx.centre.id)
      .eq("is_read", false);
    return NextResponse.json({ count: count ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("NOT_AUTHENTICATED") ? 401
      : message.includes("PERMISSION_DENIED") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
