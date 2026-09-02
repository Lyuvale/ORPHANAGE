import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Temporary debug endpoint: assigns PLATFORM_ADMINISTRATOR role to the
 * currently logged-in user if they don't already have it.
 *
 * DELETE this file once admin setup is confirmed working.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get profile
    const { data: profile } = await admin
      .from("user_profiles")
      .select("id, centre_id")
      .eq("auth_user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "No profile found" }, { status: 404 });
    }

    // Get PLATFORM_ADMINISTRATOR role
    const { data: role } = await admin
      .from("roles")
      .select("id")
      .eq("name", "PLATFORM_ADMINISTRATOR")
      .single();

    if (!role) {
      return NextResponse.json({ error: "PLATFORM_ADMINISTRATOR role not found" }, { status: 500 });
    }

    // Check if already has this role
    const { data: existing } = await admin
      .from("user_roles")
      .select("id, status")
      .eq("user_id", profile.id)
      .eq("role_id", role.id)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        message: "Already has PLATFORM_ADMINISTRATOR role",
        userRoleId: existing.id,
      });
    }

    // Deactivate any existing roles for this user
    await admin
      .from("user_roles")
      .update({ status: "revoked" })
      .eq("user_id", profile.id)
      .eq("status", "active");

    // Assign PLATFORM_ADMINISTRATOR role (centre_id can be anything for platform admin)
    const { data: newRole, error: insertError } = await admin
      .from("user_roles")
      .insert({
        user_id: profile.id,
        role_id: role.id,
        centre_id: profile.centre_id || "00000000-0000-0000-0000-000000000000",
        status: "active",
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "PLATFORM_ADMINISTRATOR role assigned successfully",
      userRoleId: newRole.id,
      email: user.email,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
