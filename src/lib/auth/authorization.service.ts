/**
 * Authorization Service
 *
 * Provides server-side permission checking for the application.
 *
 * SECURITY MODEL:
 * - All authorization is enforced server-side.
 * - Permissions are resolved from the database (user_roles → role_permissions → permissions).
 * - Tenant isolation is enforced: permission + authorised centre context must BOTH be satisfied.
 * - Deny by default: if a permission is not explicitly granted, access is denied.
 *
 * USAGE:
 *   const ctx = await requireAppAccess(supabase);
 *   await requirePermission(supabase, ctx, "children.view");
 *   // — or —
 *   const allowed = await can(supabase, ctx, "children.view");
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppUserContext } from "@/lib/auth/app-user-context";
import { AuthError } from "@/lib/auth/app-user-context";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Role,
  UserRole,
  PermissionString,
  RoleHistoryEntry,
} from "@/types/role";

/**
 * Cached permission set for a user in a specific centre.
 */
export interface UserAuthorization {
  /** The user's active role in this centre. */
  role: Role;
  /** The full set of permission strings granted to this role. */
  permissions: Set<PermissionString>;
  /** The user_roles record. */
  userRole: UserRole;
}

// ─── Core authorization helpers ──────────────────────────────────────────────

/**
 * Check whether the current user has a specific permission.
 *
 * This is the primary authorization gate. It:
 * 1. Verifies user and centre are active (via the context).
 * 2. Looks up the user's role in the database.
 * 3. Checks whether that role includes the requested permission.
 * 4. Enforces tenant isolation (permission is scoped to the user's centre).
 *
 * @returns true if the permission is granted, false otherwise.
 */
export async function can(
  supabase: SupabaseClient,
  ctx: AppUserContext,
  permission: PermissionString,
): Promise<boolean> {
  if (!ctx.canAccess) return false;

  const authz = await getUserAuthorization(supabase, ctx);
  if (!authz) return false;

  return authz.permissions.has(permission);
}

/**
 * Like `can()`, but throws AuthError if permission is denied.
 *
 * Use this at the top of API route handlers to gate access.
 *
 * @throws AuthError with code "PERMISSION_DENIED" if denied.
 */
export async function requirePermission(
  supabase: SupabaseClient,
  ctx: AppUserContext,
  permission: PermissionString,
): Promise<void> {
  const allowed = await can(supabase, ctx, permission);
  if (!allowed) {
    throw new AuthError(
      `Access denied: you do not have the "${permission}" permission.`,
      "PERMISSION_DENIED",
    );
  }
}

/**
 * Get the full authorization details for a user in their current centre.
 *
 * Returns null if the user has no active role assignment.
 */
export async function getUserAuthorization(
  supabase: SupabaseClient,
  ctx: AppUserContext,
): Promise<UserAuthorization | null> {
  // Platform admin placeholder centre: use admin client (RLS blocks session client)
  const isPlaceholderCentre = ctx.centre.id === "00000000-0000-0000-0000-000000000000";
  const client = isPlaceholderCentre ? createAdminClient() : supabase;

  let query = client
    .from("user_roles")
    .select("*, role:roles(*)")
    .eq("user_id", ctx.profile.id)
    .eq("status", "active");

  if (!isPlaceholderCentre) {
    query = query.eq("centre_id", ctx.centre.id);
  }

  const { data: userRole, error: urError } = await query.limit(1).maybeSingle();

  if (urError || !userRole) return null;

  const role = (userRole as unknown as { role: Role }).role;
  if (!role) return null;

  // 2. Get the permissions for this role
  const { data: rpRows, error: rpError } = await supabase
    .from("role_permissions")
    .select("permission:permissions(module, action)")
    .eq("role_id", role.id);

  if (rpError || !rpRows) return null;

  const permissions = new Set<PermissionString>();
  for (const row of rpRows) {
    const perm = (row as unknown as { permission: { module: string; action: string } }).permission;
    if (perm) {
      permissions.add(`${perm.module}.${perm.action}` as PermissionString);
    }
  }

  return {
    role,
    permissions,
    userRole: userRole as unknown as UserRole,
  };
}

/**
 * Get the permission strings for a user in their current centre.
 */
export async function getUserPermissions(
  supabase: SupabaseClient,
  ctx: AppUserContext,
): Promise<PermissionString[]> {
  const authz = await getUserAuthorization(supabase, ctx);
  if (!authz) return [];
  return Array.from(authz.permissions);
}

/**
 * Get the user's active role name in their current centre.
 */
export async function getUserRoleName(
  supabase: SupabaseClient,
  ctx: AppUserContext,
): Promise<string | null> {
  const authz = await getUserAuthorization(supabase, ctx);
  if (!authz) return null;
  return authz.role.name;
}

// ─── Role assignment (admin operations) ──────────────────────────────────────

export interface AssignRoleInput {
  userProfileId: string;
  roleName: string;
  centreId: string;
  assignedByAuthUserId?: string;
  reason?: string;
}

/**
 * Assign a role to a user within a centre.
 *
 * This is an admin-only operation (call via service-role client).
 * It:
 * 1. Validates the role exists.
 * 2. Deactivates any existing role for this user+centre.
 * 3. Creates the new user_roles record.
 * 4. Records the change in role_history.
 *
 * @param adminSupabase - A Supabase client using the service_role key (bypasses RLS).
 */
export async function assignRole(
  adminSupabase: SupabaseClient,
  input: AssignRoleInput,
): Promise<UserRole> {
  // 1. Look up the role
  const { data: role, error: roleError } = await adminSupabase
    .from("roles")
    .select("id, name")
    .eq("name", input.roleName)
    .single();

  if (roleError || !role) {
    throw new AuthError(
      `Invalid role: "${input.roleName}" is not a recognised role.`,
      "INVALID_ROLE",
    );
  }

  // 2. Find any existing active role for this user+centre
  const { data: existing } = await adminSupabase
    .from("user_roles")
    .select("id, role_id")
    .eq("user_id", input.userProfileId)
    .eq("centre_id", input.centreId)
    .eq("status", "active")
    .maybeSingle();

  // 3. Deactivate existing role if present
  if (existing) {
    await adminSupabase
      .from("user_roles")
      .update({ status: "revoked" })
      .eq("id", existing.id);
  }

  // 4. Create new user_roles record
  const { data: newUserRole, error: insertError } = await adminSupabase
    .from("user_roles")
    .insert({
      user_id: input.userProfileId,
      role_id: role.id,
      centre_id: input.centreId,
      assigned_by: input.assignedByAuthUserId ?? null,
      status: "active",
    })
    .select()
    .single();

  if (insertError || !newUserRole) {
    throw new AuthError(
      "Failed to assign role: database error.",
      "ROLE_ASSIGN_FAILED",
    );
  }

  // 5. Record in role_history
  await adminSupabase.from("role_history").insert({
    user_id: input.userProfileId,
    centre_id: input.centreId,
    previous_role_id: existing?.role_id ?? null,
    new_role_id: role.id,
    changed_by: input.assignedByAuthUserId ?? null,
    reason: input.reason ?? null,
  });

  return newUserRole as unknown as UserRole;
}

/**
 * Get the role history for a user.
 *
 * @param adminSupabase - Service-role client.
 * @param userProfileId - The user_profiles ID.
 */
export async function getRoleHistory(
  adminSupabase: SupabaseClient,
  userProfileId: string,
): Promise<RoleHistoryEntry[]> {
  const { data, error } = await adminSupabase
    .from("role_history")
    .select("*")
    .eq("user_id", userProfileId)
    .order("changed_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as unknown as RoleHistoryEntry[];
}
