import { createAdminClient } from "@/lib/supabase/admin";
import type { Centre, CreateCentreInput, UpdateCentreInput, CentreStatus } from "@/types/centre";

/**
 * Centre Service
 *
 * Handles all centre CRUD operations via the Supabase service-role client.
 * This client bypasses RLS — all access control is managed at the application layer.
 *
 * SECURITY: All callers must verify tenant context before calling these methods.
 * The service role client is intentionally permissive at the database level;
 * authorization is enforced by the application layer and RLS for authenticated requests.
 */

const TABLE = "centres" as const;

/**
 * List all centres, with optional status filter.
 */
export async function listCentres(options?: {
  status?: CentreStatus;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: Centre[]; count: number }> {
  const supabase = createAdminClient();
  const { status, search, limit = 50, offset = 0 } = options ?? {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from(TABLE)
    .select("*", { count: "exact" })
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list centres: ${error.message}`);
  }

  return { data: (data as Centre[]) ?? [], count: count ?? 0 };
}

/**
 * Get a single centre by ID.
 */
export async function getCentreById(id: string): Promise<Centre | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get centre: ${error.message}`);
  }

  return data as Centre;
}

/**
 * Get a single centre by code.
 */
export async function getCentreByCode(code: string): Promise<Centre | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .ilike("code", code)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get centre: ${error.message}`);
  }

  return data as Centre;
}

/**
 * Check if a centre code already exists (case-insensitive).
 */
export async function centreCodeExists(
  code: string,
  excludeId?: string,
): Promise<boolean> {
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .ilike("code", code);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to check centre code: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

/**
 * Create a new centre.
 */
export async function createCentre(input: CreateCentreInput): Promise<Centre> {
  const supabase = createAdminClient();

  const payload = {
    name: input.name,
    code: input.code,
    contact_email: input.contact_email || null,
    contact_phone: input.contact_phone || null,
    address_line1: input.address_line1 || null,
    address_line2: input.address_line2 || null,
    city: input.city || null,
    state: input.state || null,
    postal_code: input.postal_code || null,
    country: input.country ?? "Nigeria",
    status: input.status ?? "active",
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A centre with this code already exists.");
    }
    throw new Error(`Failed to create centre: ${error.message}`);
  }

  return data as Centre;
}

/**
 * Update an existing centre.
 */
export async function updateCentre(
  id: string,
  input: UpdateCentreInput,
): Promise<Centre> {
  const supabase = createAdminClient();

  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) payload.name = input.name;
  if (input.code !== undefined) payload.code = input.code;
  if (input.contact_email !== undefined) payload.contact_email = input.contact_email || null;
  if (input.contact_phone !== undefined) payload.contact_phone = input.contact_phone || null;
  if (input.address_line1 !== undefined) payload.address_line1 = input.address_line1 || null;
  if (input.address_line2 !== undefined) payload.address_line2 = input.address_line2 || null;
  if (input.city !== undefined) payload.city = input.city || null;
  if (input.state !== undefined) payload.state = input.state || null;
  if (input.postal_code !== undefined) payload.postal_code = input.postal_code || null;
  if (input.country !== undefined) payload.country = input.country;
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
      throw new Error("Centre not found.");
    }
    if (error.code === "23505") {
      throw new Error("A centre with this code already exists.");
    }
    throw new Error(`Failed to update centre: ${error.message}`);
  }

  return data as Centre;
}

/**
 * Soft-delete a centre by setting its status to 'deactivated'.
 *
 * Centres are never physically deleted. Historical data is preserved.
 */
export async function deactivateCentre(id: string): Promise<Centre> {
  return updateCentre(id, { status: "deactivated" });
}
