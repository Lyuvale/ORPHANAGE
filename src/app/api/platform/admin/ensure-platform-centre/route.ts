import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName, requirePermission } from "@/lib/auth/authorization.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/platform/admin/ensure-platform-centre
 * PLATFORM ADMIN ONLY.
 *
 * Creates a dedicated "Platform Administration" head-office centre (code PLT-SYS,
 * idempotent) and moves the platform administrator's profile + role assignment
 * there, so the platform admin is no longer attached to any real child centre.
 */
const PLATFORM_CENTRE_CODE = "PLT-SYS";
const PLATFORM_CENTRE_NAME = "Platform Administration";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });
    const roleName = await getUserRoleName(supabase as unknown as SupabaseClient, ctx);

    if (roleName !== "PLATFORM_ADMINISTRATOR") {
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });
    }
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "platform.centres");

    const admin = createAdminClient();

    // Find the user who holds the PLATFORM_ADMINISTRATOR role
    const { data: platformRoles } = await admin
      .from("roles")
      .select("id")
      .eq("name", "PLATFORM_ADMINISTRATOR");
    const platformRoleId = (platformRoles ?? [])[0]?.id;

    const { data: platformAssignments } = await admin
      .from("user_roles")
      .select("user_id, centre_id")
      .eq("role_id", platformRoleId)
      .eq("status", "active");

    if (!platformAssignments || platformAssignments.length === 0) {
      return NextResponse.json(
        { error: "No active PLATFORM_ADMINISTRATOR assignment found." },
        { status: 400 },
      );
    }

    // 2. Create the Platform Administration centre if it doesn't exist
    let { data: platformCentre } = await admin
      .from("centres")
      .select("id")
      .eq("code", PLATFORM_CENTRE_CODE)
      .maybeSingle();

    if (!platformCentre) {
      const { data: created, error: createError } = await admin
        .from("centres")
        .insert({ name: PLATFORM_CENTRE_NAME, code: PLATFORM_CENTRE_CODE, country: "Nigeria" })
        .select("id")
        .single();
      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }
      platformCentre = created;
    }

    const targetCentreId = platformCentre.id as string;

    // 3. Move the platform admin's profile to the Platform centre
    const adminUserIds = [...new Set(platformAssignments.map((a) => a.user_id))];
    const { error: profileError } = await admin
      .from("user_profiles")
      .update({ centre_id: targetCentreId, updated_at: new Date().toISOString() })
      .in("id", adminUserIds);
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // 4. Move the platform admin's role assignment to the Platform centre
    const { error: roleError } = await admin
      .from("user_roles")
      .update({ centre_id: targetCentreId })
      .eq("role_id", platformRoleId)
      .eq("status", "active");
    if (roleError) {
      return NextResponse.json({ error: roleError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        success: true,
        platformCentreId: targetCentreId,
        movedUserIds: adminUserIds,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
