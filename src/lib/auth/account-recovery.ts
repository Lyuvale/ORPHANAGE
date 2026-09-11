"use server";

import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName } from "@/lib/auth/authorization.service";
import { auditUpdate } from "@/lib/audit/audit.service";

/**
 * Assisted account recovery.
 *
 * When a user forgets their username or password, the person who created the
 * account helps them:
 *  - Username IS the email address (visible in the accounts list).
 *  - Password: the creator resets it to a one-time temporary password and
 *    shares it with the user out of band (in person / phone).
 *
 * SECURITY (deny by default):
 *  - CENTRE_MANAGER: own centre only, staff roles only (never a manager,
 *    never a platform administrator, never themselves).
 *  - PLATFORM_ADMINISTRATOR: any centre, but never platform administrator
 *    accounts.
 *  - Every reset is audit-logged. The temporary password is returned ONCE to
 *    the actor and never stored.
 */

export interface ResetPasswordState {
  ok: boolean;
  error?: string;
  email?: string;
  displayName?: string;
  tempPassword?: string;
}

function generateTempPassword(): string {
  // Readable groups, e.g. "kitu-8X3mQ9-vitu" — easy to dictate over the phone.
  const part = (n: number) =>
    randomBytes(n)
      .toString("base64url")
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, n)
      .padEnd(n, "x");
  return `kitu-${part(6)}-vitu`;
}

interface TargetProfile {
  id: string;
  auth_user_id: string;
  centre_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

async function loadTarget(admin: ReturnType<typeof createAdminClient>, profileId: string) {
  const { data: profile } = await admin
    .from("user_profiles")
    .select("id, auth_user_id, centre_id, email, first_name, last_name")
    .eq("id", profileId)
    .maybeSingle();
  return (profile ?? null) as TargetProfile | null;
}

async function loadTargetRoles(admin: ReturnType<typeof createAdminClient>, profileId: string) {
  const { data } = await admin
    .from("user_roles")
    .select("role:roles(name)")
    .eq("user_id", profileId)
    .eq("status", "active");
  return ((data ?? []) as unknown as { role: { name: string } | null }[]).map((r) => r.role?.name ?? "");
}

async function doReset(
  admin: ReturnType<typeof createAdminClient>,
  ctx: Awaited<ReturnType<typeof requireAppAccess>>,
  actorRole: string | null,
  target: TargetProfile,
): Promise<ResetPasswordState> {
  const isAdmin = actorRole === "PLATFORM_ADMINISTRATOR";
  const isManager = actorRole === "CENTRE_MANAGER";
  if (!isAdmin && !isManager) {
    return { ok: false, error: "You are not allowed to reset passwords." };
  }

  const targetRoles = await loadTargetRoles(admin, target.id);

  if (isManager) {
    // Own centre, staff only: never managers, platform admins, or self.
    if (target.centre_id !== ctx.centre.id) {
      return { ok: false, error: "You can only help users of your own centre." };
    }
    if (target.id === ctx.profile.id) {
      return { ok: false, error: "You cannot reset your own password here." };
    }
    if (targetRoles.includes("CENTRE_MANAGER") || targetRoles.includes("PLATFORM_ADMINISTRATOR")) {
      return { ok: false, error: "Manager and administrator accounts are reset by the platform administrator." };
    }
  } else {
    // Platform admin: anyone except platform administrator accounts.
    if (targetRoles.includes("PLATFORM_ADMINISTRATOR")) {
      return { ok: false, error: "Platform administrator accounts cannot be reset here." };
    }
  }

  const tempPassword = generateTempPassword();
  const { error } = await admin.auth.admin.updateUserById(target.auth_user_id, {
    password: tempPassword,
  });
  if (error) {
    return { ok: false, error: "Could not reset the password. Please try again." };
  }

  try {
    await auditUpdate(
      admin,
      ctx,
      "user_account",
      target.id,
      { email: target.email },
      { email: target.email, password_reset_by: actorRole },
    );
  } catch {
    // Audit failure must not hide a successful reset from the helper.
  }

  return {
    ok: true,
    email: target.email,
    displayName: `${target.first_name ?? ""} ${target.last_name ?? ""}`.trim() || target.email,
    tempPassword,
  };
}

/** Reset by profile id (manager: own centre staff; admin: any non-platform user). */
export async function resetUserPassword(targetProfileId: string): Promise<ResetPasswordState> {
  if (!targetProfileId) return { ok: false, error: "Missing user." };
  const supabase = (await createClient()) as unknown as SupabaseClient;
  let ctx;
  try {
    ctx = await requireAppAccess(supabase, { allowInactiveSubscription: true });
  } catch {
    return { ok: false, error: "Please sign in and try again." };
  }
  const actorRole = await getUserRoleName(supabase, ctx);
  const admin = createAdminClient();
  const target = await loadTarget(admin, targetProfileId);
  if (!target) return { ok: false, error: "User not found." };
  return doReset(admin, ctx, actorRole, target);
}

/** Platform admin: find by email (any centre) and reset. */
export async function resetUserPasswordByEmail(email: string): Promise<ResetPasswordState> {
  const clean = email.trim().toLowerCase();
  if (!clean) return { ok: false, error: "Please enter an email address." };
  const supabase = (await createClient()) as unknown as SupabaseClient;
  let ctx;
  try {
    ctx = await requireAppAccess(supabase, { allowInactiveSubscription: true });
  } catch {
    return { ok: false, error: "Please sign in and try again." };
  }
  const actorRole = await getUserRoleName(supabase, ctx);
  if (actorRole !== "PLATFORM_ADMINISTRATOR") {
    return { ok: false, error: "Only the platform administrator can look up any email." };
  }
  const admin = createAdminClient();
  const { data: target } = await admin
    .from("user_profiles")
    .select("id, auth_user_id, centre_id, email, first_name, last_name")
    .ilike("email", clean)
    .limit(1)
    .maybeSingle();
  if (!target) return { ok: false, error: "No account found with that email." };
  return doReset(admin, ctx, actorRole, target as TargetProfile);
}
