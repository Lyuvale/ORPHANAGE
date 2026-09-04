import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  HealthProfile,
  CreateHealthProfileInput,
  UpdateHealthProfileInput,
  MedicalRecord,
  CreateMedicalRecordInput,
  AmendMedicalRecordInput,
  MedicalVisit,
  CreateMedicalVisitInput,
  Medication,
  CreateMedicationInput,
  UpdateMedicationInput,
  MedicationAdministration,
  CreateMedicationAdministrationInput,
  MedicationAdminStatus,
  HealthAppointment,
  AppointmentStatusHistoryEntry,
  CreateAppointmentInput,
  UpdateAppointmentStatusInput,
  HealthScreening,
  CreateScreeningInput,
  Immunization,
  CreateImmunizationInput,
  HealthDocument,
  CreateHealthDocumentInput,
  HealthAlert,
  CreateHealthAlertInput,
  HealthFollowup,
  CreateHealthFollowupInput,
  EmergencyHealthView,
  MedicalRecordSearchFilters,
  AppointmentSearchFilters,
  MedicationSearchFilters,
  ScreeningSearchFilters,
  ImmunizationSearchFilters,
  DocumentSearchFilters,
  AlertSearchFilters,
  FollowupSearchFilters,
  HealthSearchFilters,
} from "@/types/health";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

// ─── Health Profile ─────────────────────────────────────────

export async function getHealthProfile(
  adminSupabase: AdminClient,
  centreId: string,
  childId: string,
): Promise<HealthProfile | null> {
  const { data, error } = await adminSupabase
    .from("health_profiles")
    .select("*")
    .eq("centre_id", centreId)
    .eq("child_id", childId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get health profile: ${error.message}`);
  }

  return (data as HealthProfile) ?? null;
}

export async function getHealthProfileById(
  adminSupabase: AdminClient,
  id: string,
): Promise<HealthProfile | null> {
  const { data, error } = await adminSupabase
    .from("health_profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get health profile: ${error.message}`);
  }

  return data as HealthProfile;
}

export async function createHealthProfile(
  adminSupabase: AdminClient,
  input: CreateHealthProfileInput,
): Promise<HealthProfile> {
  const payload: Record<string, unknown> = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    blood_group: input.blood_group ?? null,
    allergies: input.allergies ?? [],
    medical_conditions: input.medical_conditions ?? [],
    disability_support: input.disability_support ?? [],
    general_health_notes: input.general_health_notes ?? null,
    emergency_health_info: input.emergency_health_info ?? null,
    emergency_contacts: input.emergency_contacts ?? [],
  };

  const { data, error } = await adminSupabase
    .from("health_profiles")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A health profile already exists for this child");
    }
    if (error.code === "23503") {
      throw new Error("Invalid child or centre reference");
    }
    throw new Error(`Failed to create health profile: ${error.message}`);
  }

  return data as HealthProfile;
}

export async function updateHealthProfile(
  adminSupabase: AdminClient,
  id: string,
  input: UpdateHealthProfileInput,
): Promise<HealthProfile> {
  const payload: Record<string, unknown> = {};
  if (input.blood_group !== undefined) payload.blood_group = input.blood_group;
  if (input.allergies !== undefined) payload.allergies = input.allergies;
  if (input.medical_conditions !== undefined) payload.medical_conditions = input.medical_conditions;
  if (input.disability_support !== undefined) payload.disability_support = input.disability_support;
  if (input.general_health_notes !== undefined) payload.general_health_notes = input.general_health_notes;
  if (input.emergency_health_info !== undefined) payload.emergency_health_info = input.emergency_health_info;
  if (input.emergency_contacts !== undefined) payload.emergency_contacts = input.emergency_contacts;

  const { data, error } = await adminSupabase
    .from("health_profiles")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") throw new Error("Health profile not found");
    throw new Error(`Failed to update health profile: ${error.message}`);
  }

  return data as HealthProfile;
}

// ─── Medical Records (append-only / amendable history) ──────

export async function listMedicalRecords(
  adminSupabase: AdminClient,
  filters: MedicalRecordSearchFilters,
): Promise<{ data: MedicalRecord[]; count: number }> {
  let query = adminSupabase
    .from("health_medical_records")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("record_date", { ascending: false });

  if (filters.child_id) query = query.eq("child_id", filters.child_id);
  if (filters.record_type) query = query.eq("record_type", filters.record_type);
  if (filters.date_from) query = query.gte("record_date", filters.date_from);
  if (filters.date_to) query = query.lte("record_date", filters.date_to);

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list medical records: ${error.message}`);
  return { data: (data ?? []) as MedicalRecord[], count: count ?? 0 };
}

export async function getMedicalRecordById(
  adminSupabase: AdminClient,
  id: string,
): Promise<MedicalRecord | null> {
  const { data, error } = await adminSupabase
    .from("health_medical_records")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get medical record: ${error.message}`);
  }
  return data as MedicalRecord;
}

export async function createMedicalRecord(
  adminSupabase: AdminClient,
  input: CreateMedicalRecordInput,
  userId: string,
): Promise<MedicalRecord> {
  const payload: Record<string, unknown> = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    record_date: input.record_date,
    record_type: input.record_type,
    provider_name: input.provider_name ?? null,
    provider_role: input.provider_role ?? null,
    reason: input.reason ?? null,
    findings: input.findings ?? null,
    treatment: input.treatment ?? null,
    followup_required: input.followup_required ?? false,
    followup_date: input.followup_date ?? null,
    outcome: input.outcome ?? null,
    recorded_by: userId,
  };

  const { data, error } = await adminSupabase
    .from("health_medical_records")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") throw new Error("Invalid child, centre or provider reference");
    throw new Error(`Failed to create medical record: ${error.message}`);
  }

  return data as MedicalRecord;
}

/**
 * Amend a medical record. The original is preserved; a new version is
 * created linking via parent_record_id so history remains traceable.
 */
export async function amendMedicalRecord(
  adminSupabase: AdminClient,
  id: string,
  input: AmendMedicalRecordInput,
  userId: string,
): Promise<MedicalRecord> {
  const original = await getMedicalRecordById(adminSupabase, id);
  if (!original) throw new Error("Medical record not found");

  const version = original.version + 1;
  const { data: amended, error } = await adminSupabase
    .from("health_medical_records")
    .insert({
      centre_id: original.centre_id,
      child_id: original.child_id,
      record_date: original.record_date,
      record_type: original.record_type,
      provider_name: original.provider_name,
      provider_role: original.provider_role,
      reason: original.reason,
      findings: input.findings !== undefined ? input.findings : original.findings,
      treatment: input.treatment !== undefined ? input.treatment : original.treatment,
      followup_required:
        input.followup_required !== undefined ? input.followup_required : original.followup_required,
      followup_date: input.followup_date !== undefined ? input.followup_date : original.followup_date,
      outcome: input.outcome !== undefined ? input.outcome : original.outcome,
      recorded_by: original.recorded_by,
      version,
      parent_record_id: original.id,
      is_amended: true,
      amended_by: userId,
      amended_at: new Date().toISOString(),
      amendment_reason: input.amendment_reason,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to amend medical record: ${error.message}`);

  // Mark the original as superseded by an amendment
  await adminSupabase
    .from("health_medical_records")
    .update({ is_amended: true, amended_by: userId, amended_at: new Date().toISOString() })
    .eq("id", original.id);

  return amended as MedicalRecord;
}

// ─── Medical Visits ─────────────────────────────────────────

export async function listMedicalVisits(
  adminSupabase: AdminClient,
  filters: HealthSearchFilters,
): Promise<{ data: MedicalVisit[]; count: number }> {
  let query = adminSupabase
    .from("health_medical_visits")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("visit_date", { ascending: false });

  if (filters.child_id) query = query.eq("child_id", filters.child_id);

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list medical visits: ${error.message}`);
  return { data: (data ?? []) as MedicalVisit[], count: count ?? 0 };
}

export async function createMedicalVisit(
  adminSupabase: AdminClient,
  input: CreateMedicalVisitInput,
  userId: string,
): Promise<MedicalVisit> {
  const payload: Record<string, unknown> = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    visit_date: input.visit_date,
    visit_type: input.visit_type,
    provider_name: input.provider_name ?? null,
    provider_role: input.provider_role ?? null,
    reason: input.reason ?? null,
    outcome: input.outcome ?? null,
    followup_required: input.followup_required ?? false,
    followup_date: input.followup_date ?? null,
    notes: input.notes ?? null,
    recorded_by: userId,
  };

  const { data, error } = await adminSupabase
    .from("health_medical_visits")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") throw new Error("Invalid child or centre reference");
    throw new Error(`Failed to create medical visit: ${error.message}`);
  }
  return data as MedicalVisit;
}

// ─── Medications ────────────────────────────────────────────

export async function listMedications(
  adminSupabase: AdminClient,
  filters: MedicationSearchFilters,
): Promise<{ data: Medication[]; count: number }> {
  let query = adminSupabase
    .from("health_medications")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("created_at", { ascending: false });

  if (filters.child_id) query = query.eq("child_id", filters.child_id);
  if (filters.child_ids) {
    if (filters.child_ids.length === 0) return { data: [], count: 0 };
    query = query.in("child_id", filters.child_ids);
  }
  if (filters.status) query = query.eq("status", filters.status);

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list medications: ${error.message}`);
  return { data: (data ?? []) as Medication[], count: count ?? 0 };
}

export async function getMedicationById(
  adminSupabase: AdminClient,
  id: string,
): Promise<Medication | null> {
  const { data, error } = await adminSupabase
    .from("health_medications")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get medication: ${error.message}`);
  }
  return data as Medication;
}

export async function createMedication(
  adminSupabase: AdminClient,
  input: CreateMedicationInput,
  userId: string,
): Promise<Medication> {
  const payload: Record<string, unknown> = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    medication_name: input.medication_name,
    dosage: input.dosage ?? null,
    frequency: input.frequency ?? null,
    route: input.route ?? null,
    start_date: input.start_date,
    end_date: input.end_date ?? null,
    prescribed_by: input.prescribed_by ?? null,
    reason: input.reason ?? null,
    status: input.status ?? "ACTIVE",
    notes: input.notes ?? null,
    created_by: userId,
  };

  const { data, error } = await adminSupabase
    .from("health_medications")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") throw new Error("Invalid child, centre or provider reference");
    throw new Error(`Failed to create medication: ${error.message}`);
  }
  return data as Medication;
}

export async function updateMedication(
  adminSupabase: AdminClient,
  id: string,
  input: UpdateMedicationInput,
): Promise<Medication> {
  const payload: Record<string, unknown> = {};
  if (input.dosage !== undefined) payload.dosage = input.dosage;
  if (input.frequency !== undefined) payload.frequency = input.frequency;
  if (input.route !== undefined) payload.route = input.route;
  if (input.end_date !== undefined) payload.end_date = input.end_date;
  if (input.status !== undefined) payload.status = input.status;
  if (input.notes !== undefined) payload.notes = input.notes;

  const { data, error } = await adminSupabase
    .from("health_medications")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") throw new Error("Medication not found");
    throw new Error(`Failed to update medication: ${error.message}`);
  }
  return data as Medication;
}

export async function updateMedicationStatus(
  adminSupabase: AdminClient,
  id: string,
  status: Medication["status"],
): Promise<Medication> {
  return updateMedication(adminSupabase, id, { status });
}

// ─── Medication Administration (append-only history) ────────

export async function listMedicationAdministrations(
  adminSupabase: AdminClient,
  filters: HealthSearchFilters & {
    medication_id?: string;
    status?: MedicationAdminStatus;
  },
): Promise<{ data: MedicationAdministration[]; count: number }> {
  let query = adminSupabase
    .from("health_medication_admin")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("scheduled_time", { ascending: false });

  if (filters.child_id) query = query.eq("child_id", filters.child_id);
  if (filters.child_ids) {
    if (filters.child_ids.length === 0) return { data: [], count: 0 };
    query = query.in("child_id", filters.child_ids);
  }
  if (filters.medication_id) query = query.eq("medication_id", filters.medication_id);
  if (filters.status) query = query.eq("status", filters.status);

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list medication administrations: ${error.message}`);
  return { data: (data ?? []) as MedicationAdministration[], count: count ?? 0 };
}

/**
 * Record a medication administration. The administered_time is set
 * server-side at insert time and cannot be silently modified later.
 */
export async function recordMedicationAdministration(
  adminSupabase: AdminClient,
  input: CreateMedicationAdministrationInput,
  userId: string,
): Promise<MedicationAdministration> {
  const medication = await getMedicationById(adminSupabase, input.medication_id);
  if (!medication) throw new Error("Medication not found");
  if (medication.centre_id !== input.centre_id || medication.child_id !== input.child_id) {
    throw new Error("Medication does not belong to this child/centre");
  }

  const payload: Record<string, unknown> = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    medication_id: input.medication_id,
    scheduled_time: input.scheduled_time,
    status: input.status ?? "GIVEN",
    not_administered_reason: input.not_administered_reason ?? null,
    notes: input.notes ?? null,
    administered_by: userId,
  };

  const { data, error } = await adminSupabase
    .from("health_medication_admin")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") throw new Error("Invalid medication, child or centre reference");
    throw new Error(`Failed to record medication administration: ${error.message}`);
  }
  return data as MedicationAdministration;
}

export async function getMedicationAdministrationById(
  adminSupabase: AdminClient,
  id: string,
): Promise<MedicationAdministration | null> {
  const { data, error } = await adminSupabase
    .from("health_medication_admin")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get medication administration: ${error.message}`);
  }
  return data as MedicationAdministration;
}

// ─── Appointments (traceable status history) ────────────────

export async function listAppointments(
  adminSupabase: AdminClient,
  filters: AppointmentSearchFilters,
): Promise<{ data: HealthAppointment[]; count: number }> {
  let query = adminSupabase
    .from("health_appointments")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("appointment_date", { ascending: false });

  if (filters.child_id) query = query.eq("child_id", filters.child_id);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.date_from) query = query.gte("appointment_date", filters.date_from);
  if (filters.date_to) query = query.lte("appointment_date", filters.date_to);

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list appointments: ${error.message}`);
  return { data: (data ?? []) as HealthAppointment[], count: count ?? 0 };
}

export async function getAppointmentById(
  adminSupabase: AdminClient,
  id: string,
): Promise<HealthAppointment | null> {
  const { data, error } = await adminSupabase
    .from("health_appointments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get appointment: ${error.message}`);
  }
  return data as HealthAppointment;
}

export async function createAppointment(
  adminSupabase: AdminClient,
  input: CreateAppointmentInput,
  userId: string,
): Promise<HealthAppointment> {
  const payload: Record<string, unknown> = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    appointment_type: input.appointment_type,
    provider_name: input.provider_name ?? null,
    appointment_date: input.appointment_date,
    appointment_time: input.appointment_time ?? null,
    location: input.location ?? null,
    purpose: input.purpose ?? null,
    followup_required: input.followup_required ?? false,
    followup_date: input.followup_date ?? null,
    notes: input.notes ?? null,
    created_by: userId,
  };

  const { data, error } = await adminSupabase
    .from("health_appointments")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") throw new Error("Invalid child or centre reference");
    throw new Error(`Failed to create appointment: ${error.message}`);
  }
  return data as HealthAppointment;
}

export async function updateAppointmentStatus(
  adminSupabase: AdminClient,
  id: string,
  input: UpdateAppointmentStatusInput,
  userId: string,
): Promise<HealthAppointment> {
  const existing = await getAppointmentById(adminSupabase, id);
  if (!existing) throw new Error("Appointment not found");

  const { data, error } = await adminSupabase
    .from("health_appointments")
    .update({ status: input.status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update appointment status: ${error.message}`);

  // Record traceable status history
  await adminSupabase.from("health_appointment_history").insert({
    appointment_id: id,
    centre_id: existing.centre_id,
    previous_status: existing.status,
    new_status: input.status,
    changed_by: userId,
    reason: input.reason ?? null,
  });

  return data as HealthAppointment;
}

export async function getAppointmentHistory(
  adminSupabase: AdminClient,
  appointmentId: string,
): Promise<AppointmentStatusHistoryEntry[]> {
  const { data, error } = await adminSupabase
    .from("health_appointment_history")
    .select("*")
    .eq("appointment_id", appointmentId)
    .order("changed_at", { ascending: true });

  if (error) throw new Error(`Failed to get appointment history: ${error.message}`);
  return (data ?? []) as AppointmentStatusHistoryEntry[];
}

// ─── Health Screenings ──────────────────────────────────────

export async function listScreenings(
  adminSupabase: AdminClient,
  filters: ScreeningSearchFilters,
): Promise<{ data: HealthScreening[]; count: number }> {
  let query = adminSupabase
    .from("health_screenings")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("screening_date", { ascending: false });

  if (filters.child_id) query = query.eq("child_id", filters.child_id);
  if (filters.screening_type) query = query.eq("screening_type", filters.screening_type);

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list screenings: ${error.message}`);
  return { data: (data ?? []) as HealthScreening[], count: count ?? 0 };
}

export async function createScreening(
  adminSupabase: AdminClient,
  input: CreateScreeningInput,
  userId: string,
): Promise<HealthScreening> {
  const payload: Record<string, unknown> = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    screening_type: input.screening_type,
    screening_date: input.screening_date,
    provider_name: input.provider_name ?? null,
    measurements: input.measurements ?? null,
    result: input.result ?? null,
    outcome: input.outcome ?? null,
    followup_required: input.followup_required ?? false,
    followup_date: input.followup_date ?? null,
    notes: input.notes ?? null,
    recorded_by: userId,
  };

  const { data, error } = await adminSupabase
    .from("health_screenings")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") throw new Error("Invalid child or centre reference");
    throw new Error(`Failed to create screening: ${error.message}`);
  }
  return data as HealthScreening;
}

// ─── Immunizations (due/overdue) ────────────────────────────

export async function listImmunizations(
  adminSupabase: AdminClient,
  filters: ImmunizationSearchFilters,
): Promise<{ data: Immunization[]; count: number }> {
  let query = adminSupabase
    .from("health_immunizations")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("administered_date", { ascending: false });

  if (filters.child_id) query = query.eq("child_id", filters.child_id);
  if (filters.status) query = query.eq("status", filters.status);

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list immunizations: ${error.message}`);
  return { data: (data ?? []) as Immunization[], count: count ?? 0 };
}

export async function createImmunization(
  adminSupabase: AdminClient,
  input: CreateImmunizationInput,
  userId: string,
): Promise<Immunization> {
  const payload: Record<string, unknown> = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    vaccine: input.vaccine,
    dose: input.dose ?? null,
    administered_date: input.administered_date,
    provider_name: input.provider_name ?? null,
    next_dose_date: input.next_dose_date ?? null,
    status: input.status ?? "COMPLETED",
    notes: input.notes ?? null,
    recorded_by: userId,
  };

  const { data, error } = await adminSupabase
    .from("health_immunizations")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") throw new Error("Invalid child or centre reference");
    throw new Error(`Failed to create immunization: ${error.message}`);
  }
  return data as Immunization;
}

/**
 * Compute due/overdue status for an immunization based on its
 * next_dose_date relative to today. This does NOT diagnose or
 * determine medical eligibility — it is an operational scheduling aid.
 */
export function computeImmunizationStatus(immunization: Immunization, today = new Date()): Immunization["status"] {
  if (immunization.status !== "COMPLETED") return immunization.status;
  if (!immunization.next_dose_date) return "COMPLETED";
  const next = new Date(immunization.next_dose_date + "T00:00:00");
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  if (next < startOfToday) return "OVERDUE";
  return "DUE";
}

// ─── Health Documents (Supabase Storage-backed) ─────────────

export async function listHealthDocuments(
  adminSupabase: AdminClient,
  filters: DocumentSearchFilters,
): Promise<{ data: HealthDocument[]; count: number }> {
  let query = adminSupabase
    .from("health_documents")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("uploaded_at", { ascending: false });

  if (filters.child_id) query = query.eq("child_id", filters.child_id);
  if (filters.document_type) query = query.eq("document_type", filters.document_type);

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list health documents: ${error.message}`);
  return { data: (data ?? []) as HealthDocument[], count: count ?? 0 };
}

export async function getHealthDocumentById(
  adminSupabase: AdminClient,
  id: string,
): Promise<HealthDocument | null> {
  const { data, error } = await adminSupabase
    .from("health_documents")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get health document: ${error.message}`);
  }
  return data as HealthDocument;
}

/**
 * Create a health document record. The binary lives in private Supabase
 * Storage (never PostgreSQL); this table records the reference metadata.
 * The caller must have already uploaded the object to Storage.
 */
export async function createHealthDocumentRecord(
  adminSupabase: AdminClient,
  input: CreateHealthDocumentInput,
  userId: string,
): Promise<HealthDocument> {
  const payload: Record<string, unknown> = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    document_type: input.document_type,
    file_name: input.file_name,
    file_type: input.file_type ?? null,
    file_size: input.file_size ?? null,
    storage_path: input.storage_path,
    description: input.description ?? null,
    uploaded_by: userId,
  };

  const { data, error } = await adminSupabase
    .from("health_documents")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(`Failed to create health document record: ${error.message}`);
  return data as HealthDocument;
}

// ─── Health Alerts (minimal exposure) ───────────────────────

export async function listHealthAlerts(
  adminSupabase: AdminClient,
  filters: AlertSearchFilters,
): Promise<{ data: HealthAlert[]; count: number }> {
  let query = adminSupabase
    .from("health_alerts")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("created_at", { ascending: false });

  if (filters.child_id) query = query.eq("child_id", filters.child_id);
  if (filters.is_active !== undefined) query = query.eq("is_active", filters.is_active);
  if (filters.visible_to_caregiver !== undefined) {
    query = query.eq("visible_to_caregiver", filters.visible_to_caregiver);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list health alerts: ${error.message}`);
  return { data: (data ?? []) as HealthAlert[], count: count ?? 0 };
}

export async function createHealthAlert(
  adminSupabase: AdminClient,
  input: CreateHealthAlertInput,
  userId: string,
): Promise<HealthAlert> {
  const payload: Record<string, unknown> = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    alert_type: input.alert_type,
    title: input.title,
    description: input.description ?? null,
    severity: input.severity ?? "medium",
    visible_to_caregiver: input.visible_to_caregiver ?? false,
    source_record_id: input.source_record_id ?? null,
    created_by: userId,
  };

  const { data, error } = await adminSupabase
    .from("health_alerts")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") throw new Error("Invalid child or centre reference");
    throw new Error(`Failed to create health alert: ${error.message}`);
  }
  return data as HealthAlert;
}

export async function getHealthAlertById(
  adminSupabase: AdminClient,
  id: string,
): Promise<HealthAlert | null> {
  const { data, error } = await adminSupabase
    .from("health_alerts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get health alert: ${error.message}`);
  }
  return data as HealthAlert;
}

export async function resolveHealthAlert(
  adminSupabase: AdminClient,
  id: string,
): Promise<HealthAlert> {
  const { data, error } = await adminSupabase
    .from("health_alerts")
    .update({ is_active: false, resolved_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") throw new Error("Health alert not found");
    throw new Error(`Failed to resolve health alert: ${error.message}`);
  }
  return data as HealthAlert;
}

// ─── Health Follow-Ups ──────────────────────────────────────

export async function listHealthFollowups(
  adminSupabase: AdminClient,
  filters: FollowupSearchFilters,
): Promise<{ data: HealthFollowup[]; count: number }> {
  let query = adminSupabase
    .from("health_followups")
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("due_date", { ascending: true });

  if (filters.child_id) query = query.eq("child_id", filters.child_id);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.followup_type) query = query.eq("followup_type", filters.followup_type);

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list health follow-ups: ${error.message}`);
  return { data: (data ?? []) as HealthFollowup[], count: count ?? 0 };
}

export async function getHealthFollowupById(
  adminSupabase: AdminClient,
  id: string,
): Promise<HealthFollowup | null> {
  const { data, error } = await adminSupabase
    .from("health_followups")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get health follow-up: ${error.message}`);
  }
  return data as HealthFollowup;
}

export async function createHealthFollowup(
  adminSupabase: AdminClient,
  input: CreateHealthFollowupInput,
  userId: string,
): Promise<HealthFollowup> {
  const payload: Record<string, unknown> = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    followup_type: input.followup_type,
    source_record_id: input.source_record_id ?? null,
    title: input.title,
    description: input.description ?? null,
    responsible_user_id: input.responsible_user_id ?? null,
    due_date: input.due_date,
    created_by: userId,
  };

  const { data, error } = await adminSupabase
    .from("health_followups")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") throw new Error("Invalid child or centre reference");
    throw new Error(`Failed to create health follow-up: ${error.message}`);
  }
  return data as HealthFollowup;
}

export async function updateHealthFollowup(
  adminSupabase: AdminClient,
  id: string,
  input: {
    status?: HealthFollowup["status"];
    outcome?: string | null;
    due_date?: string | null;
    responsible_user_id?: string | null;
  },
): Promise<HealthFollowup> {
  const payload: Record<string, unknown> = {};
  if (input.status !== undefined) payload.status = input.status;
  if (input.outcome !== undefined) payload.outcome = input.outcome;
  if (input.due_date !== undefined) payload.due_date = input.due_date;
  if (input.responsible_user_id !== undefined) payload.responsible_user_id = input.responsible_user_id;

  if (input.status === "completed") {
    payload.completed_at = new Date().toISOString();
  }

  const { data, error } = await adminSupabase
    .from("health_followups")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") throw new Error("Health follow-up not found");
    throw new Error(`Failed to update health follow-up: ${error.message}`);
  }
  return data as HealthFollowup;
}

// ─── Emergency Health View (restricted projection) ──────────
// Only essential, authorised information is exposed. Full medical
// history, confidential notes, and sensitive documents are NOT included.

export async function getEmergencyHealthView(
  adminSupabase: AdminClient,
  centreId: string,
  childId: string,
): Promise<EmergencyHealthView | null> {
  const profile = await getHealthProfile(adminSupabase, centreId, childId);

  // Active medications (name/dosage/frequency only — no sensitive history)
  const { data: meds, error: medsErr } = await adminSupabase
    .from("health_medications")
    .select("medication_name, dosage, frequency")
    .eq("centre_id", centreId)
    .eq("child_id", childId)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false });

  if (medsErr) throw new Error(`Failed to load active medications: ${medsErr.message}`);

  // Active alerts the caregiver is permitted to see
  const { data: alerts, error: alertsErr } = await adminSupabase
    .from("health_alerts")
    .select("title, description, alert_type")
    .eq("centre_id", centreId)
    .eq("child_id", childId)
    .eq("is_active", true)
    .eq("visible_to_caregiver", true)
    .order("created_at", { ascending: false });

  if (alertsErr) throw new Error(`Failed to load health alerts: ${alertsErr.message}`);

  const allergies = (profile?.allergies ?? []).filter(
    (a) => typeof a === "object" && a !== null,
  ) as Array<{ name: string; severity?: string; reaction?: string }>;

  const conditions = (profile?.medical_conditions ?? []).filter(
    (c) => typeof c === "object" && c !== null,
  ) as Array<{ name: string; notes?: string }>;

  return {
    child_id: childId,
    blood_group: profile?.blood_group ?? null,
    critical_allergies: allergies,
    important_conditions: conditions,
    active_medications: (meds ?? []) as Array<{
      medication_name: string;
      dosage: string | null;
      frequency: string | null;
    }>,
    emergency_health_info: profile?.emergency_health_info ?? null,
    emergency_contacts: profile?.emergency_contacts ?? [],
    active_alerts: (alerts ?? []) as Array<{
      title: string;
      description: string | null;
      alert_type: HealthAlert["alert_type"];
    }>,
  };
}

// ─── Health Overview (dashboard aggregate) ──────────────────

export interface HealthOverview {
  alert_count: number;
  active_medication_count: number;
  upcoming_appointment_count: number;
  open_followup_count: number;
  recent_events_count: number;
}

export async function getHealthOverview(
  adminSupabase: AdminClient,
  centreId: string,
  childId: string,
  today = new Date().toISOString().slice(0, 10),
): Promise<HealthOverview> {
  const startOfToday = `${today}T00:00:00.000Z`;

  const { count: alertCount } = await adminSupabase
    .from("health_alerts")
    .select("id", { count: "exact", head: true })
    .eq("centre_id", centreId)
    .eq("child_id", childId)
    .eq("is_active", true);

  const { count: activeMedCount } = await adminSupabase
    .from("health_medications")
    .select("id", { count: "exact", head: true })
    .eq("centre_id", centreId)
    .eq("child_id", childId)
    .eq("status", "ACTIVE");

  const { count: upcomingApptCount } = await adminSupabase
    .from("health_appointments")
    .select("id", { count: "exact", head: true })
    .eq("centre_id", centreId)
    .eq("child_id", childId)
    .eq("status", "SCHEDULED")
    .gte("appointment_date", today);

  const { count: openFollowupCount } = await adminSupabase
    .from("health_followups")
    .select("id", { count: "exact", head: true })
    .eq("centre_id", centreId)
    .eq("child_id", childId)
    .in("status", ["open", "in_progress"]);

  const { count: recentEventsCount } = await adminSupabase
    .from("health_medical_records")
    .select("id", { count: "exact", head: true })
    .eq("centre_id", centreId)
    .eq("child_id", childId)
    .gte("record_date", startOfToday);

  return {
    alert_count: alertCount ?? 0,
    active_medication_count: activeMedCount ?? 0,
    upcoming_appointment_count: upcomingApptCount ?? 0,
    open_followup_count: openFollowupCount ?? 0,
    recent_events_count: recentEventsCount ?? 0,
  };
}
