import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName, can } from "@/lib/auth/authorization.service";

export const dynamic = "force-dynamic";

/** GET /api/roles — list system roles + centre's custom roles */
export async function GET() {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    const roleName = await getUserRoleName(
      supabase as unknown as SupabaseClient,
      ctx,
    );

    const hasView =
      roleName === "PLATFORM_ADMINISTRATOR" ||
      (await can(supabase as unknown as SupabaseClient, ctx, "roles.view"));
    if (!hasView) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const admin = createAdminClient();
    const centreId = ctx.centre.id;

    let query = admin
      .from("roles")
      .select("*")
      .order("is_system", { ascending: false })
      .order("name", { ascending: true });

    if (roleName !== "PLATFORM_ADMINISTRATOR") {
      query = query.or(`is_system.eq.true,centre_id.eq.${centreId}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load roles";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST /api/roles — create a custom centre role */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    const roleName = await getUserRoleName(
      supabase as unknown as SupabaseClient,
      ctx,
    );

    const hasCreate =
      roleName === "PLATFORM_ADMINISTRATOR" ||
      (await can(supabase as unknown as SupabaseClient, ctx, "roles.create"));
    if (!hasCreate) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, permission_ids } = body as {
      name?: string;
      description?: string;
      permission_ids?: string[];
    };

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Role name must be at least 2 characters" },
        { status: 400 },
      );
    }

    const trimmed = name.trim().toUpperCase().replace(/\s+/g, "_");
    if (!/^[A-Z][A-Z0-9_]{1,49}$/.test(trimmed)) {
      return NextResponse.json(
        { error: "Role name must be letters, numbers, underscores (2–50 chars)" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const centreId = ctx.centre.id;

    // Check name uniqueness within centre
    const { data: existing } = await admin
      .from("roles")
      .select("id")
      .eq("name", trimmed)
      .eq("centre_id", centreId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: "A role with this name already exists in your centre" },
        { status: 409 },
      );
    }

    // Insert role
    const { data: role, error: roleErr } = await admin
      .from("roles")
      .insert({
        name: trimmed,
        description: description?.trim() || null,
        is_system: false,
        centre_id: centreId,
      })
      .select()
      .single();
    if (roleErr) throw roleErr;

    // Assign permissions — CENTRE_MANAGER cannot grant platform.* perms
    if (Array.isArray(permission_ids) && permission_ids.length > 0) {
      let validIds = permission_ids;

      if (roleName !== "PLATFORM_ADMINISTRATOR") {
        const { data: permRows } = await admin
          .from("permissions")
          .select("id, module")
          .in("id", permission_ids);
        const platformIds = new Set(
          (permRows ?? [])
            .filter((p: { id: string; module: string }) => p.module === "platform")
            .map((p: { id: string; module: string }) => p.id),
        );
        validIds = permission_ids.filter((pid: string) => !platformIds.has(pid));
      }

      if (validIds.length > 0) {
        const rows = validIds.map((pid: string) => ({
          role_id: role.id,
          permission_id: pid,
        }));
        const { error: permErr } = await admin
          .from("role_permissions")
          .insert(rows);
        if (permErr) throw permErr;
      }
    }

    return NextResponse.json({ data: role }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create role";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
