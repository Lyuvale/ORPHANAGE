import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { markAllNotificationsRead } from "@/lib/notifications/notifications.service";
import { statusFromError } from "@/lib/resources/route-helpers";

// ─── POST /api/notifications/read-all ────────────────────────
// Mark every notification in the CURRENT user's inbox as read.

export async function POST() {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "notifications.view");

    const adminSupabase = createAdminClient();
    const result = await markAllNotificationsRead(adminSupabase, ctx.profile.id, ctx.centre.id);
    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
