"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CENTRE_ROLES } from "@/types/role";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import {
  getUserRoleName,
  assignRole,
} from "@/lib/auth/authorization.service";

/**
 * Server action: provision a new platform/centre user.
 *
 * Self-service sign-up is DISABLED. Accounts are created only by:
 *  - A PLATFORM_ADMINISTRATOR, who can provision any CENTRE_ROLE (including
 *    CENTRE_MANAGER) for any active centre.
 *  - A CENTRE_MANAGER, who can provision staff (non-manager CENTRE_ROLES + custom roles) for
 *    their own centre only.
 *
 * All role/centre decisions are resolved server-side from the acting user's
 * session — client-provided centre_id/role are validated and, for managers,
 * overridden to the caller's own centre. PLATFORM_ADMINISTRATOR is never
 * assignable here; it is granted exclusively by existing administrators.
 */

/** System roles a CENTRE_MANAGER may create for staff in their own centre. */
const MANAGER_CREATABLE_SYSTEM_ROLES = CENTRE_ROLES.filter(
  (r) => r !== "CENTRE_MANAGER",
);

export interface ProvisionUserResult {
  ok: true;
  redirectTo: string;
}

export type ProvisionUserState =
  | ProvisionUserResult
  | { ok: false; error: string };

export async function provisionUser(
  _prev: ProvisionUserState | null,
  formData: FormData,
): Promise<ProvisionUserState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const requestedRole = String(formData.get("role") ?? "").trim();
  const requestedCentreId = String(formData.get("centreId") ?? "").trim();

  if (!email || !password || !firstName || !lastName || !requestedRole) {
    return { ok: false, error: "Please fill in all required fields." };
  }
  if (password.length < 10) {
    return { ok: false, error: "Password must be at least 10 characters." };
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return {
      ok: false,
      error: "Password must contain at least one letter and one number.",
    };
  }

  // ── Authenticate + authorise the caller ────────────────────────────────
  const supabase = (await createClient()) as unknown as SupabaseClient;
  let ctx;
  try {
    ctx = await requireAppAccess(supabase);
  } catch {
    return { ok: false, error: "Please sign in and try again." };
  }
  const actorRole = await getUserRoleName(supabase, ctx);

  const isAdmin = actorRole === "PLATFORM_ADMINISTRATOR";
  const isManager = actorRole === "CENTRE_MANAGER";
  if (!isAdmin && !isManager) {
    return { ok: false, error: "You are not allowed to create users." };
  }

  // ── Fetch custom roles for manager's centre ────────────────────────────
  const admin = createAdminClient();
  let customRoles: { name: string }[] = [];
  if (isManager) {
    const { data } = await admin
      .from("roles")
      .select("name")
      .eq("centre_id", ctx.centre.id)
      .eq("is_system", false);
    customRoles = (data ?? []) as { name: string }[];
  }

  // ── Decide allowed role + target centre (server-controlled) ────────────
  let allowedRoles: string[];
  let targetCentreId: string;

  if (isAdmin) {
    allowedRoles = [...CENTRE_ROLES];
    if (!requestedCentreId) {
      return { ok: false, error: "Please select a centre." };
    }
    targetCentreId = requestedCentreId;
  } else {
    // Manager: force their own centre, allow system roles + custom roles
    allowedRoles = [...MANAGER_CREATABLE_SYSTEM_ROLES, ...customRoles.map((r) => r.name)];
    targetCentreId = ctx.centre.id;
  }

  if (!allowedRoles.includes(requestedRole)) {
    return { ok: false, error: "You are not permitted to assign that role." };
  }

  // ── Validate the target centre is active (and exists) ──────────────────
  const { data: centre } = await admin
    .from("centres")
    .select("id, status")
    .eq("id", targetCentreId)
    .maybeSingle();

  if (!centre) {
    return { ok: false, error: "The selected centre does not exist." };
  }
  if (centre.status !== "active") {
    return { ok: false, error: "The selected centre is not active." };
  }

  // ── Enforce: each centre may have only ONE active CENTRE_MANAGER ────────
  if (requestedRole === "CENTRE_MANAGER") {
    const { data: managerRole } = await admin
      .from("roles")
      .select("id")
      .eq("name", "CENTRE_MANAGER")
      .maybeSingle();

    if (managerRole) {
      const { data: existingManagers } = await admin
        .from("user_roles")
        .select("id")
        .eq("centre_id", targetCentreId)
        .eq("role_id", managerRole.id)
        .eq("status", "active")
        .limit(1);

      if (existingManagers && existingManagers.length > 0) {
        return {
          ok: false,
          error: "This centre already has a Centre Manager. Transfer or deactivate the existing manager first.",
        };
      }
    }
  }

  // ── Create the auth user ───────────────────────────────────────────────
  const { data: createdUser, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });

  if (createError) {
    if (createError.message.includes("already registered")) {
      return { ok: false, error: "An account with that email already exists." };
    }
    return { ok: false, error: createError.message };
  }

  const authUserId = createdUser!.user.id;

  // ── Create the application profile ────────────────────────────────────
  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .insert({
      auth_user_id: authUserId,
      centre_id: targetCentreId,
      first_name: firstName,
      last_name: lastName,
      email,
    })
    .select("id")
    .single();

  if (profileError || !profile) {
    await admin.auth.admin.deleteUser(authUserId);
    return { ok: false, error: "Could not create the user profile. Please try again." };
  }

  // ── Assign the requested centre role ──────────────────────────────────
  try {
    await assignRole(admin as unknown as SupabaseClient, {
      userProfileId: profile.id,
      roleName: requestedRole,
      centreId: targetCentreId,
      assignedByAuthUserId: ctx.authUserId,
      reason: `Created by ${actorRole}`,
    });
  } catch {
    await admin.auth.admin.deleteUser(authUserId);
    await admin.from("user_profiles").delete().eq("id", profile.id);
    return { ok: false, error: "Could not assign the role. Please try again." };
  }

  return { ok: true, redirectTo: "/login" };
}