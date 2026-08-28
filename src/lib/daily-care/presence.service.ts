import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ChildPresence,
  CreatePresenceInput,
  UpdatePresenceInput,
  PresenceCheckInInput,
  PresenceCheckOutInput,
  OffSiteInput,
  PresenceSearchFilters,
} from "@/types/presence";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

// ─── List Presence Records ──────────────────────────────────

export async function listPresenceRecords(
  adminSupabase: AdminClient,
  filters: PresenceSearchFilters,
): Promise<{ data: ChildPresence[]; count: number }> {
  let query = adminSupabase
    .from("child_presence")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("presence_date", { ascending: false });

  if (filters.child_id) {
    query = query.eq("child_id", filters.child_id);
  }
  if (filters.presence_date) {
    query = query.eq("presence_date", filters.presence_date);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.date_from) {
    query = query.gte("presence_date", filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte("presence_date", filters.date_to);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list presence records: ${error.message}`);
  }

  return { data: (data ?? []) as ChildPresence[], count: count ?? 0 };
}

// ─── Get Presence By ID ─────────────────────────────────────

export async function getPresenceById(
  adminSupabase: AdminClient,
  id: string,
): Promise<ChildPresence | null> {
  const { data, error } = await adminSupabase
    .from("child_presence")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get presence record: ${error.message}`);
  }

  return data as ChildPresence;
}

// ─── Get Presence By Child And Date ─────────────────────────

export async function getPresenceByChildAndDate(
  adminSupabase: AdminClient,
  centreId: string,
  childId: string,
  presenceDate: string,
): Promise<ChildPresence | null> {
  const { data, error } = await adminSupabase
    .from("child_presence")
    .select("*")
    .eq("centre_id", centreId)
    .eq("child_id", childId)
    .eq("presence_date", presenceDate)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get presence record: ${error.message}`);
  }

  return data as ChildPresence;
}

// ─── Create Presence Record ─────────────────────────────────

export async function createPresenceRecord(
  adminSupabase: AdminClient,
  input: CreatePresenceInput,
  userId: string,
): Promise<ChildPresence> {
  const existing = await getPresenceByChildAndDate(
    adminSupabase,
    input.centre_id,
    input.child_id,
    input.presence_date,
  );

  if (existing) {
    throw new Error("Presence record already exists for this child on this date");
  }

  const payload: Record<string, unknown> = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    presence_date: input.presence_date,
    status: input.status ?? ("present" as const),
    notes: input.notes ?? null,
    check_in_by: userId,
  };

  if ((input.status ?? "present") === "present") {
    payload["check_in_time"] = new Date().toISOString();
  }

  const { data, error } = await adminSupabase
    .from("child_presence")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Presence record already exists for this child on this date");
    }
    if (error.code === "23503") {
      throw new Error("Invalid child or centre reference");
    }
    throw new Error(`Failed to create presence record: ${error.message}`);
  }

  return data as ChildPresence;
}

// ─── Update Presence Record ─────────────────────────────────

export async function updatePresenceRecord(
  adminSupabase: AdminClient,
  id: string,
  input: UpdatePresenceInput,
): Promise<ChildPresence> {
  const payload: Record<string, unknown> = {};

  if (input.status !== undefined) payload.status = input.status;
  if (input.absence_reason !== undefined) payload.absence_reason = input.absence_reason;
  if (input.notes !== undefined) payload.notes = input.notes;

  if (Object.keys(payload).length === 0) {
    throw new Error("No fields to update");
  }

  const { data, error } = await adminSupabase
    .from("child_presence")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Presence record not found");
    }
    throw new Error(`Failed to update presence record: ${error.message}`);
  }

  return data as ChildPresence;
}

// ─── Check-In Child ─────────────────────────────────────────

export async function checkInChild(
  adminSupabase: AdminClient,
  centreId: string,
  childId: string,
  presenceDate: string,
  userId: string,
  input: PresenceCheckInInput,
): Promise<ChildPresence> {
  const existing = await getPresenceByChildAndDate(
    adminSupabase,
    centreId,
    childId,
    presenceDate,
  );

  if (existing) {
    throw new Error("Presence record already exists for this child on this date. Use update instead.");
  }

  const payload = {
    centre_id: centreId,
    child_id: childId,
    presence_date: presenceDate,
    status: "present" as const,
    check_in_time: new Date().toISOString(),
    check_in_by: userId,
    notes: input.notes ?? null,
  };

  const { data, error } = await adminSupabase
    .from("child_presence")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Presence record already exists for this child on this date");
    }
    throw new Error(`Failed to check in child: ${error.message}`);
  }

  return data as ChildPresence;
}

// ─── Check-Out Child ────────────────────────────────────────

export async function checkOutChild(
  adminSupabase: AdminClient,
  presenceId: string,
  userId: string,
  input: PresenceCheckOutInput,
): Promise<ChildPresence> {
  const existing = await getPresenceById(adminSupabase, presenceId);
  if (!existing) {
    throw new Error("Presence record not found");
  }

  if (existing.check_out_time) {
    throw new Error("Child is already checked out");
  }

  const updatePayload: Record<string, unknown> = {
    check_out_time: new Date().toISOString(),
    check_out_by: userId,
  };

  if (input.notes) {
    updatePayload.notes = existing.notes
      ? `${existing.notes}\n\nCheck-out: ${input.notes}`
      : input.notes;
  }

  const { data, error } = await adminSupabase
    .from("child_presence")
    .update(updatePayload)
    .eq("id", presenceId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to check out child: ${error.message}`);
  }

  return data as ChildPresence;
}

// ─── Record Off-Site ────────────────────────────────────────

export async function recordOffSite(
  adminSupabase: AdminClient,
  presenceId: string,
  input: OffSiteInput,
): Promise<ChildPresence> {
  const existing = await getPresenceById(adminSupabase, presenceId);
  if (!existing) {
    throw new Error("Presence record not found");
  }

  const updatePayload: Record<string, unknown> = {
    status: "off_site",
    off_site_reason: input.off_site_reason,
    off_site_destination: input.off_site_destination ?? null,
    off_site_expected_return: input.off_site_expected_return ?? null,
    authorised_by: input.authorised_by ?? null,
    visit_id: input.visit_id ?? null,
  };

  const { data, error } = await adminSupabase
    .from("child_presence")
    .update(updatePayload)
    .eq("id", presenceId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record off-site status: ${error.message}`);
  }

  return data as ChildPresence;
}

// ─── Get Daily Presence Summary ─────────────────────────────

export async function getDailyPresenceSummary(
  adminSupabase: AdminClient,
  centreId: string,
  presenceDate: string,
): Promise<{
  total: number;
  present: ChildPresence[];
  absent: ChildPresence[];
  off_site: ChildPresence[];
  on_leave: ChildPresence[];
    not_recorded: { child_id: string; first_name: string; last_name: string; reference_number: string }[];
}> {
  const { data: presenceData, error: presenceError } = await adminSupabase
    .from("child_presence")
    .select("*")
    .eq("centre_id", centreId)
    .eq("presence_date", presenceDate);

  if (presenceError) {
    throw new Error(`Failed to get presence summary: ${presenceError.message}`);
  }

  const records = (presenceData ?? []) as ChildPresence[];

  // Get active children in this centre
  const { data: activeChildren, error: childrenError } = await adminSupabase
    .from("children")
    .select("id, first_name, last_name, reference_number")
    .eq("centre_id", centreId)
    .eq("status", "active");

  if (childrenError) {
    throw new Error(`Failed to get active children: ${childrenError.message}`);
  }

  const children = (activeChildren ?? []) as { id: string; first_name: string; last_name: string; reference_number: string }[];
  const recordedChildIds = new Set(records.map((r) => r.child_id));

  return {
    total: children.length,
    present: records.filter((r) => r.status === "present"),
    absent: records.filter((r) => r.status === "absent"),
    off_site: records.filter((r) => r.status === "off_site"),
    on_leave: records.filter((r) => r.status === "on_leave"),
    not_recorded: children
      .filter((c) => !recordedChildIds.has(c.id))
      .map((c) => ({
        child_id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        reference_number: c.reference_number,
      })),
  };
}
