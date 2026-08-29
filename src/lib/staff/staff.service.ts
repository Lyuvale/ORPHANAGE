import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  StaffProfile,
  CreateStaffInput,
  UpdateStaffInput,
  StaffHistory,
  StaffHistoryEvent,
  StaffAssignment,
  CreateStaffAssignmentInput,
  StaffTraining,
  CreateStaffTrainingInput,
  UpdateStaffTrainingInput,
  StaffQualification,
  CreateStaffQualificationInput,
  StaffEmergencyContact,
  CreateStaffEmergencyContactInput,
  StaffDocument,
  CreateStaffDocumentInput,
  StaffOverview,
  StaffSearchFilters,
} from "@/types/staff";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

// ─── Staff Profile ──────────────────────────────────────────

export async function listStaff(
  adminSupabase: AdminClient,
  filters: StaffSearchFilters,
): Promise<{ data: StaffProfile[]; count: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = adminSupabase
    .from("staff_profiles")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("created_at", { ascending: false });

  if (filters.search) {
    query = query.or(
      `job_title.ilike.%${filters.search}%,department.ilike.%${filters.search}%,staff_identifier.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`,
    );
  }
  if (filters.employment_status) {
    query = query.eq("employment_status", filters.employment_status);
  }
  if (filters.operational_role) {
    query = query.eq("operational_role", filters.operational_role);
  }
  if (filters.department) {
    query = query.eq("department", filters.department);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list staff: ${error.message}`);
  return { data: (data ?? []) as StaffProfile[], count: count ?? 0 };
}

export async function getStaffById(
  adminSupabase: AdminClient,
  id: string,
): Promise<StaffProfile | null> {
  const { data, error } = await adminSupabase.from("staff_profiles").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get staff profile: ${error.message}`);
  }
  return data as StaffProfile;
}

export async function createStaff(
  adminSupabase: AdminClient,
  input: CreateStaffInput,
  userId: string,
): Promise<StaffProfile> {
  const payload = {
    centre_id: input.centre_id,
    user_profile_id: input.user_profile_id ?? null,
    staff_identifier: input.staff_identifier ?? null,
    job_title: input.job_title,
    department: input.department ?? null,
    operational_role: input.operational_role ?? null,
    employment_status: input.employment_status ?? "ACTIVE",
    start_date: input.start_date ?? null,
    end_date: input.end_date ?? null,
    work_phone: input.work_phone ?? null,
    work_email: input.work_email ?? null,
    notes: input.notes ?? null,
    created_by: userId,
  };

  const { data, error } = await adminSupabase.from("staff_profiles").insert(payload).select().single();
  if (error) {
    if (error.code === "23505") throw new Error("A staff profile with this staff identifier/user already exists in the centre.");
    if (error.code === "23503") throw new Error("Referenced user profile or centre does not exist.");
    throw new Error(`Failed to create staff profile: ${error.message}`);
  }
  return data as StaffProfile;
}

export async function updateStaff(
  adminSupabase: AdminClient,
  id: string,
  input: UpdateStaffInput,
): Promise<StaffProfile> {
  const payload: Record<string, unknown> = {};
  if (input.user_profile_id !== undefined) payload.user_profile_id = input.user_profile_id;
  if (input.staff_identifier !== undefined) payload.staff_identifier = input.staff_identifier;
  if (input.job_title !== undefined) payload.job_title = input.job_title;
  if (input.department !== undefined) payload.department = input.department;
  if (input.operational_role !== undefined) payload.operational_role = input.operational_role;
  if (input.employment_status !== undefined) payload.employment_status = input.employment_status;
  if (input.start_date !== undefined) payload.start_date = input.start_date;
  if (input.end_date !== undefined) payload.end_date = input.end_date;
  if (input.work_phone !== undefined) payload.work_phone = input.work_phone;
  if (input.work_email !== undefined) payload.work_email = input.work_email;
  if (input.notes !== undefined) payload.notes = input.notes;

  if (Object.keys(payload).length === 0) throw new Error("No fields to update.");

  const { data, error } = await adminSupabase.from("staff_profiles").update(payload).eq("id", id).select().single();
  if (error) {
    if (error.code === "PGRST116") throw new Error("Staff profile not found.");
    if (error.code === "23505") throw new Error("A staff profile with this staff identifier/user already exists in the centre.");
    throw new Error(`Failed to update staff profile: ${error.message}`);
  }
  return data as StaffProfile;
}

// ─── Staff History ──────────────────────────────────────────

export async function addStaffHistory(
  adminSupabase: AdminClient,
  staffId: string,
  eventType: StaffHistoryEvent,
  description: string,
  userId: string | null,
): Promise<void> {
  await adminSupabase.from("staff_history").insert({
    staff_id: staffId,
    event_type: eventType,
    description,
    changed_by: userId ?? null,
  });
}

export async function listStaffHistory(
  adminSupabase: AdminClient,
  staffId: string,
): Promise<StaffHistory[]> {
  const { data, error } = await adminSupabase
    .from("staff_history")
    .select("*")
    .eq("staff_id", staffId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list staff history: ${error.message}`);
  return (data ?? []) as StaffHistory[];
}

// ─── Staff Assignments ──────────────────────────────────────

export async function listStaffAssignments(
  adminSupabase: AdminClient,
  staffId: string,
): Promise<StaffAssignment[]> {
  const { data, error } = await adminSupabase
    .from("staff_assignments")
    .select("*")
    .eq("staff_id", staffId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list staff assignments: ${error.message}`);
  return (data ?? []) as StaffAssignment[];
}

export async function createStaffAssignment(
  adminSupabase: AdminClient,
  input: CreateStaffAssignmentInput,
  userId: string,
): Promise<StaffAssignment> {
  const payload = {
    centre_id: input.centre_id,
    staff_id: input.staff_id,
    responsibility_type: input.responsibility_type,
    description: input.description ?? null,
    assigned_by: userId,
    assigned_date: input.assigned_date ?? null,
    status: "ACTIVE" as const,
  };
  const { data, error } = await adminSupabase.from("staff_assignments").insert(payload).select().single();
  if (error) {
    if (error.code === "23503") throw new Error("Referenced staff profile does not exist.");
    throw new Error(`Failed to create assignment: ${error.message}`);
  }
  return data as StaffAssignment;
}

export async function endStaffAssignment(
  adminSupabase: AdminClient,
  assignmentId: string,
): Promise<StaffAssignment | null> {
  const { data, error } = await adminSupabase
    .from("staff_assignments")
    .update({ status: "ENDED" })
    .eq("id", assignmentId)
    .eq("status", "ACTIVE")
    .select()
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to end assignment: ${error.message}`);
  }
  return data as StaffAssignment;
}

// ─── Staff Training ─────────────────────────────────────────

export async function listStaffTraining(
  adminSupabase: AdminClient,
  staffId: string,
): Promise<StaffTraining[]> {
  const { data, error } = await adminSupabase
    .from("staff_training")
    .select("*")
    .eq("staff_id", staffId)
    .order("training_date", { ascending: false });
  if (error) throw new Error(`Failed to list staff training: ${error.message}`);
  return (data ?? []) as StaffTraining[];
}

export async function createStaffTraining(
  adminSupabase: AdminClient,
  input: CreateStaffTrainingInput,
  userId: string,
): Promise<StaffTraining> {
  const payload = {
    centre_id: input.centre_id,
    staff_id: input.staff_id,
    training_title: input.training_title,
    provider: input.provider ?? null,
    training_date: input.training_date ?? null,
    due_date: input.due_date ?? null,
    completion_status: input.completion_status ?? "PENDING",
    certificate_reference: input.certificate_reference ?? null,
    expiry_date: input.expiry_date ?? null,
    notes: input.notes ?? null,
    recorded_by: userId,
  };
  const { data, error } = await adminSupabase.from("staff_training").insert(payload).select().single();
  if (error) {
    if (error.code === "23503") throw new Error("Referenced staff profile does not exist.");
    throw new Error(`Failed to create training record: ${error.message}`);
  }
  return data as StaffTraining;
}

export async function updateStaffTraining(
  adminSupabase: AdminClient,
  trainingId: string,
  input: UpdateStaffTrainingInput,
): Promise<StaffTraining | null> {
  const payload: Record<string, unknown> = {};
  if (input.training_title !== undefined) payload.training_title = input.training_title;
  if (input.provider !== undefined) payload.provider = input.provider;
  if (input.training_date !== undefined) payload.training_date = input.training_date;
  if (input.due_date !== undefined) payload.due_date = input.due_date;
  if (input.completion_status !== undefined) payload.completion_status = input.completion_status;
  if (input.certificate_reference !== undefined) payload.certificate_reference = input.certificate_reference;
  if (input.expiry_date !== undefined) payload.expiry_date = input.expiry_date;
  if (input.notes !== undefined) payload.notes = input.notes;

  if (Object.keys(payload).length === 0) throw new Error("No fields to update.");

  const { data, error } = await adminSupabase.from("staff_training").update(payload).eq("id", trainingId).select().single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to update training record: ${error.message}`);
  }
  return data as StaffTraining;
}

// ─── Staff Qualifications ───────────────────────────────────

export async function listStaffQualifications(
  adminSupabase: AdminClient,
  staffId: string,
): Promise<StaffQualification[]> {
  const { data, error } = await adminSupabase
    .from("staff_qualifications")
    .select("*")
    .eq("staff_id", staffId)
    .order("qualification_year", { ascending: false });
  if (error) throw new Error(`Failed to list staff qualifications: ${error.message}`);
  return (data ?? []) as StaffQualification[];
}

export async function createStaffQualification(
  adminSupabase: AdminClient,
  input: CreateStaffQualificationInput,
  userId: string,
): Promise<StaffQualification> {
  const payload = {
    centre_id: input.centre_id,
    staff_id: input.staff_id,
    qualification: input.qualification,
    institution: input.institution ?? null,
    qualification_year: input.qualification_year ?? null,
    verification_status: input.verification_status ?? "NOT_VERIFIED",
    notes: input.notes ?? null,
    recorded_by: userId,
  };
  const { data, error } = await adminSupabase.from("staff_qualifications").insert(payload).select().single();
  if (error) {
    if (error.code === "23503") throw new Error("Referenced staff profile does not exist.");
    throw new Error(`Failed to create qualification: ${error.message}`);
  }
  return data as StaffQualification;
}

// ─── Staff Emergency Contacts ───────────────────────────────

export async function listStaffEmergencyContacts(
  adminSupabase: AdminClient,
  staffId: string,
): Promise<StaffEmergencyContact[]> {
  const { data, error } = await adminSupabase
    .from("staff_emergency_contacts")
    .select("*")
    .eq("staff_id", staffId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to list emergency contacts: ${error.message}`);
  return (data ?? []) as StaffEmergencyContact[];
}

export async function createStaffEmergencyContact(
  adminSupabase: AdminClient,
  input: CreateStaffEmergencyContactInput,
  userId: string,
): Promise<StaffEmergencyContact> {
  const payload = {
    centre_id: input.centre_id,
    staff_id: input.staff_id,
    contact_name: input.contact_name,
    relationship: input.relationship ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    created_by: userId,
  };
  const { data, error } = await adminSupabase.from("staff_emergency_contacts").insert(payload).select().single();
  if (error) {
    if (error.code === "23503") throw new Error("Referenced staff profile does not exist.");
    throw new Error(`Failed to create emergency contact: ${error.message}`);
  }
  return data as StaffEmergencyContact;
}

// ─── Staff Documents ────────────────────────────────────────

export async function listStaffDocuments(
  adminSupabase: AdminClient,
  staffId: string,
): Promise<StaffDocument[]> {
  const { data, error } = await adminSupabase
    .from("staff_documents")
    .select("*")
    .eq("staff_id", staffId)
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error(`Failed to list staff documents: ${error.message}`);
  return (data ?? []) as StaffDocument[];
}

export async function getStaffDocumentById(
  adminSupabase: AdminClient,
  documentId: string,
): Promise<StaffDocument | null> {
  const { data, error } = await adminSupabase.from("staff_documents").select("*").eq("id", documentId).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get staff document: ${error.message}`);
  }
  return data as StaffDocument;
}

/**
 * Create a staff document record. The binary lives in private Supabase
 * Storage (never PostgreSQL); this table records the reference metadata.
 * The caller must have already uploaded the object to Storage.
 */
export async function createStaffDocumentRecord(
  adminSupabase: AdminClient,
  input: CreateStaffDocumentInput,
  userId: string,
): Promise<StaffDocument> {
  const payload: Record<string, unknown> = {
    centre_id: input.centre_id,
    staff_id: input.staff_id,
    document_type: input.document_type,
    file_name: input.file_name,
    file_type: input.file_type ?? null,
    file_size: input.file_size ?? null,
    storage_path: input.storage_path,
    description: input.description ?? null,
    uploaded_by: userId,
  };

  const { data, error } = await adminSupabase
    .from("staff_documents")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(`Failed to create staff document record: ${error.message}`);
  return data as StaffDocument;
}

// ─── Dashboard Overview ─────────────────────────────────────

export async function getStaffOverview(
  adminSupabase: AdminClient,
  centreId: string,
): Promise<StaffOverview> {
  const [allStaff, training] = await Promise.all([
    adminSupabase
      .from("staff_profiles")
      .select("id, employment_status, operational_role, job_title, created_at")
      .eq("centre_id", centreId),
    adminSupabase
      .from("staff_training")
      .select("id", { count: "exact", head: true })
      .eq("centre_id", centreId)
      .eq("completion_status", "PENDING"),
  ]);

  if (allStaff.error) throw new Error(`Failed to load staff overview: ${allStaff.error.message}`);

  const rows = (allStaff.data ?? []) as Array<{
    id: string;
    employment_status: string;
    operational_role: string | null;
    job_title: string;
    created_at: string;
  }>;

  const roleCounts = new Map<string, number>();
  for (const row of rows) {
    const key = row.operational_role ?? "Unassigned";
    roleCounts.set(key, (roleCounts.get(key) ?? 0) + 1);
  }

  const recent = [...rows]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  return {
    total_active: rows.filter((r) => r.employment_status === "ACTIVE").length,
    on_leave: rows.filter((r) => r.employment_status === "ON_LEAVE").length,
    suspended: rows.filter((r) => r.employment_status === "SUSPENDED").length,
    ended: rows.filter((r) => r.employment_status === "ENDED").length,
    by_role: Array.from(roleCounts.entries()).map(([operational_role, count]) => ({
      operational_role: operational_role === "Unassigned" ? null : operational_role,
      count,
    })),
    recent_changes: recent as StaffProfile[],
    training_attention: training.count ?? 0,
  };
}