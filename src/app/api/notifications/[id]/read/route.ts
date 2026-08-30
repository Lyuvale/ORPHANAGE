import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { markNotificationRead } from "@/lib/notifications/notifications.service";
import { statusFromError } from "@/lib/resources/route-helpers";

// ─── PATCH /api/notifications/[id]/read ──────────────────────
// Mark the CURRENT user's own notification as read.

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "notifications.view");

    const adminSupabase = createAdminClient();
    const updated = await markNotificationRead(adminSupabase, id, ctx.profile.id, ctx.centre.id);

    if (!updated) {
      return NextResponse.json(
        { error: "Notification not found or not yours to read." },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
