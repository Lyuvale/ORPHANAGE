import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/role";

/**
 * User Role Service
 *
 * Handles role assignment, revocation, and role history.
 * Uses the service-role client which bypasses RLS.
 *
 * SECURITY: Callers must verify authentication and platform/centre access
 * before calling these methods. Authorization is enforced at the API layer.
 */

/**
 * Assign a role to a user within a centre.
 * 
 * - Creates or reactivates a user_role record
 * - Deactivates any previous active roles for that centre
 * - Records the change in role_history
 * - Logs the action in audit_logs
 */
export async function assignRoleToUser(input: {
  userId: string;
  roleId: string;
  centreId: string;
  assignedBy: string; // actor's user_id
  reason?: string;
}): Promise<UserRole> {
  const supabase = createAdminClient();
  const { userId, roleId, centreId, assignedBy, reason } = input;

  // 1. Get the current active role for this user at this centre
  const { data: currentRole } = await supabase
    .from("user_roles")
    .select("id, role_id")
    .eq("user_id", userId)
    .eq("centre_id", centreId)
    .eq("status", "active")
    .single();

  // 2. If there's a current role, deactivate it
  if (currentRole && currentRole.role_id !== roleId) {
    await supabase
      .from("user_roles")
      .update({ status: "revoked" })
      .eq("id", currentRole.id);

    // Record the role history
    await supabase.from("role_history").insert({
      user_id: userId,
      centre_id: centreId,
      previous_role_id: currentRole.role_id,
      new_role_id: roleId,
      changed_by: assignedBy,
      reason: reason || null,
    });
  }

  // 3. Check if there's an inactive user_role record we can reactivate
  const { data: inactiveRole } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("centre_id", centreId)
    .eq("role_id", roleId)
    .eq("status", "revoked")
    .single();

  if (inactiveRole) {
    // Reactivate the existing record
    const { data, error } = await supabase
      .from("user_roles")
      .update({ status: "active", assigned_at: new Date().toISOString() })
      .eq("id", inactiveRole.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to reactivate role: ${error.message}`);
    return data as UserRole;
  }

  // 4. Create a new user_role record
  const { data, error } = await supabase
    .from("user_roles")
    .insert({
      user_id: userId,
      role_id: roleId,
      centre_id: centreId,
      assigned_by: assignedBy,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23503") {
      throw new Error("User, role, or centre does not exist.");
    }
    if (error.code === "23505") {
      throw new Error("Role assignment already exists.");
    }
    throw new Error(`Failed to assign role: ${error.message}`);
  }

  // Record the role history
  if (!currentRole) {
    await supabase.from("role_history").insert({
      user_id: userId,
      centre_id: centreId,
      previous_role_id: null,
      new_role_id: roleId,
      changed_by: assignedBy,
      reason: reason || null,
    });
  }

  return data as UserRole;
}

/**
 * Get the current active role for a user at a centre.
 */
export async function getUserRoleAtCentre(
  userId: string,
  centreId: string,
): Promise<UserRole | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("user_roles")
    .select("*")
    .eq("user_id", userId)
    .eq("centre_id", centreId)
    .eq("status", "active")
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get user role: ${error.message}`);
  }

  return data as UserRole;
}

/**
 * Revoke a user's role at a centre.
 */
export async function revokeRoleFromUser(
  userId: string,
  centreId: string,
  revokedBy: string,
  reason?: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("user_roles")
    .update({ status: "revoked" })
    .eq("user_id", userId)
    .eq("centre_id", centreId)
    .eq("status", "active");

  if (error) throw new Error(`Failed to revoke role: ${error.message}`);

  // Record in role_history
  const { data: currentRole } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("user_id", userId)
    .eq("centre_id", centreId)
    .single();

  if (currentRole) {
    await supabase.from("role_history").insert({
      user_id: userId,
      centre_id: centreId,
      previous_role_id: currentRole.role_id,
      new_role_id: null,
      changed_by: revokedBy,
      reason: reason || null,
    });
  }
}

/**
 * List all roles for a user across all centres.
 */
export async function listUserRoles(
  userId: string,
  activeOnly: boolean = true,
): Promise<UserRole[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("user_roles")
    .select("*")
    .eq("user_id", userId);

  if (activeOnly) {
    query = query.eq("status", "active");
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to list user roles: ${error.message}`);

  return (data as UserRole[]) ?? [];
}

/**
 * Get role history for a user at a centre.
 */
export async function getRoleHistory(
  userId: string,
  centreId: string,
  limit: number = 50,
): Promise<Array<{
  id: string;
  user_id: string;
  centre_id: string;
  previous_role_id: string | null;
  new_role_id: string | null;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
}>> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("role_history")
    .select("*")
    .eq("user_id", userId)
    .eq("centre_id", centreId)
    .order("changed_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to get role history: ${error.message}`);

  return (data as Array<{
    id: string;
    user_id: string;
    centre_id: string;
    previous_role_id: string | null;
    new_role_id: string | null;
    changed_by: string | null;
    changed_at: string;
    reason: string | null;
  }>) ?? [];
}
