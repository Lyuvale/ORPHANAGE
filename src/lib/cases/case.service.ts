import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Case,
  CreateCaseInput,
  UpdateCaseInput,
  UpdateCaseStatusInput,
  CaseSearchFilters,
  CaseStatusHistory,
  CaseAssessment,
  CreateAssessmentInput,
  AssessmentSearchFilters,
  CasePlan,
  CreateCasePlanInput,
  CasePlanItem,
  CreateCasePlanItemInput,
  CaseNote,
  CreateCaseNoteInput,
  CaseNoteSearchFilters,
  Intervention,
  CreateInterventionInput,
  CaseDocument,
  CasePlanStatus,
} from "@/types/case";
import { isValidCaseStatusTransition, isValidCasePlanStatusTransition } from "@/types/case";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

// ─── List Cases ──────────────────────────────────────────────

export async function listCases(
  adminSupabase: AdminClient,
  filters: CaseSearchFilters,
): Promise<{ data: Case[]; count: number }> {
  let query = adminSupabase
    .from("cases")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.case_type) {
    query = query.eq("case_type", filters.case_type);
  }
  if (filters.priority) {
    query = query.eq("priority", filters.priority);
  }
  if (filters.classification) {
    query = query.eq("classification", filters.classification);
  }
  if (filters.child_id) {
    query = query.eq("child_id", filters.child_id);
  }
  if (filters.assigned_to) {
    query = query.eq("assigned_to", filters.assigned_to);
  }
  if (filters.search) {
    const term = filters.search.trim();
    query = query.or(
      `title.ilike.%${term}%,description.ilike.%${term}%,reference_number.ilike.%${term}%`,
    );
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list cases: ${error.message}`);
  }

  return { data: (data ?? []) as Case[], count: count ?? 0 };
}

// ─── Get Case By ID ──────────────────────────────────────────

export async function getCaseById(
  adminSupabase: AdminClient,
  id: string,
): Promise<Case | null> {
  const { data, error } = await adminSupabase
    .from("cases")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get case: ${error.message}`);
  }

  return data as Case;
}

// ─── Get Case By Reference ───────────────────────────────────

export async function getCaseByReference(
  adminSupabase: AdminClient,
  referenceNumber: string,
): Promise<Case | null> {
  const { data, error } = await adminSupabase
    .from("cases")
    .select("*")
    .eq("reference_number", referenceNumber)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get case: ${error.message}`);
  }

  return data as Case;
}

// ─── Generate Case Reference ─────────────────────────────────

export async function generateCaseReference(
  adminSupabase: AdminClient,
  centreId: string,
): Promise<string> {
  const { data, error } = await adminSupabase.rpc("generate_case_reference", {
    p_centre_id: centreId,
  });

  if (error) {
    throw new Error(`Failed to generate case reference: ${error.message}`);
  }

  return data as string;
}

// ─── Create Case ─────────────────────────────────────────────

export async function createCase(
  adminSupabase: AdminClient,
  input: CreateCaseInput,
  userId: string,
): Promise<Case> {
  const referenceNumber = await generateCaseReference(adminSupabase, input.centre_id);

  const payload = {
    centre_id: input.centre_id,
    reference_number: referenceNumber,
    child_id: input.child_id,
    title: input.title,
    description: input.description ?? null,
    case_type: input.case_type,
    status: "open" as const,
    priority: input.priority ?? ("medium" as const),
    classification: input.classification ?? ("standard" as const),
    assigned_to: input.assigned_to ?? null,
    opened_by: userId,
  };

  const { data, error } = await adminSupabase
    .from("cases")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") {
      throw new Error("Invalid child or centre reference");
    }
    throw new Error(`Failed to create case: ${error.message}`);
  }

  return data as Case;
}

// ─── Update Case ─────────────────────────────────────────────

export async function updateCase(
  adminSupabase: AdminClient,
  id: string,
  input: UpdateCaseInput,
): Promise<Case> {
  const payload: Record<string, unknown> = {};

  if (input.title !== undefined) payload.title = input.title;
  if (input.description !== undefined) payload.description = input.description || null;
  if (input.case_type !== undefined) payload.case_type = input.case_type;
  if (input.priority !== undefined) payload.priority = input.priority;
  if (input.classification !== undefined) payload.classification = input.classification;
  if (input.assigned_to !== undefined) payload.assigned_to = input.assigned_to || null;
  if (input.resolution_notes !== undefined) payload.resolution_notes = input.resolution_notes || null;

  if (Object.keys(payload).length === 0) {
    throw new Error("No fields to update");
  }

  const { data, error } = await adminSupabase
    .from("cases")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Case not found");
    }
    throw new Error(`Failed to update case: ${error.message}`);
  }

  return data as Case;
}

// ─── Update Case Status ──────────────────────────────────────

export async function updateCaseStatus(
  adminSupabase: AdminClient,
  caseId: string,
  centreId: string,
  input: UpdateCaseStatusInput,
): Promise<Case> {
  const caseRecord = await getCaseById(adminSupabase, caseId);
  if (!caseRecord) {
    throw new Error("Case not found");
  }

  if (caseRecord.centre_id !== centreId) {
    throw new Error("Case does not belong to this centre");
  }

  if (caseRecord.status === input.new_status) {
    throw new Error(`Case is already ${input.new_status}`);
  }

  if (!isValidCaseStatusTransition(caseRecord.status, input.new_status)) {
    throw new Error(
      `Invalid status transition from ${caseRecord.status} to ${input.new_status}`,
    );
  }

  const updatePayload: Record<string, unknown> = { status: input.new_status };
  if (input.new_status === "resolved") {
    updatePayload.resolved_at = new Date().toISOString();
  }
  if (input.new_status === "closed") {
    updatePayload.closed_at = new Date().toISOString();
  }

  const { data, error } = await adminSupabase
    .from("cases")
    .update(updatePayload)
    .eq("id", caseId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update case status: ${error.message}`);
  }

  // Record status history
  await adminSupabase.from("case_status_history").insert({
    case_id: caseId,
    centre_id: centreId,
    previous_status: caseRecord.status,
    new_status: input.new_status,
    reason: input.reason ?? null,
  });

  return data as Case;
}

// ─── Get Case Status History ─────────────────────────────────

export async function getCaseStatusHistory(
  adminSupabase: AdminClient,
  caseId: string,
): Promise<CaseStatusHistory[]> {
  const { data, error } = await adminSupabase
    .from("case_status_history")
    .select("*")
    .eq("case_id", caseId)
    .order("changed_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get case status history: ${error.message}`);
  }

  return (data ?? []) as CaseStatusHistory[];
}

// ─── List Assessments ────────────────────────────────────────

export async function listAssessments(
  adminSupabase: AdminClient,
  filters: AssessmentSearchFilters,
): Promise<{ data: CaseAssessment[]; count: number }> {
  let query = adminSupabase
    .from("case_assessments")
    .select("*", { count: "exact" })
    .eq("case_id", filters.case_id)
    .order("conducted_at", { ascending: false });

  if (filters.assessment_type) {
    query = query.eq("assessment_type", filters.assessment_type);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list assessments: ${error.message}`);
  }

  return { data: (data ?? []) as CaseAssessment[], count: count ?? 0 };
}

// ─── Get Assessment By ID ────────────────────────────────────

export async function getAssessmentById(
  adminSupabase: AdminClient,
  id: string,
): Promise<CaseAssessment | null> {
  const { data, error } = await adminSupabase
    .from("case_assessments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get assessment: ${error.message}`);
  }

  return data as CaseAssessment;
}

// ─── Create Assessment ───────────────────────────────────────

export async function createAssessment(
  adminSupabase: AdminClient,
  input: CreateAssessmentInput,
  userId: string,
): Promise<CaseAssessment> {
  const payload = {
    case_id: input.case_id,
    centre_id: input.centre_id,
    assessment_type: input.assessment_type,
    title: input.title,
    summary: input.summary ?? null,
    findings: input.findings ?? null,
    recommendations: input.recommendations ?? null,
    conducted_by: userId,
    next_review_date: input.next_review_date ?? null,
  };

  const { data, error } = await adminSupabase
    .from("case_assessments")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") {
      throw new Error("Invalid case reference");
    }
    throw new Error(`Failed to create assessment: ${error.message}`);
  }

  return data as CaseAssessment;
}

// ─── Update Assessment ───────────────────────────────────────

export async function updateAssessment(
  adminSupabase: AdminClient,
  id: string,
  input: Record<string, unknown>,
): Promise<CaseAssessment> {
  if (Object.keys(input).length === 0) {
    throw new Error("No fields to update");
  }

  const { data, error } = await adminSupabase
    .from("case_assessments")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Assessment not found");
    }
    throw new Error(`Failed to update assessment: ${error.message}`);
  }

  return data as CaseAssessment;
}

// ─── List Case Plans ─────────────────────────────────────────

export async function listCasePlans(
  adminSupabase: AdminClient,
  caseId: string,
): Promise<CasePlan[]> {
  const { data, error } = await adminSupabase
    .from("case_plans")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list case plans: ${error.message}`);
  }

  return (data ?? []) as CasePlan[];
}

// ─── Get Case Plan By ID ─────────────────────────────────────

export async function getCasePlanById(
  adminSupabase: AdminClient,
  id: string,
): Promise<CasePlan | null> {
  const { data, error } = await adminSupabase
    .from("case_plans")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get case plan: ${error.message}`);
  }

  return data as CasePlan;
}

// ─── Create Case Plan ────────────────────────────────────────

export async function createCasePlan(
  adminSupabase: AdminClient,
  input: CreateCasePlanInput,
  userId: string,
): Promise<CasePlan> {
  const payload = {
    case_id: input.case_id,
    centre_id: input.centre_id,
    title: input.title,
    description: input.description ?? null,
    start_date: input.start_date || new Date().toISOString().split("T")[0],
    end_date: input.end_date ?? null,
    review_frequency: input.review_frequency ?? null,
    next_review_date: input.next_review_date ?? null,
    created_by: userId,
  };

  const { data, error } = await adminSupabase
    .from("case_plans")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") {
      throw new Error("Invalid case reference");
    }
    throw new Error(`Failed to create case plan: ${error.message}`);
  }

  return data as CasePlan;
}

// ─── Update Case Plan ────────────────────────────────────────

export async function updateCasePlan(
  adminSupabase: AdminClient,
  id: string,
  input: Record<string, unknown>,
): Promise<CasePlan> {
  if (Object.keys(input).length === 0) {
    throw new Error("No fields to update");
  }

  const { data, error } = await adminSupabase
    .from("case_plans")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Case plan not found");
    }
    throw new Error(`Failed to update case plan: ${error.message}`);
  }

  return data as CasePlan;
}

// ─── Update Case Plan Status ─────────────────────────────────

export async function updateCasePlanStatus(
  adminSupabase: AdminClient,
  planId: string,
  centreId: string,
  newStatus: CasePlanStatus,
  userId: string,
): Promise<CasePlan> {
  const plan = await getCasePlanById(adminSupabase, planId);
  if (!plan) {
    throw new Error("Case plan not found");
  }

  if (plan.centre_id !== centreId) {
    throw new Error("Case plan does not belong to this centre");
  }

  if (!isValidCasePlanStatusTransition(plan.status, newStatus)) {
    throw new Error(
      `Invalid status transition from ${plan.status} to ${newStatus}`,
    );
  }

  const updatePayload: Record<string, unknown> = { status: newStatus };
  if (newStatus === "active") {
    updatePayload.approved_by = userId;
    updatePayload.approved_at = new Date().toISOString();
  }

  const { data, error } = await adminSupabase
    .from("case_plans")
    .update(updatePayload)
    .eq("id", planId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update case plan status: ${error.message}`);
  }

  return data as CasePlan;
}

// ─── List Case Plan Items ────────────────────────────────────

export async function listCasePlanItems(
  adminSupabase: AdminClient,
  planId: string,
): Promise<CasePlanItem[]> {
  const { data, error } = await adminSupabase
    .from("case_plan_items")
    .select("*")
    .eq("case_plan_id", planId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to list case plan items: ${error.message}`);
  }

  return (data ?? []) as CasePlanItem[];
}

// ─── Create Case Plan Item ───────────────────────────────────

export async function createCasePlanItem(
  adminSupabase: AdminClient,
  input: CreateCasePlanItemInput,
): Promise<CasePlanItem> {
  const payload = {
    case_plan_id: input.case_plan_id,
    centre_id: input.centre_id,
    objective: input.objective,
    description: input.description ?? null,
    responsible_person: input.responsible_person ?? null,
    target_date: input.target_date ?? null,
    sort_order: input.sort_order ?? 0,
  };

  const { data, error } = await adminSupabase
    .from("case_plan_items")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") {
      throw new Error("Invalid case plan reference");
    }
    throw new Error(`Failed to create case plan item: ${error.message}`);
  }

  return data as CasePlanItem;
}

// ─── Update Case Plan Item ───────────────────────────────────

export async function updateCasePlanItem(
  adminSupabase: AdminClient,
  id: string,
  input: Record<string, unknown>,
): Promise<CasePlanItem> {
  if (Object.keys(input).length === 0) {
    throw new Error("No fields to update");
  }

  const { data, error } = await adminSupabase
    .from("case_plan_items")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Case plan item not found");
    }
    throw new Error(`Failed to update case plan item: ${error.message}`);
  }

  return data as CasePlanItem;
}

// ─── List Case Notes ─────────────────────────────────────────

export async function listCaseNotes(
  adminSupabase: AdminClient,
  filters: CaseNoteSearchFilters,
): Promise<{ data: CaseNote[]; count: number }> {
  let query = adminSupabase
    .from("case_notes")
    .select("*", { count: "exact" })
    .eq("case_id", filters.case_id)
    .order("created_at", { ascending: false });

  if (filters.note_type) {
    query = query.eq("note_type", filters.note_type);
  }
  if (filters.is_pinned !== undefined) {
    query = query.eq("is_pinned", filters.is_pinned);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list case notes: ${error.message}`);
  }

  return { data: (data ?? []) as CaseNote[], count: count ?? 0 };
}

// ─── Get Case Note By ID ─────────────────────────────────────

export async function getCaseNoteById(
  adminSupabase: AdminClient,
  id: string,
): Promise<CaseNote | null> {
  const { data, error } = await adminSupabase
    .from("case_notes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get case note: ${error.message}`);
  }

  return data as CaseNote;
}

// ─── Create Case Note ────────────────────────────────────────

export async function createCaseNote(
  adminSupabase: AdminClient,
  input: CreateCaseNoteInput,
  userId: string,
): Promise<CaseNote> {
  // Check if case exists
  const caseRecord = await getCaseById(adminSupabase, input.case_id);
  if (!caseRecord) {
    throw new Error("Case not found");
  }

  if (caseRecord.centre_id !== input.centre_id) {
    throw new Error("Case does not belong to this centre");
  }

  // If replying to a parent note, verify it exists and belongs to same case
  if (input.parent_note_id) {
    const parentNote = await getCaseNoteById(adminSupabase, input.parent_note_id);
    if (!parentNote) {
      throw new Error("Parent note not found");
    }
    if (parentNote.case_id !== input.case_id) {
      throw new Error("Parent note does not belong to this case");
    }
  }

  const payload = {
    case_id: input.case_id,
    centre_id: input.centre_id,
    note_type: input.note_type ?? "general",
    content: input.content,
    author_id: userId,
    author_name: input.author_name ?? null,
    is_pinned: input.is_pinned ?? false,
    version: 1,
    parent_note_id: input.parent_note_id ?? null,
  };

  const { data, error } = await adminSupabase
    .from("case_notes")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") {
      throw new Error("Invalid case reference");
    }
    throw new Error(`Failed to create case note: ${error.message}`);
  }

  return data as CaseNote;
}

// ─── List Interventions ──────────────────────────────────────

export async function listInterventions(
  adminSupabase: AdminClient,
  caseId: string,
): Promise<Intervention[]> {
  const { data, error } = await adminSupabase
    .from("interventions")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list interventions: ${error.message}`);
  }

  return (data ?? []) as Intervention[];
}

// ─── Get Intervention By ID ──────────────────────────────────

export async function getInterventionById(
  adminSupabase: AdminClient,
  id: string,
): Promise<Intervention | null> {
  const { data, error } = await adminSupabase
    .from("interventions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get intervention: ${error.message}`);
  }

  return data as Intervention;
}

// ─── Create Intervention ─────────────────────────────────────

export async function createIntervention(
  adminSupabase: AdminClient,
  input: CreateInterventionInput,
): Promise<Intervention> {
  const payload = {
    case_id: input.case_id,
    centre_id: input.centre_id,
    case_plan_item_id: input.case_plan_item_id ?? null,
    title: input.title,
    description: input.description ?? null,
    intervention_type: input.intervention_type,
    scheduled_date: input.scheduled_date ?? null,
    conducted_by: input.conducted_by ?? null,
  };

  const { data, error } = await adminSupabase
    .from("interventions")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") {
      throw new Error("Invalid case or plan item reference");
    }
    throw new Error(`Failed to create intervention: ${error.message}`);
  }

  return data as Intervention;
}

// ─── Update Intervention ─────────────────────────────────────

export async function updateIntervention(
  adminSupabase: AdminClient,
  id: string,
  input: Record<string, unknown>,
): Promise<Intervention> {
  if (Object.keys(input).length === 0) {
    throw new Error("No fields to update");
  }

  const { data, error } = await adminSupabase
    .from("interventions")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Intervention not found");
    }
    throw new Error(`Failed to update intervention: ${error.message}`);
  }

  return data as Intervention;
}

// ─── Get Case Documents ──────────────────────────────────────

export async function getCaseDocuments(
  adminSupabase: AdminClient,
  caseId: string,
): Promise<CaseDocument[]> {
  const { data, error } = await adminSupabase
    .from("case_documents")
    .select("*")
    .eq("case_id", caseId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get case documents: ${error.message}`);
  }

  return (data ?? []) as CaseDocument[];
}
