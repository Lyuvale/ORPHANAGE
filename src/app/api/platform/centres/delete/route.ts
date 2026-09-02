import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/platform/centres/delete
 * PLATFORM ADMIN: soft-delete a centre (deactivate).
 * Prevents deletion if centre has active children or staff.
 */
export async function POST(request: NextRequest) {
  try {
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

    return NextResponse.json({ data: { success: true, message: "Centre deactivated." } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
