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

    // Build role_id -> is_system map
    const roleIds = [...new Set((activeRoles ?? []).map((r) => r.role_id).filter(Boolean))] as string[];
    const roleIsSystem = new Map<string, boolean>();
    if (roleIds.length > 0) {
      const { data: rolesData } = await admin.from("roles").select("id, is_system").in("id", roleIds);
      for (const r of (rolesData ?? []) as { id: string; is_system: boolean }[]) {
        roleIsSystem.set(r.id, Boolean(r.is_system));
      }
    }

    // Separate centre roles to revoke (non-system) and users to potentially deactivate
    const toRevoke = (activeRoles ?? []).filter((r) => !roleIsSystem.get(r.role_id)).map((r) => r.id);
    const candidates = (activeRoles ?? []).filter((r) => !roleIsSystem.get(r.role_id)).map((r) => r.user_id);

    // Revoke the centre's non-system roles
    if (toRevoke.length > 0) {
      const { error } = await admin
        .from("user_roles")
        .update({ status: "revoked" })
        .in("id", toRevoke);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // A user is only deactivated if they hold no active system/platform role anywhere.
    if (candidates.length > 0) {
      const uniqueCandidates = [...new Set(candidates)];
      const { data: allActiveRoles } = await admin
        .from("user_roles")
        .select("user_id, role_id")
        .eq("status", "active");
      const remainingSystemUserIds = new Set<string>();
      for (const r of (allActiveRoles ?? []) as { user_id: string; role_id: string }[]) {
        if (roleIsSystem.get(r.role_id) === true) remainingSystemUserIds.add(r.user_id);
      }
      const deactivate = uniqueCandidates.filter((u) => !remainingSystemUserIds.has(u));
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
