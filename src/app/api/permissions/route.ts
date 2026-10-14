import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName, can } from "@/lib/auth/authorization.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/permissions — list all permissions for the role builder.
 * PLATFORM_ADMINISTRATOR sees everything including platform.*.
 * CENTRE_MANAGER sees everything EXCEPT platform.* (cannot grant those).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    const roleName = await getUserRoleName(
      supabase as unknown as SupabaseClient,
      ctx,
    );

    const hasAccess =
      roleName === "PLATFORM_ADMINISTRATOR" ||
      (await can(supabase as unknown as SupabaseClient, ctx, "roles.view")) ||
      (await can(supabase as unknown as SupabaseClient, ctx, "roles.create"));
    if (!hasAccess) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    let query = supabase
      .from("permissions")
      .select("id, module, action, description")
      .order("module", { ascending: true })
      .order("action", { ascending: true });

    // CENTRE_MANAGER: strip platform.* — they can never grant those
    if (roleName !== "PLATFORM_ADMINISTRATOR") {
      query = query.neq("module", "platform");
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load permissions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
