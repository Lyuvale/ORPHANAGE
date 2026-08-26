import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Admission,
  AdmissionStatus,
  CreateAdmissionInput,
  UpdateAdmissionInput,
  UpdateAdmissionStatusInput,
  AdmissionSearchFilters,
  AdmissionHistoryEntry,
} from "@/types/admission";

const TABLE = "admissions" as const;
const HISTORY_TABLE = "admission_history" as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

// ─── List Admissions ─────────────────────────────────────────────────────────

export async function listAdmissions(
  adminSupabase: AdminClient,
  filters: AdmissionSearchFilters,
): Promise<{ data: Admission[]; count: number }> {
  let query = adminSupabase
    .from(TABLE)
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.referral_id) {
    query = query.eq("referral_id", filters.referral_id);
  }

  if (filters.search) {
    const term = filters.search.trim();
    query = query.or(
      `reference_number.ilike.%${term}%,decision.ilike.%${term}%,conditions.ilike.%${term}%`,
    );
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list admissions: ${error.message}`);
  }

  return { data: (data ?? []) as Admission[], count: count ?? 0 };
}

// ─── Get Admission By ID ─────────────────────────────────────────────────────

export async function getAdmissionById(
  adminSupabase: AdminClient,
  id: string,
): Promise<Admission | null> {
  const { data, error } = await adminSupabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get admission: ${error.message}`);
  }

  return data as Admission;
}

// ─── Generate Admission Reference ────────────────────────────────────────────

export async function generateAdmissionReference(
  adminSupabase: AdminClient,
  centreId: string,
): Promise<string> {
  const { data: centre, error: centreError } = await adminSupabase
    .from("centres")
    .select("code")
    .eq("id", centreId)
    .single();

  if (centreError || !centre) {
    throw new Error("Centre not found");
  }

  const { count, error: countError } = await adminSupabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("centre_id", centreId);

  if (countError) {
    throw new Error(`Failed to generate reference: ${countError.message}`);
  }

  const nextNumber = (count ?? 0) + 1;
  return `${centre.code}-ADM-${String(nextNumber).padStart(6, "0")}`;
}

// ─── Create Admission ────────────────────────────────────────────────────────

export async function createAdmission(
  adminSupabase: AdminClient,
  input: CreateAdmissionInput,
): Promise<Admission> {
  const referenceNumber = await generateAdmissionReference(
    adminSupabase,
    input.centre_id,
  );

  const payload = {
    centre_id: input.centre_id,
    referral_id: input.referral_id,
    reference_number: referenceNumber,
    status: "pending" as const,
    decision: input.decision ?? null,
    conditions: input.conditions ?? null,
    admitted_date: input.admitted_date ?? null,
    metadata: input.metadata ?? null,
  };

  const { data, error } = await adminSupabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("An admission with this reference already exists");
    }
    if (error.code === "23503") {
      throw new Error("Invalid centre or referral reference");
    }
    throw new Error(`Failed to create admission: ${error.message}`);
  }

  // Record initial status in history
  await recordAdmissionHistory(
    adminSupabase,
    data.id,
    input.centre_id,
    null,
    "pending",
    null,
    null,
  );

  return data as Admission;
}

// ─── Update Admission ────────────────────────────────────────────────────────

export async function updateAdmission(
  adminSupabase: AdminClient,
  id: string,
  input: UpdateAdmissionInput,
): Promise<Admission> {
  const payload: Record<string, unknown> = {};

  if (input.decision !== undefined) payload.decision = input.decision || null;
  if (input.conditions !== undefined) payload.conditions = input.conditions || null;
  if (input.admitted_date !== undefined) payload.admitted_date = input.admitted_date || null;
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
      throw new Error("Admission not found");
    }
    throw new Error(`Failed to update admission: ${error.message}`);
  }

  return data as Admission;
}

// ─── Update Admission Status ─────────────────────────────────────────────────

export async function updateAdmissionStatus(
  adminSupabase: AdminClient,
  admissionId: string,
  centreId: string,
  input: UpdateAdmissionStatusInput,
  changedBy: string | null,
): Promise<Admission> {
  const admission = await getAdmissionById(adminSupabase, admissionId);
  if (!admission) {
    throw new Error("Admission not found");
  }

  if (admission.centre_id !== centreId) {
    throw new Error("Admission does not belong to this centre");
  }

  const previousStatus = admission.status;

  if (previousStatus === input.new_status) {
    throw new Error(`Admission is already ${input.new_status}`);
  }

  const updatePayload: Record<string, unknown> = {
    status: input.new_status,
  };

  // Set admitted_by and admitted_date when approving
  if (input.new_status === "approved") {
    updatePayload.admitted_by = changedBy;
    if (!admission.admitted_date) {
      updatePayload.admitted_date = new Date().toISOString().split("T")[0];
    }
  }

  // Set denied_reason when denying
  if (input.new_status === "denied" && input.denied_reason) {
    updatePayload.denied_reason = input.denied_reason;
  }

  const { data, error } = await adminSupabase
    .from(TABLE)
    .update(updatePayload)
    .eq("id", admissionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update admission status: ${error.message}`);
  }

  // Record status change in history
  await recordAdmissionHistory(
    adminSupabase,
    admissionId,
    centreId,
    previousStatus,
    input.new_status,
    changedBy,
    input.reason ?? null,
  );

  return data as Admission;
}

// ─── Record Admission History ────────────────────────────────────────────────

async function recordAdmissionHistory(
  adminSupabase: AdminClient,
  admissionId: string,
  centreId: string,
  previousStatus: AdmissionStatus | null,
  newStatus: AdmissionStatus,
  changedBy: string | null,
  reason: string | null,
): Promise<AdmissionHistoryEntry> {
  const { data, error } = await adminSupabase
    .from(HISTORY_TABLE)
    .insert({
      admission_id: admissionId,
      centre_id: centreId,
      previous_status: previousStatus,
      new_status: newStatus,
      changed_by: changedBy,
      reason: reason,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record admission history: ${error.message}`);
  }

  return data as AdmissionHistoryEntry;
}

// ─── Get Admission History ───────────────────────────────────────────────────

export async function getAdmissionHistory(
  adminSupabase: AdminClient,
  admissionId: string,
): Promise<AdmissionHistoryEntry[]> {
  const { data, error } = await adminSupabase
    .from(HISTORY_TABLE)
    .select("*")
    .eq("admission_id", admissionId)
    .order("changed_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get admission history: ${error.message}`);
  }

  return (data ?? []) as AdmissionHistoryEntry[];
}
