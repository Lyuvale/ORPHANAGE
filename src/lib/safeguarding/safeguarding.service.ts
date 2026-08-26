import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SafeguardingConcern,
  CreateSafeguardingConcernInput,
  UpdateSafeguardingConcernInput,
  UpdateSafeguardingStatusInput,
  SafeguardingSearchFilters,
  SafeguardingStatusHistory,
  SafeguardingAction,
  CreateSafeguardingActionInput,
  SafeguardingActionSearchFilters,
  SafeguardingEscalation,
  CreateEscalationInput,
  EscalationStatus,
  EscalationSearchFilters,
  SafeguardingDocument,
} from "@/types/safeguarding";
import { isValidSafeguardingStatusTransition, isValidEscalationStatusTransition } from "@/types/safeguarding";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

// ─── List Safeguarding Concerns ──────────────────────────────

export async function listSafeguardingConcerns(
  adminSupabase: AdminClient,
  filters: SafeguardingSearchFilters,
): Promise<{ data: SafeguardingConcern[]; count: number }> {
  let query = adminSupabase
    .from("safeguarding_concerns")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.severity) {
    query = query.eq("severity", filters.severity);
  }
  if (filters.concern_type) {
    query = query.eq("concern_type", filters.concern_type);
  }
  if (filters.child_id) {
    query = query.eq("child_id", filters.child_id);
  }
  if (filters.case_id) {
    query = query.eq("case_id", filters.case_id);
  }
  if (filters.assigned_to) {
    query = query.eq("assigned_to", filters.assigned_to);
  }
  if (filters.search) {
    const term = filters.search.trim();
    query = query.or(
      `title.ilike.%${term}%,description.ilike.%${term}%`,
    );
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list safeguarding concerns: ${error.message}`);
  }

  return { data: (data ?? []) as SafeguardingConcern[], count: count ?? 0 };
}

// ─── Get Safeguarding Concern By ID ──────────────────────────

export async function getSafeguardingConcernById(
  adminSupabase: AdminClient,
  id: string,
): Promise<SafeguardingConcern | null> {
  const { data, error } = await adminSupabase
    .from("safeguarding_concerns")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get safeguarding concern: ${error.message}`);
  }

  return data as SafeguardingConcern;
}

// ─── Create Safeguarding Concern ─────────────────────────────

export async function createSafeguardingConcern(
  adminSupabase: AdminClient,
  input: CreateSafeguardingConcernInput,
  userId: string,
): Promise<SafeguardingConcern> {
  const payload = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    case_id: input.case_id ?? null,
    concern_type: input.concern_type,
    title: input.title,
    description: input.description,
    severity: input.severity ?? ("medium" as const),
    status: "reported" as const,
    reported_by: userId,
    assigned_to: input.assigned_to ?? null,
    location: input.location ?? null,
    witnesses: input.witnesses ?? null,
    evidence_summary: input.evidence_summary ?? null,
    action_taken: input.action_taken ?? null,
    external_referral: input.external_referral ?? false,
    external_agency: input.external_agency ?? null,
    external_reference: input.external_reference ?? null,
  };

  const { data, error } = await adminSupabase
    .from("safeguarding_concerns")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") {
      throw new Error("Invalid child or centre reference");
    }
    throw new Error(`Failed to create safeguarding concern: ${error.message}`);
  }

  return data as SafeguardingConcern;
}

// ─── Update Safeguarding Concern ─────────────────────────────

export async function updateSafeguardingConcern(
  adminSupabase: AdminClient,
  id: string,
  input: UpdateSafeguardingConcernInput,
): Promise<SafeguardingConcern> {
  const payload: Record<string, unknown> = {};

  if (input.title !== undefined) payload.title = input.title;
  if (input.description !== undefined) payload.description = input.description;
  if (input.severity !== undefined) payload.severity = input.severity;
  if (input.assigned_to !== undefined) payload.assigned_to = input.assigned_to || null;
  if (input.location !== undefined) payload.location = input.location || null;
  if (input.witnesses !== undefined) payload.witnesses = input.witnesses || null;
  if (input.evidence_summary !== undefined) payload.evidence_summary = input.evidence_summary || null;
  if (input.action_taken !== undefined) payload.action_taken = input.action_taken || null;
  if (input.external_referral !== undefined) payload.external_referral = input.external_referral;
  if (input.external_agency !== undefined) payload.external_agency = input.external_agency || null;
  if (input.external_reference !== undefined) payload.external_reference = input.external_reference || null;
  if (input.resolution_notes !== undefined) payload.resolution_notes = input.resolution_notes || null;

  if (Object.keys(payload).length === 0) {
    throw new Error("No fields to update");
  }

  const { data, error } = await adminSupabase
    .from("safeguarding_concerns")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Safeguarding concern not found");
    }
    throw new Error(`Failed to update safeguarding concern: ${error.message}`);
  }

  return data as SafeguardingConcern;
}

// ─── Update Safeguarding Status ──────────────────────────────

export async function updateSafeguardingStatus(
  adminSupabase: AdminClient,
  concernId: string,
  centreId: string,
  input: UpdateSafeguardingStatusInput,
): Promise<SafeguardingConcern> {
  const concern = await getSafeguardingConcernById(adminSupabase, concernId);
  if (!concern) {
    throw new Error("Safeguarding concern not found");
  }

  if (concern.centre_id !== centreId) {
    throw new Error("Safeguarding concern does not belong to this centre");
  }

  if (concern.status === input.new_status) {
    throw new Error(`Concern is already ${input.new_status}`);
  }

  if (!isValidSafeguardingStatusTransition(concern.status, input.new_status)) {
    throw new Error(
      `Invalid status transition from ${concern.status} to ${input.new_status}`,
    );
  }

  const updatePayload: Record<string, unknown> = { status: input.new_status };
  if (input.new_status === "resolved") {
    updatePayload.resolved_at = new Date().toISOString();
  }

  const { data, error } = await adminSupabase
    .from("safeguarding_concerns")
    .update(updatePayload)
    .eq("id", concernId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update safeguarding status: ${error.message}`);
  }

  // Record status history
  await adminSupabase.from("safeguarding_status_history").insert({
    concern_id: concernId,
    centre_id: centreId,
    previous_status: concern.status,
    new_status: input.new_status,
    reason: input.reason ?? null,
  });

  return data as SafeguardingConcern;
}

// ─── Get Safeguarding Status History ─────────────────────────

export async function getSafeguardingStatusHistory(
  adminSupabase: AdminClient,
  concernId: string,
): Promise<SafeguardingStatusHistory[]> {
  const { data, error } = await adminSupabase
    .from("safeguarding_status_history")
    .select("*")
    .eq("concern_id", concernId)
    .order("changed_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get safeguarding status history: ${error.message}`);
  }

  return (data ?? []) as SafeguardingStatusHistory[];
}

// ─── List Safeguarding Actions ───────────────────────────────

export async function listSafeguardingActions(
  adminSupabase: AdminClient,
  filters: SafeguardingActionSearchFilters,
): Promise<{ data: SafeguardingAction[]; count: number }> {
  let query = adminSupabase
    .from("safeguarding_actions")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("created_at", { ascending: false });

  if (filters.concern_id) {
    query = query.eq("concern_id", filters.concern_id);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.assigned_to) {
    query = query.eq("assigned_to", filters.assigned_to);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list safeguarding actions: ${error.message}`);
  }

  return { data: (data ?? []) as SafeguardingAction[], count: count ?? 0 };
}

// ─── Get Safeguarding Action By ID ───────────────────────────

export async function getSafeguardingActionById(
  adminSupabase: AdminClient,
  id: string,
): Promise<SafeguardingAction | null> {
  const { data, error } = await adminSupabase
    .from("safeguarding_actions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get safeguarding action: ${error.message}`);
  }

  return data as SafeguardingAction;
}

// ─── Create Safeguarding Action ──────────────────────────────

export async function createSafeguardingAction(
  adminSupabase: AdminClient,
  input: CreateSafeguardingActionInput,
  userId: string,
): Promise<SafeguardingAction> {
  const payload = {
    concern_id: input.concern_id,
    centre_id: input.centre_id,
    action_type: input.action_type,
    description: input.description,
    assigned_to: input.assigned_to ?? null,
    due_date: input.due_date ?? null,
    created_by: userId,
  };

  const { data, error } = await adminSupabase
    .from("safeguarding_actions")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") {
      throw new Error("Invalid concern reference");
    }
    throw new Error(`Failed to create safeguarding action: ${error.message}`);
  }

  return data as SafeguardingAction;
}

// ─── Update Safeguarding Action ──────────────────────────────

export async function updateSafeguardingAction(
  adminSupabase: AdminClient,
  id: string,
  input: Record<string, unknown>,
): Promise<SafeguardingAction> {
  if (Object.keys(input).length === 0) {
    throw new Error("No fields to update");
  }

  const { data, error } = await adminSupabase
    .from("safeguarding_actions")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Safeguarding action not found");
    }
    throw new Error(`Failed to update safeguarding action: ${error.message}`);
  }

  return data as SafeguardingAction;
}

// ─── List Escalations ────────────────────────────────────────

export async function listEscalations(
  adminSupabase: AdminClient,
  filters: EscalationSearchFilters,
): Promise<{ data: SafeguardingEscalation[]; count: number }> {
  let query = adminSupabase
    .from("safeguarding_escalations")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("escalated_at", { ascending: false });

  if (filters.concern_id) {
    query = query.eq("concern_id", filters.concern_id);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list escalations: ${error.message}`);
  }

  return { data: (data ?? []) as SafeguardingEscalation[], count: count ?? 0 };
}

// ─── Get Escalation By ID ────────────────────────────────────

export async function getEscalationById(
  adminSupabase: AdminClient,
  id: string,
): Promise<SafeguardingEscalation | null> {
  const { data, error } = await adminSupabase
    .from("safeguarding_escalations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get escalation: ${error.message}`);
  }

  return data as SafeguardingEscalation;
}

// ─── Create Escalation ───────────────────────────────────────

export async function createEscalation(
  adminSupabase: AdminClient,
  input: CreateEscalationInput,
  userId: string,
): Promise<SafeguardingEscalation> {
  const payload = {
    concern_id: input.concern_id,
    centre_id: input.centre_id,
    title: input.title,
    description: input.description,
    reason: input.reason,
    escalated_by: userId,
    escalated_to: input.escalated_to ?? null,
  };

  const { data, error } = await adminSupabase
    .from("safeguarding_escalations")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") {
      throw new Error("Invalid concern reference");
    }
    throw new Error(`Failed to create escalation: ${error.message}`);
  }

  return data as SafeguardingEscalation;
}

// ─── Update Escalation Status ────────────────────────────────

export async function updateEscalationStatus(
  adminSupabase: AdminClient,
  escalationId: string,
  centreId: string,
  newStatus: string,
  userId: string,
  resolutionNotes?: string,
): Promise<SafeguardingEscalation> {
  const escalation = await getEscalationById(adminSupabase, escalationId);
  if (!escalation) {
    throw new Error("Escalation not found");
  }

  if (escalation.centre_id !== centreId) {
    throw new Error("Escalation does not belong to this centre");
  }

  if (!isValidEscalationStatusTransition(escalation.status, newStatus as EscalationStatus)) {
    throw new Error(
      `Invalid status transition from ${escalation.status} to ${newStatus}`,
    );
  }

  const updatePayload: Record<string, unknown> = { status: newStatus };
  if (newStatus === "acknowledged") {
    updatePayload.acknowledged_at = new Date().toISOString();
  }
  if (newStatus === "completed") {
    updatePayload.resolved_at = new Date().toISOString();
    if (resolutionNotes) {
      updatePayload.resolution_notes = resolutionNotes;
    }
  }

  const { data, error } = await adminSupabase
    .from("safeguarding_escalations")
    .update(updatePayload)
    .eq("id", escalationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update escalation status: ${error.message}`);
  }

  return data as SafeguardingEscalation;
}

// ─── Get Safeguarding Documents ──────────────────────────────

export async function getSafeguardingDocuments(
  adminSupabase: AdminClient,
  concernId: string,
): Promise<SafeguardingDocument[]> {
  const { data, error } = await adminSupabase
    .from("safeguarding_documents")
    .select("*")
    .eq("concern_id", concernId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get safeguarding documents: ${error.message}`);
  }

  return (data ?? []) as SafeguardingDocument[];
}
