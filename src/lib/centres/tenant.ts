/**
 * Tenant Context
 *
 * This module provides helpers for tenant isolation.
 *
 * SECURITY MODEL:
 * - The centre_id is derived from the user_profiles table, NOT from JWT claims.
 * - The auth.current_centre_id() PostgreSQL function looks up the centre from
 *   user_profiles based on auth.uid().
 * - Clients must NEVER be allowed to supply centre_id directly.
 *
 * The getAppUserContext() function in @/lib/auth/app-user-context.ts is the
 * authoritative mechanism for obtaining the full user + centre context.
 * This module provides supplementary helpers.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Get the current user's centre_id from the database.
 *
 * Uses the auth.current_centre_id() PostgreSQL function which reads
 * from user_profiles (NOT from JWT claims).
 *
 * @param supabase - A Supabase client with the user's session.
 * @returns The centre_id string, or null if no active profile.
 */
export async function getCurrentCentreId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("auth_current_centre_id" as never);

  if (error) {
    // Fallback: query user_profiles directly
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("centre_id")
      .eq("auth_user_id", user.id)
      .eq("status", "active")
      .single();

    return (profile as { centre_id: string } | null)?.centre_id ?? null;
  }

  return data as string | null;
}

/**
 * Validate that a given centre_id matches the user's tenant context.
 *
 * Use this to guard any operation that receives a centre_id parameter,
 * ensuring it matches the authenticated user's tenant.
 *
 * @throws {Error} If the provided centreId does not match the tenant context.
 */
export function validateTenantAccess(
  userCentreId: string,
  requestedCentreId: string,
): void {
  if (userCentreId !== requestedCentreId) {
    throw new Error(
      "Access denied: requested centre does not match your tenant context.",
    );
  }
}
