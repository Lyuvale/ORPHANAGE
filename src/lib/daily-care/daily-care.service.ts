import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DailyCareRecord,
  CreateDailyCareInput,
  DailyCareSearchFilters,
  MealRecord,
  CreateMealInput,
  MealSearchFilters,
  DailyNote,
  CreateDailyNoteInput,
  AmendDailyNoteInput,
  DailyNoteSearchFilters,
  CareFollowup,
  CreateFollowupInput,
  UpdateFollowupInput,
  FollowupSearchFilters,
} from "@/types/daily-care";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

// ─── List Daily Care Records ────────────────────────────────

export async function listDailyCareRecords(
  adminSupabase: AdminClient,
  filters: DailyCareSearchFilters,
): Promise<{ data: DailyCareRecord[]; count: number }> {
  let query = adminSupabase
    .from("daily_care_records")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("created_at", { ascending: false });

  if (filters.child_id) {
    query = query.eq("child_id", filters.child_id);
  }
  if (filters.child_ids) {
    if (filters.child_ids.length === 0) return { data: [], count: 0 };
    query = query.in("child_id", filters.child_ids);
  }
  if (filters.care_date) {
    query = query.eq("care_date", filters.care_date);
  }
  if (filters.activity_type) {
    query = query.eq("activity_type", filters.activity_type);
  }
  if (filters.date_from) {
    query = query.gte("care_date", filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte("care_date", filters.date_to);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list daily care records: ${error.message}`);
  }

  return { data: (data ?? []) as DailyCareRecord[], count: count ?? 0 };
}

// ─── Create Daily Care Record ───────────────────────────────

export async function createDailyCareRecord(
  adminSupabase: AdminClient,
  input: CreateDailyCareInput,
  userId: string,
): Promise<DailyCareRecord> {
  const payload = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    care_date: input.care_date,
    activity_type: input.activity_type,
    description: input.description ?? null,
    time_of_day: input.time_of_day ?? null,
    staff_member_id: userId,
    notes: input.notes ?? null,
  };

  const { data, error } = await adminSupabase
    .from("daily_care_records")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") {
      throw new Error("Invalid child or centre reference");
    }
    throw new Error(`Failed to create daily care record: ${error.message}`);
  }

  return data as DailyCareRecord;
}

// ─── List Meal Records ──────────────────────────────────────

export async function listMealRecords(
  adminSupabase: AdminClient,
  filters: MealSearchFilters,
): Promise<{ data: MealRecord[]; count: number }> {
  let query = adminSupabase
    .from("meal_records")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("created_at", { ascending: false });

  if (filters.child_id) {
    query = query.eq("child_id", filters.child_id);
  }
  if (filters.child_ids) {
    if (filters.child_ids.length === 0) return { data: [], count: 0 };
    query = query.in("child_id", filters.child_ids);
  }
  if (filters.meal_date) {
    query = query.eq("meal_date", filters.meal_date);
  }
  if (filters.meal_type) {
    query = query.eq("meal_type", filters.meal_type);
  }
  if (filters.date_from) {
    query = query.gte("meal_date", filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte("meal_date", filters.date_to);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list meal records: ${error.message}`);
  }

  return { data: (data ?? []) as MealRecord[], count: count ?? 0 };
}

// ─── Create Meal Record ─────────────────────────────────────

export async function createMealRecord(
  adminSupabase: AdminClient,
  input: CreateMealInput,
  userId: string,
): Promise<MealRecord> {
  const payload = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    meal_date: input.meal_date,
    meal_type: input.meal_type,
    provided: input.provided ?? true,
    time_of_day: input.time_of_day ?? null,
    notes: input.notes ?? null,
    recorded_by: userId,
  };

  const { data, error } = await adminSupabase
    .from("meal_records")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") {
      throw new Error("Invalid child or centre reference");
    }
    throw new Error(`Failed to create meal record: ${error.message}`);
  }

  return data as MealRecord;
}

// ─── List Daily Notes ───────────────────────────────────────

export async function listDailyNotes(
  adminSupabase: AdminClient,
  filters: DailyNoteSearchFilters,
): Promise<{ data: DailyNote[]; count: number }> {
  let query = adminSupabase
    .from("daily_notes")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("created_at", { ascending: false });

  if (filters.child_id) {
    query = query.eq("child_id", filters.child_id);
  }
  if (filters.child_ids) {
    if (filters.child_ids.length === 0) return { data: [], count: 0 };
    query = query.in("child_id", filters.child_ids);
  }
  if (filters.note_date) {
    query = query.eq("note_date", filters.note_date);
  }
  if (filters.note_type) {
    query = query.eq("note_type", filters.note_type);
  }
  if (filters.date_from) {
    query = query.gte("note_date", filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte("note_date", filters.date_to);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list daily notes: ${error.message}`);
  }

  return { data: (data ?? []) as DailyNote[], count: count ?? 0 };
}

// ─── Get Daily Note By ID ───────────────────────────────────

export async function getDailyNoteById(
  adminSupabase: AdminClient,
  id: string,
): Promise<DailyNote | null> {
  const { data, error } = await adminSupabase
    .from("daily_notes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get daily note: ${error.message}`);
  }

  return data as DailyNote;
}

// ─── Create Daily Note ──────────────────────────────────────

export async function createDailyNote(
  adminSupabase: AdminClient,
  input: CreateDailyNoteInput,
  userId: string,
): Promise<DailyNote> {
  if (input.parent_note_id) {
    const parentNote = await getDailyNoteById(adminSupabase, input.parent_note_id);
    if (!parentNote) {
      throw new Error("Parent note not found");
    }
    if (parentNote.child_id !== input.child_id) {
      throw new Error("Parent note does not belong to this child");
    }
  }

  const payload = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    note_date: input.note_date,
    note_type: input.note_type ?? "general",
    content: input.content,
    author_id: userId,
    author_name: input.author_name ?? null,
    is_pinned: input.is_pinned ?? false,
    version: 1,
    parent_note_id: input.parent_note_id ?? null,
  };

  const { data, error } = await adminSupabase
    .from("daily_notes")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") {
      throw new Error("Invalid child or centre reference");
    }
    throw new Error(`Failed to create daily note: ${error.message}`);
  }

  return data as DailyNote;
}

// ─── Amend Daily Note ───────────────────────────────────────

export async function amendDailyNote(
  adminSupabase: AdminClient,
  noteId: string,
  input: AmendDailyNoteInput,
  userId: string,
): Promise<DailyNote> {
  const existing = await getDailyNoteById(adminSupabase, noteId);
  if (!existing) {
    throw new Error("Daily note not found");
  }

  // Create amended version as new note (append-only)
  const payload = {
    centre_id: existing.centre_id,
    child_id: existing.child_id,
    note_date: existing.note_date,
    note_type: existing.note_type,
    content: input.content,
    author_id: userId,
    author_name: existing.author_name,
    is_pinned: existing.is_pinned,
    version: existing.version + 1,
    parent_note_id: noteId,
    is_amended: true,
    amended_by: userId,
    amendment_reason: input.amendment_reason,
  };

  const { data, error } = await adminSupabase
    .from("daily_notes")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to amend daily note: ${error.message}`);
  }

  // Mark original as amended
  await adminSupabase
    .from("daily_notes")
    .update({ is_amended: true, amended_by: userId, amended_at: new Date().toISOString() })
    .eq("id", noteId);

  return data as DailyNote;
}

// ─── List Follow-Ups ────────────────────────────────────────

export async function listFollowups(
  adminSupabase: AdminClient,
  filters: FollowupSearchFilters,
): Promise<{ data: CareFollowup[]; count: number }> {
  let query = adminSupabase
    .from("care_followups")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("created_at", { ascending: false });

  if (filters.child_id) {
    query = query.eq("child_id", filters.child_id);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.responsible_user_id) {
    query = query.eq("responsible_user_id", filters.responsible_user_id);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list follow-ups: ${error.message}`);
  }

  return { data: (data ?? []) as CareFollowup[], count: count ?? 0 };
}

// ─── Get Follow-Up By ID ────────────────────────────────────

export async function getFollowupById(
  adminSupabase: AdminClient,
  id: string,
): Promise<CareFollowup | null> {
  const { data, error } = await adminSupabase
    .from("care_followups")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get follow-up: ${error.message}`);
  }

  return data as CareFollowup;
}

// ─── Create Follow-Up ───────────────────────────────────────

export async function createFollowup(
  adminSupabase: AdminClient,
  input: CreateFollowupInput,
  userId: string,
): Promise<CareFollowup> {
  const payload = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    source_note_id: input.source_note_id ?? null,
    source_care_id: input.source_care_id ?? null,
    title: input.title,
    description: input.description ?? null,
    responsible_user_id: input.responsible_user_id ?? null,
    due_date: input.due_date ?? null,
    created_by: userId,
  };

  const { data, error } = await adminSupabase
    .from("care_followups")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") {
      throw new Error("Invalid child, centre, or source reference");
    }
    throw new Error(`Failed to create follow-up: ${error.message}`);
  }

  return data as CareFollowup;
}

// ─── Update Follow-Up ───────────────────────────────────────

export async function updateFollowup(
  adminSupabase: AdminClient,
  id: string,
  input: UpdateFollowupInput,
): Promise<CareFollowup> {
  const existing = await getFollowupById(adminSupabase, id);
  if (!existing) {
    throw new Error("Follow-up not found");
  }

  const payload: Record<string, unknown> = {};

  if (input.status !== undefined) payload.status = input.status;
  if (input.resolution_notes !== undefined) payload.resolution_notes = input.resolution_notes;
  if (input.due_date !== undefined) payload.due_date = input.due_date;
  if (input.responsible_user_id !== undefined) payload.responsible_user_id = input.responsible_user_id;

  if (input.status === "completed") {
    payload.resolved_at = new Date().toISOString();
  }

  if (Object.keys(payload).length === 0) {
    throw new Error("No fields to update");
  }

  const { data, error } = await adminSupabase
    .from("care_followups")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Follow-up not found");
    }
    throw new Error(`Failed to update follow-up: ${error.message}`);
  }

  return data as CareFollowup;
}
