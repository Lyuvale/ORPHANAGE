import { createAdminClient } from "@/lib/supabase/admin";
import type {
  UserProfile,
  CreateUserProfileInput,
  UpdateUserProfileInput,
  UserProfileStatus,
} from "@/types/user-profile";

/**
 * User Profile Service
 *
 * Handles all user profile CRUD operations via the Supabase service-role client.
 * This client bypasses RLS — all access control is managed at the application layer.
 *
 * SECURITY: Callers must verify authentication and tenant context before
 * calling these methods. The service role client is intentionally permissive
 * at the database level; authorization is enforced by the application layer.
 */

const TABLE = "user_profiles" as const;

/**
 * List user profiles, with optional filters.
 */
export async function listUserProfiles(options?: {
  centre_id?: string;
  status?: UserProfileStatus;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: UserProfile[]; count: number }> {
  const supabase = createAdminClient();
  const { centre_id, status, search, limit = 50, offset = 0 } = options ?? {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from(TABLE)
    .select("*", { count: "exact" })
    .order("last_name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (centre_id) {
    query = query.eq("centre_id", centre_id);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`,
    );
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list user profiles: ${error.message}`);
  }

  return { data: (data as UserProfile[]) ?? [], count: count ?? 0 };
}

/**
 * Get a user profile by ID.
 */
export async function getUserProfileById(id: string): Promise<UserProfile | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get user profile: ${error.message}`);
  }

  return data as UserProfile;
}

/**
 * Get a user profile by auth user ID.
 */
export async function getUserProfileByAuthUserId(
  authUserId: string,
): Promise<UserProfile | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("auth_user_id", authUserId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get user profile: ${error.message}`);
  }

  return data as UserProfile;
}

/**
 * Check if a user profile exists for a given auth user ID.
 */
export async function userProfileExists(authUserId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("auth_user_id", authUserId);

  if (error) {
    throw new Error(`Failed to check user profile: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

/**
 * Create a new user profile.
 */
export async function createUserProfile(
  input: CreateUserProfileInput,
): Promise<UserProfile> {
  const supabase = createAdminClient();

  const payload = {
    auth_user_id: input.auth_user_id,
    centre_id: input.centre_id,
    first_name: input.first_name,
    middle_name: input.middle_name || null,
    last_name: input.last_name,
    phone: input.phone || null,
    email: input.email || null,
    status: input.status ?? "active",
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A user profile already exists for this auth user.");
    }
    if (error.code === "23503") {
      throw new Error("Referenced centre or auth user does not exist.");
    }
    throw new Error(`Failed to create user profile: ${error.message}`);
  }

  return data as UserProfile;
}

/**
 * Update an existing user profile.
 */
export async function updateUserProfile(
  id: string,
  input: UpdateUserProfileInput,
): Promise<UserProfile> {
  const supabase = createAdminClient();

  const payload: Record<string, unknown> = {};

  if (input.centre_id !== undefined) payload.centre_id = input.centre_id;
  if (input.first_name !== undefined) payload.first_name = input.first_name;
  if (input.middle_name !== undefined) payload.middle_name = input.middle_name || null;
  if (input.last_name !== undefined) payload.last_name = input.last_name;
  if (input.phone !== undefined) payload.phone = input.phone || null;
  if (input.email !== undefined) payload.email = input.email || null;
  if (input.status !== undefined) payload.status = input.status;

  if (Object.keys(payload).length === 0) {
    throw new Error("No fields to update.");
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("User profile not found.");
    }
    if (error.code === "23503") {
      throw new Error("Referenced centre does not exist.");
    }
    throw new Error(`Failed to update user profile: ${error.message}`);
  }

  return data as UserProfile;
}

/**
 * Deactivate a user profile (soft-delete).
 *
 * The user's historical records are preserved.
 */
export async function deactivateUserProfile(id: string): Promise<UserProfile> {
  return updateUserProfile(id, { status: "deactivated" });
}
