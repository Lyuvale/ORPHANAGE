import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { assignRole, requirePermission } from "@/lib/auth/authorization.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as never);
    await requirePermission(supabase as never, ctx, "centres.manage");

    const body = (await request.json()) as { userProfileId?: string };
    const userProfileId = body.userProfileId;

    if (!userProfileId) {
      return NextResponse.json({ error: "userProfileId is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: centre } = await admin
      .from("centres")
      .select("id")
      .eq("id", id)
      .single();

    if (!centre) {
      return NextResponse.json({ error: "Centre not found" }, { status: 404 });
    }

    const { data: userProfile } = await admin
      .from("user_profiles")
      .select("id, centre_id")
      .eq("id", userProfileId)
      .single();

    if (!userProfile || userProfile.centre_id !== id) {
      return NextResponse.json(
        { error: "The selected user must belong to this centre before they can be assigned as manager." },
        { status: 400 },
      );
    }

    const { data: managerRole } = await admin
      .from("roles")
      .select("id")
      .eq("name", "CENTRE_MANAGER")
      .single();

    if (!managerRole) {
      return NextResponse.json({ error: "CENTRE_MANAGER role was not found." }, { status: 500 });
    }

    await admin
      .from("user_roles")
      .update({ status: "revoked" })
      .eq("centre_id", id)
      .eq("role_id", managerRole.id)
      .eq("status", "active");

    const roleAssignment = await assignRole(admin as never, {
      userProfileId,
      roleName: "CENTRE_MANAGER",
      centreId: id,
      assignedByAuthUserId: ctx.authUserId,
      reason: "Assigned by platform administrator",
    });

    return NextResponse.json({ success: true, data: roleAssignment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to assign centre manager";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
