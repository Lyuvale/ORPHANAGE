import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { can } from "@/lib/auth/authorization.service";

function statusFromError(message: string): number {
  if (message.includes("NOT_AUTHENTICATED")) return 401;
  if (message.includes("PERMISSION_DENIED")) return 403;
  return 500;
}

// ─── GET /api/caregivers/available ───────────────────────────
// Active user accounts holding the CAREGIVER role in the caller's own
// centre — the only valid assignees for child→caregiver assignment.
// Gated by staff.assignments.manage (manager + social worker). The assign
// endpoints enforce the same rule again.
export async function GET() {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);

    const allowed = await can(
      supabase as unknown as SupabaseClient,
      ctx,
      "staff.assignments.manage",
    );
    if (!allowed) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data: roleRow } = await admin
      .from("roles")
      .select("id")
      .eq("name", "CAREGIVER")
      .maybeSingle();
    if (!roleRow) return NextResponse.json({ data: [] });

    const { data: assignments } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role_id", (roleRow as { id: string }).id)
      .eq("centre_id", ctx.centre.id)
      .eq("status", "active");

    const userIds = [...new Set(((assignments ?? []) as { user_id: string }[]).map((r) => r.user_id))];
    if (userIds.length === 0) return NextResponse.json({ data: [] });

    const { data: profiles, error } = await admin
      .from("user_profiles")
      .select("id, first_name, last_name, email")
      .in("id", userIds)
      .eq("centre_id", ctx.centre.id)
      .eq("status", "active")
      .order("last_name", { ascending: true });
    if (error) {
      return NextResponse.json({ error: "Failed to load caregivers." }, { status: 500 });
    }

    return NextResponse.json({ data: profiles ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
