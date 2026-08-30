import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { getUnreadCount } from "@/lib/notifications/notifications.service";
import { statusFromError } from "@/lib/resources/route-helpers";

// ─── GET /api/notifications/unread-count ─────────────────────
// Number of unread notifications for the CURRENT user's inbox.

export async function GET() {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "notifications.view");

    const adminSupabase = createAdminClient();
    const count = await getUnreadCount(adminSupabase, ctx.profile.id, ctx.centre.id);
    return NextResponse.json({ count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
