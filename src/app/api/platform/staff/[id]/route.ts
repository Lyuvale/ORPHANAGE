import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName, requirePermission } from "@/lib/auth/authorization.service";

/**
 * PATCH /api/platform/staff/[id]
 * PLATFORM ADMIN (or CENTRE_MANAGER for own centre):
 * Deactivate/remove a staff member's role at a centre.
 *
 * Body: { centre_id, action: "deactivate" | "delete" }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });
    const actorRole = await getUserRoleName(supabase as unknown as SupabaseClient, ctx);

    const { id } = await params;
    const body = (await request.json()) as {
      centre_id?: string;
      action?: string;
    };

    if (!body.centre_id || !body.action) {
      return NextResponse.json({ error: "centre_id and action are required." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Find the user_role assignment (simple query — avoids flaky embedded joins)
    const { data: roleRowsRaw } = await admin
      .from("user_roles")
      .select("id, user_id, role_id, centre_id, status")
      .eq("user_id", id)
      .eq("centre_id", body.centre_id)
      .limit(50);

    const rows = (roleRowsRaw ?? []) as {
      id: string;
      role_id: string;
      status: string;
    }[];

    if (rows.length === 0) {
      return NextResponse.json({ error: "Staff member not assigned to this centre." }, { status: 404 });
    }

    // Load role details for these assignments
    const assignedRoleIds = [...new Set(rows.map((r) => r.role_id).filter(Boolean))];
    const rolesMap = new Map<string, { name: string }>();
    if (assignedRoleIds.length > 0) {
      const { data: rolesData } = await admin
        .from("roles")
        .select("id, name")
        .in("id", assignedRoleIds);
      for (const r of (rolesData ?? []) as { id: string; name: string }[]) {
        rolesMap.set(r.id, { name: r.name });
      }
    }

    const isManagerRole = rows.some((r) => rolesMap.get(r.role_id)?.name === "CENTRE_MANAGER");

    // Authorisation:
    //  - PLATFORM_ADMIN can manage any centre staff
    //  - CENTRE_MANAGER can only manage staff in their own centre (and never remove a manager)
    const isAdmin = actorRole === "PLATFORM_ADMINISTRATOR";
    const isManager = actorRole === "CENTRE_MANAGER";

    if (!isAdmin && !isManager) {
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });
    }

    if (isAdmin) {
      await requirePermission(supabase as unknown as SupabaseClient, ctx, "platform.centres");
    }

    if (isManager) {
      if (ctx.centre.id !== body.centre_id) {
        return NextResponse.json({ error: "You can only manage staff in your own centre." }, { status: 403 });
      }
      // A manager cannot remove another manager
      if (isManagerRole) {
        return NextResponse.json({ error: "Managers cannot remove other managers." }, { status: 403 });
      }
    }

    // Perform the removal
    if (body.action === "delete") {
      const { error } = await admin.from("user_roles").delete().eq("user_id", id).eq("centre_id", body.centre_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, action: "deleted" });
    }

    // default: deactivate
    const { error } = await admin
      .from("user_roles")
      .update({ status: "revoked" })
      .eq("user_id", id)
      .eq("centre_id", body.centre_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: "deactivated" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
