import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { recordAuditEvent } from "@/lib/audit/audit.service";

/**
 * POST /api/platform/centres/delete
 * PLATFORM ADMIN: delete a centre (soft-deactivate, prevent if has active data).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "platform.centres");

    const body = (await request.json()) as { centre_id?: string };
    if (!body.centre_id) {
      return NextResponse.json({ error: "centre_id is required." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Check centre exists
    const { data: centre } = await admin
      .from("centres")
      .select("id, name, status")
      .eq("id", body.centre_id)
      .maybeSingle();

    if (!centre) {
      return NextResponse.json({ error: "Centre not found." }, { status: 404 });
    }

    // Check for active children
    const { count: childCount } = await admin
      .from("children")
      .select("id", { count: "exact", head: true })
      .eq("centre_id", body.centre_id)
      .eq("status", "active");

    if (childCount && childCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: centre has ${childCount} active children. Transfer them first.` },
        { status: 409 },
      );
    }

    // Check for active staff
    const { count: staffCount } = await admin
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .eq("centre_id", body.centre_id)
      .eq("status", "active");

    if (staffCount && staffCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: centre has ${staffCount} active staff. Deactivate them first.` },
        { status: 409 },
      );
    }

    // Deactivate centre (soft delete)
    const { error } = await admin
      .from("centres")
      .update({ status: "deactivated", updated_at: new Date().toISOString() })
      .eq("id", body.centre_id);

    if (error) {
      return NextResponse.json({ error: "Failed to delete centre." }, { status: 500 });
    }

    await recordAuditEvent(admin, ctx, {
      action: "CENTRE_STATUS_CHANGED",
      entity_type: "centre",
      entity_id: body.centre_id,
      previous_values: { status: centre.status },
      new_values: { status: "deactivated", reason: "Deleted by platform administrator" },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
