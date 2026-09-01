import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

export interface CaregiverAssignment {
  id: string;
  centre_id: string;
  child_id: string;
  caregiver_id: string;
  assigned_by: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaregiverAssignmentDetail extends CaregiverAssignment {
  child?: { id: string; first_name: string; last_name: string; reference_number: string };
  caregiver?: { id: string; first_name: string; last_name: string; email: string };
}

export interface CreateCaregiverAssignmentInput {
  child_id: string;
  caregiver_id: string;
  start_date?: string;
  end_date?: string | null;
  notes?: string | null;
}

// ─── List assignments for a child ──────────────────────────

export async function listChildCaregivers(
  admin: AdminClient,
  childId: string,
): Promise<CaregiverAssignmentDetail[]> {
  const { data, error } = await admin
    .from("child_caregivers")
    .select(`
      *,
      caregiver:user_profiles!child_caregivers_caregiver_id_fkey (id, first_name, last_name, email)
    `)
    .eq("child_id", childId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CaregiverAssignmentDetail[];
}

// ─── List assignments for a caregiver ──────────────────────

export async function listCaregiverChildren(
  admin: AdminClient,
  caregiverProfileId: string,
): Promise<CaregiverAssignmentDetail[]> {
  const { data, error } = await admin
    .from("child_caregivers")
    .select(`
      *,
      child:children!child_caregivers_child_id_fkey (id, first_name, last_name, reference_number)
    `)
    .eq("caregiver_id", caregiverProfileId)
    .eq("status", "active")
    .order("start_date", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CaregiverAssignmentDetail[];
}

// ─── Get active assignment for a child ─────────────────────

export async function getActiveChildCaregiver(
  admin: AdminClient,
  childId: string,
): Promise<CaregiverAssignmentDetail | null> {
  const { data, error } = await admin
    .from("child_caregivers")
    .select(`
      *,
      caregiver:user_profiles!child_caregivers_caregiver_id_fkey (id, first_name, last_name, email)
    `)
    .eq("child_id", childId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as CaregiverAssignmentDetail | null;
}

// ─── Create assignment ─────────────────────────────────────

export async function createCaregiverAssignment(
  admin: AdminClient,
  input: CreateCaregiverAssignmentInput,
  centreId: string,
  assignedByAuthUserId: string,
): Promise<CaregiverAssignment> {
  // Check for existing active assignment
  const existing = await admin
    .from("child_caregivers")
    .select("id")
    .eq("child_id", input.child_id)
    .eq("centre_id", centreId)
    .eq("status", "active")
    .maybeSingle();

  if (existing.data) {
    throw new Error("This child already has an active caregiver assignment. End it first.");
  }

  const { data, error } = await admin
    .from("child_caregivers")
    .insert({
      child_id: input.child_id,
      caregiver_id: input.caregiver_id,
      centre_id: centreId,
      assigned_by: assignedByAuthUserId,
      start_date: input.start_date ?? new Date().toISOString().split("T")[0],
      end_date: input.end_date ?? null,
      notes: input.notes ?? null,
      status: "active",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as CaregiverAssignment;
}

// ─── End assignment ────────────────────────────────────────

export async function endCaregiverAssignment(
  admin: AdminClient,
  assignmentId: string,
  centreId: string,
): Promise<CaregiverAssignment> {
  const { data: existing } = await admin
    .from("child_caregivers")
    .select("id, centre_id, status")
    .eq("id", assignmentId)
    .maybeSingle();

  if (!existing || existing.centre_id !== centreId) {
    throw new Error("Assignment not found.");
  }
  if (existing.status === "ended") {
    throw new Error("Assignment is already ended.");
  }

  const { data, error } = await admin
    .from("child_caregivers")
    .update({
      status: "ended",
      end_date: new Date().toISOString().split("T")[0],
    })
    .eq("id", assignmentId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as CaregiverAssignment;
}
