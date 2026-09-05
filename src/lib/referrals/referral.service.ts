import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Referral,
  CreateReferralInput,
  UpdateReferralInput,
  UpdateReferralStatusInput,
  ReferralSearchFilters,
} from "@/types/referral";

const TABLE = "referrals" as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

// ─── List Referrals ──────────────────────────────────────────────────────────

export async function listReferrals(
  adminSupabase: AdminClient,
  filters: ReferralSearchFilters,
): Promise<{ data: Referral[]; count: number }> {
  let query = adminSupabase
    .from(TABLE)
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("submitted_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.source) {
    query = query.eq("source", filters.source);
  }

  if (filters.priority) {
    query = query.eq("priority", filters.priority);
  }

  if (filters.child_id) {
    query = query.eq("child_id", filters.child_id);
  }

  if (filters.search) {
    const term = filters.search.trim();
    query = query.or(
      `child_first_name.ilike.%${term}%,child_last_name.ilike.%${term}%,child_middle_name.ilike.%${term}%,reference_number.ilike.%${term}%,reason.ilike.%${term}%`,
    );
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list referrals: ${error.message}`);
  }

  return { data: (data ?? []) as Referral[], count: count ?? 0 };
}

// ─── Get Referral By ID ──────────────────────────────────────────────────────

export async function getReferralById(
  adminSupabase: AdminClient,
  id: string,
): Promise<Referral | null> {
  const { data, error } = await adminSupabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get referral: ${error.message}`);
  }

  return data as Referral;
}

// ─── Generate Referral Reference ─────────────────────────────────────────────

export async function generateReferralReference(
  adminSupabase: AdminClient,
  centreId: string,
): Promise<string> {
  // Get the centre code
  const { data: centre, error: centreError } = await adminSupabase
    .from("centres")
    .select("code")
    .eq("id", centreId)
    .single();

  if (centreError || !centre) {
    throw new Error("Centre not found");
  }

  // Get the next sequence number
  const { count, error: countError } = await adminSupabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("centre_id", centreId);

  if (countError) {
    throw new Error(`Failed to generate reference: ${countError.message}`);
  }

  const nextNumber = (count ?? 0) + 1;
  const ref = `${centre.code}-REF-${String(nextNumber).padStart(6, "0")}`;

  return ref;
}

// ─── Create Referral ─────────────────────────────────────────────────────────

export async function createReferral(
  adminSupabase: AdminClient,
  input: CreateReferralInput,
): Promise<Referral> {
  // Generate reference number
  const referenceNumber = await generateReferralReference(
    adminSupabase,
    input.centre_id,
  );

  const payload = {
    centre_id: input.centre_id,
    reference_number: referenceNumber,
    child_first_name: input.child_first_name,
    child_middle_name: input.child_middle_name ?? null,
    child_last_name: input.child_last_name,
    child_date_of_birth: input.child_date_of_birth ?? null,
    child_gender: input.child_gender ?? null,
    child_nationality: input.child_nationality ?? null,
    source: input.source,
    priority: input.priority ?? "medium",
    status: "submitted" as const,
    referrer_name: input.referrer_name ?? null,
    referrer_org: input.referrer_org ?? null,
    referrer_contact: input.referrer_contact ?? null,
    reason: input.reason,
    notes: input.notes ?? null,
    metadata: input.metadata ?? null,
  };

  const { data, error } = await adminSupabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A referral with this reference already exists");
    }
    if (error.code === "23503") {
      throw new Error("Invalid centre reference");
    }
    throw new Error(`Failed to create referral: ${error.message}`);
  }

  return data as Referral;
}

// ─── Update Referral ─────────────────────────────────────────────────────────

export async function updateReferral(
  adminSupabase: AdminClient,
  id: string,
  input: UpdateReferralInput,
): Promise<Referral> {
  const payload: Record<string, unknown> = {};

  if (input.child_first_name !== undefined) payload.child_first_name = input.child_first_name;
  if (input.child_middle_name !== undefined) payload.child_middle_name = input.child_middle_name || null;
  if (input.child_last_name !== undefined) payload.child_last_name = input.child_last_name;
  if (input.child_date_of_birth !== undefined) payload.child_date_of_birth = input.child_date_of_birth || null;
  if (input.child_gender !== undefined) payload.child_gender = input.child_gender || null;
  if (input.child_nationality !== undefined) payload.child_nationality = input.child_nationality || null;
  if (input.source !== undefined) payload.source = input.source;
  if (input.priority !== undefined) payload.priority = input.priority;
  if (input.referrer_name !== undefined) payload.referrer_name = input.referrer_name || null;
  if (input.referrer_org !== undefined) payload.referrer_org = input.referrer_org || null;
  if (input.referrer_contact !== undefined) payload.referrer_contact = input.referrer_contact || null;
  if (input.reason !== undefined) payload.reason = input.reason;
  if (input.notes !== undefined) payload.notes = input.notes || null;
  if (input.metadata !== undefined) payload.metadata = input.metadata;

  if (Object.keys(payload).length === 0) {
    throw new Error("No fields to update");
  }

  const { data, error } = await adminSupabase
    .from(TABLE)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Referral not found");
    }
    throw new Error(`Failed to update referral: ${error.message}`);
  }

  return data as Referral;
}

// ─── Update Referral Status ──────────────────────────────────────────────────

export async function updateReferralStatus(
  adminSupabase: AdminClient,
  referralId: string,
  centreId: string,
  input: UpdateReferralStatusInput,
  changedBy: string | null,
): Promise<Referral> {
  const referral = await getReferralById(adminSupabase, referralId);
  if (!referral) {
    throw new Error("Referral not found");
  }

  if (referral.centre_id !== centreId) {
    throw new Error("Referral does not belong to this centre");
  }

  const previousStatus = referral.status;

  if (previousStatus === input.new_status) {
    throw new Error(`Referral is already ${input.new_status}`);
  }

  const updatePayload: Record<string, unknown> = {
    status: input.new_status,
  };

  // Set reviewed_by and reviewed_at when moving to a review-related status
  if (input.new_status !== "submitted") {
    updatePayload.reviewed_by = changedBy;
    updatePayload.reviewed_at = new Date().toISOString();
  }

  const { data, error } = await adminSupabase
    .from(TABLE)
    .update(updatePayload)
    .eq("id", referralId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update referral status: ${error.message}`);
  }

  return data as Referral;
}

// ─── Get Referral Documents ──────────────────────────────────────────────────

export async function getReferralDocuments(
  adminSupabase: AdminClient,
  referralId: string,
): Promise<{ id: string; referral_id: string; centre_id: string; file_name: string; file_type: string | null; file_size: number | null; storage_path: string; uploaded_by: string | null; uploaded_at: string; metadata: Record<string, unknown> | null }[]> {
  const { data, error } = await adminSupabase
    .from("referral_documents")
    .select("*")
    .eq("referral_id", referralId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get referral documents: ${error.message}`);
  }

  return (data ?? []) as { id: string; referral_id: string; centre_id: string; file_name: string; file_type: string | null; file_size: number | null; storage_path: string; uploaded_by: string | null; uploaded_at: string; metadata: Record<string, unknown> | null }[];
}
