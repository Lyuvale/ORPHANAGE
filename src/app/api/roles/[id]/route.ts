import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName, can } from "@/lib/auth/authorization.service";

export const dynamic = "force-dynamic";

/** GET /api/roles/[id] — get role with its permission IDs */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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

    const { data: role, error } = await admin
      .from("roles")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Scope check: centre users can only see their own centre's roles
    if (
      roleName !== "PLATFORM_ADMINISTRATOR" &&
      role.centre_id !== ctx.centre.id
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: perms } = await admin
      .from("role_permissions")
      .select("permission_id")
      .eq("role_id", id);

    return NextResponse.json({
      data: {
        ...role,
        permission_ids: (perms ?? []).map(
          (p: { permission_id: string }) => p.permission_id,
        ),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load role";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** PUT /api/roles/[id] — update a custom centre role */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    const roleName = await getUserRoleName(
      supabase as unknown as SupabaseClient,
      ctx,
    );

    const hasUpdate =
      roleName === "PLATFORM_ADMINISTRATOR" ||
      (await can(supabase as unknown as SupabaseClient, ctx, "roles.update"));
    if (!hasUpdate) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const admin = createAdminClient();

    // Load role and verify it's a custom role in this centre
    const { data: role } = await admin
      .from("roles")
      .select("*")
      .eq("id", id)
      .single();
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
    if (role.is_system) {
      return NextResponse.json(
        { error: "System roles cannot be modified" },
        { status: 400 },
      );
    }
    if (
      roleName !== "PLATFORM_ADMINISTRATOR" &&
      role.centre_id !== ctx.centre.id
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, permission_ids } = body as {
      name?: string;
      description?: string;
      permission_ids?: string[];
    };

    const updates: Record<string, unknown> = {};
    if (name && typeof name === "string") {
      const trimmed = name.trim().toUpperCase().replace(/\s+/g, "_");
      if (!/^[A-Z][A-Z0-9_]{1,49}$/.test(trimmed)) {
        return NextResponse.json(
          { error: "Invalid role name format" },
          { status: 400 },
        );
      }
      // Check uniqueness if renaming
      if (trimmed !== role.name) {
        const { data: dup } = await admin
          .from("roles")
          .select("id")
          .eq("name", trimmed)
          .eq("centre_id", role.centre_id)
          .neq("id", id)
          .maybeSingle();
        if (dup) {
          return NextResponse.json(
            { error: "A role with this name already exists" },
            { status: 409 },
          );
        }
      }
      updates.name = trimmed;
    }
    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updErr } = await admin
        .from("roles")
        .update(updates)
        .eq("id", id);
      if (updErr) throw updErr;
    }

    // Replace permissions if provided
    if (Array.isArray(permission_ids)) {
      // CENTRE_MANAGER cannot grant platform.* perms
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

      const { error: delErr } = await admin
        .from("role_permissions")
        .delete()
        .eq("role_id", id);
      if (delErr) throw delErr;

      if (validIds.length > 0) {
        const rows = validIds.map((pid: string) => ({
          role_id: id,
          permission_id: pid,
        }));
        const { error: insErr } = await admin
          .from("role_permissions")
          .insert(rows);
        if (insErr) throw insErr;
      }
    }

    const { data: updated } = await admin
      .from("roles")
      .select("*")
      .eq("id", id)
      .single();

    return NextResponse.json({ data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update role";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/roles/[id] — delete a custom centre role */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    const roleName = await getUserRoleName(
      supabase as unknown as SupabaseClient,
      ctx,
    );

    const hasDelete =
      roleName === "PLATFORM_ADMINISTRATOR" ||
      (await can(supabase as unknown as SupabaseClient, ctx, "roles.delete"));
    if (!hasDelete) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data: role } = await admin
      .from("roles")
      .select("*")
      .eq("id", id)
      .single();
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
    if (role.is_system) {
      return NextResponse.json(
        { error: "System roles cannot be deleted" },
        { status: 400 },
      );
    }
    if (
      roleName !== "PLATFORM_ADMINISTRATOR" &&
      role.centre_id !== ctx.centre.id
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check if role is assigned to any active users
    const { count } = await admin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role_id", id)
      .eq("status", "active");
    if (count && count > 0) {
      return NextResponse.json(
        { error: `Cannot delete: role is assigned to ${count} active user(s)` },
        { status: 409 },
      );
    }

    const { error: delErr } = await admin.from("roles").delete().eq("id", id);
    if (delErr) throw delErr;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete role";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
