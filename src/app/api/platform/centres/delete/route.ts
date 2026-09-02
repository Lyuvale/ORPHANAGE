import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/platform/centres/delete
 * PLATFORM ADMIN: soft-delete (deactivate) a centre.
 * Blocks if the centre has active children (they must be transferred first).
 * Associated centre staff (non-system roles) are deactivated and their roles
 * revoked, and active subscriptions for the centre are cancelled as part of
 * deactivation, so a centre with staff/subscriptions can still be deactivated.
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

    // Gather active centre roles (staff/manager, not platform admin)
    const { data: activeRoles } = await admin
      .from("user_roles")
      .select("id, user_id, role_id")
      .eq("centre_id", body.centre_id)
      .eq("status", "active");

    // Build role_id -> role name map (use NAME, not is_system — all roles are is_system=true)
    const roleIds = [...new Set((activeRoles ?? []).map((r) => r.role_id).filter(Boolean))] as string[];
    const roleNameById = new Map<string, string>();
    if (roleIds.length > 0) {
      const { data: rolesData } = await admin.from("roles").select("id, name").in("id", roleIds);
      for (const r of (rolesData ?? []) as { id: string; name: string }[]) {
        roleNameById.set(r.id, r.name);
      }
    }

    // Revoke all roles in this centre EXCEPT the PLATFORM_ADMINISTRATOR (system admin)
    const toRevoke = (activeRoles ?? []).filter((r) => roleNameById.get(r.role_id) !== "PLATFORM_ADMINISTRATOR").map((r) => r.id);
    const candidates = (activeRoles ?? []).filter((r) => roleNameById.get(r.role_id) !== "PLATFORM_ADMINISTRATOR").map((r) => r.user_id);

    // Revoke the centre's staff/manager roles
    if (toRevoke.length > 0) {
      const { error } = await admin
        .from("user_roles")
        .update({ status: "revoked" })
        .in("id", toRevoke);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // A user is only deactivated if they hold no active PLATFORM_ADMINISTRATOR role anywhere.
    if (candidates.length > 0) {
      const uniqueCandidates = [...new Set(candidates)];
      const { data: allActiveRoles } = await admin
        .from("user_roles")
        .select("user_id, role_id")
        .eq("status", "active");
      const platformAdminRoleIds = new Set<string>();
      if (roleIds.length > 0) {
        const { data: platformRoles } = await admin
          .from("roles")
          .select("id")
          .eq("name", "PLATFORM_ADMINISTRATOR");
        for (const r of (platformRoles ?? []) as { id: string }[]) platformAdminRoleIds.add(r.id);
      }
      const isPlatformAdmin = new Set<string>();
      for (const r of (allActiveRoles ?? []) as { user_id: string; role_id: string }[]) {
        if (platformAdminRoleIds.has(r.role_id)) isPlatformAdmin.add(r.user_id);
      }
      const deactivate = uniqueCandidates.filter((u) => !isPlatformAdmin.has(u));
      if (deactivate.length > 0) {
        const { error } = await admin
          .from("user_profiles")
          .update({ status: "deactivated", updated_at: new Date().toISOString() })
          .in("id", deactivate);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // Cancel active subscriptions for the centre
    const { error: subError } = await admin
      .from("subscriptions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("centre_id", body.centre_id)
      .in("status", ["trial", "active", "suspended"]);
    if (subError) return NextResponse.json({ error: subError.message }, { status: 500 });

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
