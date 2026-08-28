import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Visit,
  CreateVisitInput,
  UpdateVisitInput,
  UpdateVisitStatusInput,
  CheckInInput,
  CheckOutInput,
  VisitOutcomeInput,
  VisitSearchFilters,
  VisitStatusHistory,
  VisitRestriction,
  CreateRestrictionInput,
  UpdateRestrictionInput,
  RestrictionSearchFilters,
  ContactAttempt,
  CreateContactAttemptInput,
  ContactAttemptSearchFilters,
} from "@/types/visit";
import { isValidVisitStatusTransition } from "@/types/visit";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

// ─── Generate Visit Reference ───────────────────────────────

export async function generateVisitReference(
  adminSupabase: AdminClient,
  centreId: string,
): Promise<string> {
  const { data, error } = await adminSupabase.rpc("generate_visit_reference", {
    p_centre_id: centreId,
  });

  if (error) {
    throw new Error(`Failed to generate visit reference: ${error.message}`);
  }

  return data as string;
}

// ─── List Visits ────────────────────────────────────────────

export async function listVisits(
  adminSupabase: AdminClient,
  filters: VisitSearchFilters,
): Promise<{ data: Visit[]; count: number }> {
  let query = adminSupabase
    .from("visits")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("scheduled_date", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.visit_type) {
    query = query.eq("visit_type", filters.visit_type);
  }
  if (filters.child_id) {
    query = query.eq("child_id", filters.child_id);
  }
  if (filters.guardian_id) {
    query = query.eq("guardian_id", filters.guardian_id);
  }
  if (filters.date_from) {
    query = query.gte("scheduled_date", filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte("scheduled_date", filters.date_to);
  }
  if (filters.upcoming) {
    const today = new Date().toISOString().split("T")[0];
    query = query.gte("scheduled_date", today);
    query = query.in("status", ["approved", "scheduled", "checked_in"]);
  }
  if (filters.search) {
    const term = filters.search.trim();
    query = query.or(
      `reference_number.ilike.%${term}%,purpose.ilike.%${term}%,location.ilike.%${term}%`,
    );
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list visits: ${error.message}`);
  }

  return { data: (data ?? []) as Visit[], count: count ?? 0 };
}

// ─── Get Visit By ID ────────────────────────────────────────

export async function getVisitById(
  adminSupabase: AdminClient,
  id: string,
): Promise<Visit | null> {
  const { data, error } = await adminSupabase
    .from("visits")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get visit: ${error.message}`);
  }

  return data as Visit;
}

// ─── Create Visit ───────────────────────────────────────────

export async function createVisit(
  adminSupabase: AdminClient,
  input: CreateVisitInput,
  userId: string,
): Promise<Visit> {
  const referenceNumber = await generateVisitReference(adminSupabase, input.centre_id);

  const payload = {
    centre_id: input.centre_id,
    reference_number: referenceNumber,
    child_id: input.child_id,
    guardian_id: input.guardian_id,
    visit_type: input.visit_type ?? ("in_person" as const),
    status: "requested" as const,
    scheduled_date: input.scheduled_date,
    scheduled_start_time: input.scheduled_start_time ?? null,
    scheduled_end_time: input.scheduled_end_time ?? null,
    location: input.location ?? null,
    purpose: input.purpose,
    notes: input.notes ?? null,
    created_by: userId,
  };

  const { data, error } = await adminSupabase
    .from("visits")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") {
      throw new Error("Invalid child, guardian, or centre reference");
    }
    throw new Error(`Failed to create visit: ${error.message}`);
  }

  return data as Visit;
}

// ─── Update Visit ───────────────────────────────────────────

export async function updateVisit(
  adminSupabase: AdminClient,
  id: string,
  input: UpdateVisitInput,
): Promise<Visit> {
  const payload: Record<string, unknown> = {};

  if (input.visit_type !== undefined) payload.visit_type = input.visit_type;
  if (input.scheduled_date !== undefined) payload.scheduled_date = input.scheduled_date;
  if (input.scheduled_start_time !== undefined) payload.scheduled_start_time = input.scheduled_start_time;
  if (input.scheduled_end_time !== undefined) payload.scheduled_end_time = input.scheduled_end_time;
  if (input.location !== undefined) payload.location = input.location;
  if (input.purpose !== undefined) payload.purpose = input.purpose;
  if (input.notes !== undefined) payload.notes = input.notes;

  if (Object.keys(payload).length === 0) {
    throw new Error("No fields to update");
  }

  const { data, error } = await adminSupabase
    .from("visits")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Visit not found");
    }
    throw new Error(`Failed to update visit: ${error.message}`);
  }

  return data as Visit;
}

// ─── Update Visit Status ────────────────────────────────────

export async function updateVisitStatus(
  adminSupabase: AdminClient,
  visitId: string,
  centreId: string,
  input: UpdateVisitStatusInput,
  userId: string,
): Promise<Visit> {
  const visit = await getVisitById(adminSupabase, visitId);
  if (!visit) {
    throw new Error("Visit not found");
  }

  if (visit.centre_id !== centreId) {
    throw new Error("Visit does not belong to this centre");
  }

  if (visit.status === input.new_status) {
    throw new Error(`Visit is already ${input.new_status}`);
  }

  if (!isValidVisitStatusTransition(visit.status, input.new_status)) {
    throw new Error(
      `Invalid status transition from ${visit.status} to ${input.new_status}`,
    );
  }

  const updatePayload: Record<string, unknown> = { status: input.new_status };

  if (input.new_status === "approved") {
    updatePayload.approved_by = userId;
    updatePayload.approved_at = new Date().toISOString();
  }
  if (input.new_status === "cancelled") {
    updatePayload.cancelled_by = userId;
    updatePayload.cancelled_at = new Date().toISOString();
    updatePayload.cancellation_reason = input.reason ?? null;
  }
  if (input.new_status === "rejected") {
    updatePayload.rejected_by = userId;
    updatePayload.rejected_at = new Date().toISOString();
    updatePayload.rejection_reason = input.reason ?? null;
  }

  const { data, error } = await adminSupabase
    .from("visits")
    .update(updatePayload)
    .eq("id", visitId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update visit status: ${error.message}`);
  }

  // Record status history
  await adminSupabase.from("visit_status_history").insert({
    visit_id: visitId,
    centre_id: centreId,
    previous_status: visit.status,
    new_status: input.new_status,
    changed_by: userId,
    reason: input.reason ?? null,
  });

  return data as Visit;
}

// ─── Get Visit Status History ───────────────────────────────

export async function getVisitStatusHistory(
  adminSupabase: AdminClient,
  visitId: string,
): Promise<VisitStatusHistory[]> {
  const { data, error } = await adminSupabase
    .from("visit_status_history")
    .select("*")
    .eq("visit_id", visitId)
    .order("changed_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get visit status history: ${error.message}`);
  }

  return (data ?? []) as VisitStatusHistory[];
}

// ─── Check In ───────────────────────────────────────────────

export async function checkInVisit(
  adminSupabase: AdminClient,
  visitId: string,
  centreId: string,
  userId: string,
  input: CheckInInput,
): Promise<Visit> {
  const visit = await getVisitById(adminSupabase, visitId);
  if (!visit) {
    throw new Error("Visit not found");
  }

  if (visit.centre_id !== centreId) {
    throw new Error("Visit does not belong to this centre");
  }

  if (visit.status !== "approved" && visit.status !== "scheduled") {
    throw new Error(`Visit cannot be checked in from status: ${visit.status}`);
  }

  const { data, error } = await adminSupabase
    .from("visits")
    .update({
      status: "checked_in",
      actual_check_in_time: new Date().toISOString(),
      checked_in_by: userId,
      notes: input.notes
        ? (visit.notes ? `${visit.notes}\n\nCheck-in: ${input.notes}` : input.notes)
        : visit.notes,
    })
    .eq("id", visitId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to check in visit: ${error.message}`);
  }

  // Record status history
  await adminSupabase.from("visit_status_history").insert({
    visit_id: visitId,
    centre_id: centreId,
    previous_status: visit.status,
    new_status: "checked_in",
    changed_by: userId,
    reason: input.notes ?? null,
  });

  return data as Visit;
}

// ─── Check Out ──────────────────────────────────────────────

export async function checkOutVisit(
  adminSupabase: AdminClient,
  visitId: string,
  centreId: string,
  userId: string,
  input: CheckOutInput,
): Promise<Visit> {
  const visit = await getVisitById(adminSupabase, visitId);
  if (!visit) {
    throw new Error("Visit not found");
  }

  if (visit.centre_id !== centreId) {
    throw new Error("Visit does not belong to this centre");
  }

  if (visit.status !== "checked_in") {
    throw new Error(`Visit cannot be checked out from status: ${visit.status}`);
  }

  const updatePayload: Record<string, unknown> = {
    actual_check_out_time: new Date().toISOString(),
    checked_out_by: userId,
  };

  if (input.notes) {
    updatePayload.notes = visit.notes
      ? `${visit.notes}\n\nCheck-out: ${input.notes}`
      : input.notes;
  }

  const { data, error } = await adminSupabase
    .from("visits")
    .update(updatePayload)
    .eq("id", visitId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to check out visit: ${error.message}`);
  }

  return data as Visit;
}

// ─── Complete Visit ─────────────────────────────────────────

export async function completeVisit(
  adminSupabase: AdminClient,
  visitId: string,
  centreId: string,
  userId: string,
  outcomeInput?: VisitOutcomeInput,
): Promise<Visit> {
  const visit = await getVisitById(adminSupabase, visitId);
  if (!visit) {
    throw new Error("Visit not found");
  }

  if (visit.centre_id !== centreId) {
    throw new Error("Visit does not belong to this centre");
  }

  if (visit.status !== "checked_in") {
    throw new Error(`Visit cannot be completed from status: ${visit.status}`);
  }

  const updatePayload: Record<string, unknown> = {
    status: "completed",
  };

  if (outcomeInput) {
    updatePayload.outcome = outcomeInput.outcome;
    updatePayload.outcome_notes = outcomeInput.outcome_notes ?? null;
    updatePayload.child_response = outcomeInput.child_response ?? null;
    updatePayload.family_response = outcomeInput.family_response ?? null;
    updatePayload.follow_up_required = outcomeInput.follow_up_required ?? false;
    updatePayload.follow_up_date = outcomeInput.follow_up_date ?? null;
    updatePayload.follow_up_staff_id = outcomeInput.follow_up_staff_id ?? null;
  }

  const { data, error } = await adminSupabase
    .from("visits")
    .update(updatePayload)
    .eq("id", visitId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to complete visit: ${error.message}`);
  }

  // Record status history
  await adminSupabase.from("visit_status_history").insert({
    visit_id: visitId,
    centre_id: centreId,
    previous_status: visit.status,
    new_status: "completed",
    changed_by: userId,
  });

  return data as Visit;
}

// ─── Visit Restrictions ─────────────────────────────────────

export async function listVisitRestrictions(
  adminSupabase: AdminClient,
  filters: RestrictionSearchFilters,
): Promise<{ data: VisitRestriction[]; count: number }> {
  let query = adminSupabase
    .from("visit_restrictions")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("created_at", { ascending: false });

  if (filters.child_id) {
    query = query.eq("child_id", filters.child_id);
  }
  if (filters.guardian_id) {
    query = query.eq("guardian_id", filters.guardian_id);
  }
  if (filters.is_active !== undefined) {
    query = query.eq("is_active", filters.is_active);
  }
  if (filters.restriction_type) {
    query = query.eq("restriction_type", filters.restriction_type);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list visit restrictions: ${error.message}`);
  }

  return { data: (data ?? []) as VisitRestriction[], count: count ?? 0 };
}

export async function getVisitRestrictionById(
  adminSupabase: AdminClient,
  id: string,
): Promise<VisitRestriction | null> {
  const { data, error } = await adminSupabase
    .from("visit_restrictions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get visit restriction: ${error.message}`);
  }

  return data as VisitRestriction;
}

export async function createVisitRestriction(
  adminSupabase: AdminClient,
  input: CreateRestrictionInput,
  userId: string,
): Promise<VisitRestriction> {
  const payload = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    guardian_id: input.guardian_id,
    restriction_type: input.restriction_type,
    reason: input.reason,
    source_authority: input.source_authority ?? null,
    start_date: input.start_date || new Date().toISOString().split("T")[0],
    end_date: input.end_date ?? null,
    created_by: userId,
  };

  const { data, error } = await adminSupabase
    .from("visit_restrictions")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") {
      throw new Error("Invalid child, guardian, or centre reference");
    }
    throw new Error(`Failed to create visit restriction: ${error.message}`);
  }

  return data as VisitRestriction;
}

export async function updateVisitRestriction(
  adminSupabase: AdminClient,
  id: string,
  input: UpdateRestrictionInput,
): Promise<VisitRestriction> {
  const payload: Record<string, unknown> = {};

  if (input.restriction_type !== undefined) payload.restriction_type = input.restriction_type;
  if (input.reason !== undefined) payload.reason = input.reason;
  if (input.source_authority !== undefined) payload.source_authority = input.source_authority;
  if (input.end_date !== undefined) payload.end_date = input.end_date;
  if (input.is_active !== undefined) payload.is_active = input.is_active;

  if (Object.keys(payload).length === 0) {
    throw new Error("No fields to update");
  }

  const { data, error } = await adminSupabase
    .from("visit_restrictions")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Visit restriction not found");
    }
    throw new Error(`Failed to update visit restriction: ${error.message}`);
  }

  return data as VisitRestriction;
}

// ─── Check Active Restrictions ──────────────────────────────

export async function hasActiveRestrictions(
  adminSupabase: AdminClient,
  centreId: string,
  childId: string,
  guardianId: string,
): Promise<{ restricted: boolean; restrictions: VisitRestriction[] }> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await adminSupabase
    .from("visit_restrictions")
    .select("*")
    .eq("centre_id", centreId)
    .eq("child_id", childId)
    .eq("guardian_id", guardianId)
    .eq("is_active", true)
    .or(`end_date.is.null,end_date.gte.${today}`);

  if (error) {
    throw new Error(`Failed to check restrictions: ${error.message}`);
  }

  const restrictions = (data ?? []) as VisitRestriction[];
  return {
    restricted: restrictions.length > 0,
    restrictions,
  };
}

// ─── Contact Attempts ───────────────────────────────────────

export async function listContactAttempts(
  adminSupabase: AdminClient,
  filters: ContactAttemptSearchFilters,
): Promise<{ data: ContactAttempt[]; count: number }> {
  let query = adminSupabase
    .from("contact_attempts")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("attempted_at", { ascending: false });

  if (filters.child_id) {
    query = query.eq("child_id", filters.child_id);
  }
  if (filters.guardian_id) {
    query = query.eq("guardian_id", filters.guardian_id);
  }
  if (filters.contact_type) {
    query = query.eq("contact_type", filters.contact_type);
  }
  if (filters.date_from) {
    query = query.gte("attempted_at", filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte("attempted_at", filters.date_to);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list contact attempts: ${error.message}`);
  }

  return { data: (data ?? []) as ContactAttempt[], count: count ?? 0 };
}

export async function createContactAttempt(
  adminSupabase: AdminClient,
  input: CreateContactAttemptInput,
): Promise<ContactAttempt> {
  const payload = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    guardian_id: input.guardian_id,
    contact_type: input.contact_type,
    result: input.result,
    attempted_at: input.attempted_at || new Date().toISOString(),
    reason_unsuccessful: input.reason_unsuccessful ?? null,
    notes: input.notes ?? null,
    staff_member_id: input.staff_member_id,
  };

  const { data, error } = await adminSupabase
    .from("contact_attempts")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") {
      throw new Error("Invalid child, guardian, or centre reference");
    }
    throw new Error(`Failed to create contact attempt: ${error.message}`);
  }

  return data as ContactAttempt;
}
