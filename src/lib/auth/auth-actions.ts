"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { CENTRE_ROLES, type CentreRole } from "@/types/role";

/**
 * Server actions for authentication.
 *
 * Only the flows that truly require the service-role key live here (i.e. user
 * provisioning during sign-up). Sign-in and sign-out are performed client-side
 * with the browser client so that session cookies persist reliably in the
 * browser; role-aware post-login routing is resolved there too.
 *
 * SECURITY: These run server-side only. Platform-administration is never
 * assignable at sign-up — only CENTRE_ROLES are offered. The
 * PLATFORM_ADMINISTRATOR role is granted exclusively by an existing platform
 * admin through the platform admin UI.
 */

const SIGNUP_ROLES = CENTRE_ROLES;

export interface SignUpResult {
  ok: true;
  redirectTo: string;
}

export type SignUpState = SignUpResult | { ok: false; error: string };

/**
 * Create a new centre user (email + password + profile + default role).
 *
 * New profiles are created with `active` status so the account can sign in
 * right away. The role is restricted to centre roles.
 */
export async function signUp(
  _prev: SignUpState | null,
  formData: FormData,
): Promise<SignUpState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const centreId = String(formData.get("centreId") ?? "").trim();
  const roleName = String(formData.get("role") ?? "").trim() as CentreRole;

  if (!email || !password || !firstName || !lastName || !centreId) {
    return { ok: false, error: "Please fill in all required fields." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (!(SIGNUP_ROLES as readonly string[]).includes(roleName)) {
    return { ok: false, error: "Invalid role selected." };
  }

  const admin = createAdminClient();

  // 1. Create the Supabase auth user.
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

  // 2. Create the application profile (ties auth user to a centre).
  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .insert({
      auth_user_id: authUserId,
      centre_id: centreId,
      first_name: firstName,
      last_name: lastName,
      email,
    })
    .select("id")
    .single();

  if (profileError || !profile) {
    await admin.auth.admin.deleteUser(authUserId);
    return { ok: false, error: "Could not create your profile. Please try again." };
  }

  // 3. Assign the chosen centre role (never platform admin).
  const { data: role, error: roleError } = await admin
    .from("roles")
    .select("id")
    .eq("name", roleName)
    .single();

  if (roleError || !role) {
    await admin.auth.admin.deleteUser(authUserId);
    await admin.from("user_profiles").delete().eq("id", profile.id);
    return { ok: false, error: "Could not assign your role. Please try again." };
  }

  const { error: userRoleError } = await admin.from("user_roles").insert({
    user_id: profile.id,
    role_id: role.id,
    centre_id: centreId,
    status: "active",
  });

  if (userRoleError) {
    await admin.auth.admin.deleteUser(authUserId);
    await admin.from("user_profiles").delete().eq("id", profile.id);
    return { ok: false, error: "Could not create your account. Please try again." };
  }

  return { ok: true, redirectTo: "/login" };
}
