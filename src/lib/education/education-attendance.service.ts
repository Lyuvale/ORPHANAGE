import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

export interface EducationAttendance {
  id: string;
  centre_id: string;
  child_id: string;
  attendance_date: string;
  status: string;
  arrival_time: string | null;
  departure_time: string | null;
  notes: string | null;
  recorded_by: string;
  created_at: string;
  updated_at: string;
}

export interface EducationAttendanceDetail extends EducationAttendance {
  child?: { id: string; first_name: string; last_name: string; reference_number: string };
}

export interface CreateEducationAttendanceInput {
  child_id: string;
  attendance_date: string;
  status: string;
  arrival_time?: string | null;
  departure_time?: string | null;
  notes?: string | null;
}

// ─── List attendance records ───────────────────────────────

export async function listEducationAttendance(
  admin: AdminClient,
  filters: { child_id?: string; date_from?: string; date_to?: string },
): Promise<EducationAttendanceDetail[]> {
  let query = admin
    .from("education_attendance")
    .select(`
      *,
      child:children!education_attendance_child_id_fkey (id, first_name, last_name, reference_number)
    `)
    .order("attendance_date", { ascending: false });

  if (filters.child_id) {
    query = query.eq("child_id", filters.child_id);
  }
  if (filters.date_from) {
    query = query.gte("attendance_date", filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte("attendance_date", filters.date_to);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as EducationAttendanceDetail[];
}

// ─── Get single attendance record ──────────────────────────

export async function getEducationAttendanceById(
  admin: AdminClient,
  id: string,
): Promise<EducationAttendanceDetail | null> {
  const { data, error } = await admin
    .from("education_attendance")
    .select(`
      *,
      child:children!education_attendance_child_id_fkey (id, first_name, last_name, reference_number)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as EducationAttendanceDetail | null;
}

// ─── Create attendance record ──────────────────────────────

export async function createEducationAttendance(
  admin: AdminClient,
  input: CreateEducationAttendanceInput,
  centreId: string,
  recordedBy: string,
): Promise<EducationAttendance> {
  const { data, error } = await admin
    .from("education_attendance")
    .insert({
      child_id: input.child_id,
      centre_id: centreId,
      attendance_date: input.attendance_date,
      status: input.status,
      arrival_time: input.arrival_time ?? null,
      departure_time: input.departure_time ?? null,
      notes: input.notes ?? null,
      recorded_by: recordedBy,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as EducationAttendance;
}

// ─── Update attendance record ──────────────────────────────

export async function updateEducationAttendance(
  admin: AdminClient,
  id: string,
  input: Partial<CreateEducationAttendanceInput>,
): Promise<EducationAttendance> {
  const updates: Record<string, unknown> = {};
  if (input.status !== undefined) updates.status = input.status;
  if (input.arrival_time !== undefined) updates.arrival_time = input.arrival_time;
  if (input.departure_time !== undefined) updates.departure_time = input.departure_time;
  if (input.notes !== undefined) updates.notes = input.notes;

  const { data, error } = await admin
    .from("education_attendance")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as EducationAttendance;
}

// ─── Delete attendance record ──────────────────────────────

export async function deleteEducationAttendance(
  admin: AdminClient,
  id: string,
): Promise<void> {
  const { error } = await admin
    .from("education_attendance")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}
