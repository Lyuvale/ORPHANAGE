/**
 * Health & Medical Management Types
 *
 * Defines the child health profile, medical records, medical visits,
 * medications, medication administration, appointments, screenings,
 * immunizations, health documents, alerts, and follow-ups.
 *
 * SECURITY:
 *   - centre_id is always derived server-side, never from client input
 *   - Health data is sensitive and separate from general/case/daily notes
 *   - health.* permissions are granted granularly and separately from children.view
 *   - Historical medical events/administration/immunization/screening/appointment
 *     outcomes are preserved; authorised corrections are recorded as amendments
 *   - Health documents live in a private Supabase Storage bucket (never public)
 */

// ─── Blood Group ────────────────────────────────────────────

export const BLOOD_GROUPS = [
  "A_POSITIVE",
  "A_NEGATIVE",
  "B_POSITIVE",
  "B_NEGATIVE",
  "AB_POSITIVE",
  "AB_NEGATIVE",
  "O_POSITIVE",
  "O_NEGATIVE",
  "UNKNOWN",
] as const;

export type BloodGroup = (typeof BLOOD_GROUPS)[number];

// ─── Medical Record Type ────────────────────────────────────

export const MEDICAL_RECORD_TYPES = [
  "consultation",
  "diagnosis",
  "treatment",
  "surgery",
  "lab_result",
  "imaging",
  "referral",
  "hospitalisation",
  "discharge",
  "other",
] as const;

export type MedicalRecordType = (typeof MEDICAL_RECORD_TYPES)[number];

// ─── Medical Visit Type ─────────────────────────────────────

export const MEDICAL_VISIT_TYPES = [
  "clinic",
  "hospital",
  "doctor_consultation",
  "dental",
  "specialist",
  "other",
] as const;

export type MedicalVisitType = (typeof MEDICAL_VISIT_TYPES)[number];

// ─── Medication Status ──────────────────────────────────────

export const MEDICATION_STATUSES = [
  "ACTIVE",
  "COMPLETED",
  "DISCONTINUED",
] as const;

export type MedicationStatus = (typeof MEDICATION_STATUSES)[number];

// ─── Medication Administration Status ───────────────────────

export const MEDICATION_ADMIN_STATUSES = [
  "GIVEN",
  "MISSED",
  "REFUSED",
  "NOT_AVAILABLE",
  "OTHER_APPROVED",
] as const;

export type MedicationAdminStatus = (typeof MEDICATION_ADMIN_STATUSES)[number];

// ─── Appointment Type ───────────────────────────────────────

export const APPOINTMENT_TYPES = [
  "clinic",
  "hospital",
  "doctor_consultation",
  "dental",
  "specialist",
  "therapy",
  "followup",
  "other",
] as const;

export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

// ─── Appointment Status ─────────────────────────────────────

export const APPOINTMENT_STATUSES = [
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
  "MISSED",
  "RESCHEDULED",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

// ─── Screening Type ─────────────────────────────────────────

export const SCREENING_TYPES = [
  "general_health",
  "dental",
  "vision",
  "hearing",
  "growth_monitoring",
  "other",
] as const;

export type ScreeningType = (typeof SCREENING_TYPES)[number];

// ─── Immunization Status ────────────────────────────────────

export const IMMUNIZATION_STATUSES = [
  "COMPLETED",
  "DUE",
  "OVERDUE",
] as const;

export type ImmunizationStatus = (typeof IMMUNIZATION_STATUSES)[number];

// ─── Health Document Type ───────────────────────────────────

export const HEALTH_DOCUMENT_TYPES = [
  "medical_report",
  "prescription",
  "referral_letter",
  "lab_result",
  "immunization_record",
  "discharge_summary",
  "other",
] as const;

export type HealthDocumentType = (typeof HEALTH_DOCUMENT_TYPES)[number];

// ─── Health Alert Type ──────────────────────────────────────

export const HEALTH_ALERT_TYPES = [
  "allergy",
  "medication_requirement",
  "emergency_health_information",
  "followup_due",
  "other",
] as const;

export type HealthAlertType = (typeof HEALTH_ALERT_TYPES)[number];

// ─── Health Follow-Up Type ──────────────────────────────────

export const HEALTH_FOLLOWUP_TYPES = [
  "appointment",
  "treatment",
  "screening",
  "immunization",
  "medication",
  "other",
] as const;

export type HealthFollowupType = (typeof HEALTH_FOLLOWUP_TYPES)[number];

// ─── Health Follow-Up Status ────────────────────────────────

export const HEALTH_FOLLOWUP_STATUSES = [
  "open",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type HealthFollowupStatus = (typeof HEALTH_FOLLOWUP_STATUSES)[number];

// ─── Health Profile ─────────────────────────────────────────

export interface HealthProfile {
  id: string;
  centre_id: string;
  child_id: string;
  blood_group: BloodGroup | null;
  allergies: Array<{ name: string; severity?: string; reaction?: string }>;
  medical_conditions: Array<{ name: string; diagnosed_at?: string; notes?: string }>;
  disability_support: Array<{ name: string; notes?: string }>;
  general_health_notes: string | null;
  emergency_health_info: string | null;
  emergency_contacts: Array<{
    name?: string;
    relation?: string;
    phone?: string;
    authorized?: boolean;
  }>;
  created_at: string;
  updated_at: string;
}

export interface CreateHealthProfileInput {
  centre_id: string;
  child_id: string;
  blood_group?: BloodGroup | null;
  allergies?: HealthProfile["allergies"];
  medical_conditions?: HealthProfile["medical_conditions"];
  disability_support?: HealthProfile["disability_support"];
  general_health_notes?: string | null;
  emergency_health_info?: string | null;
  emergency_contacts?: HealthProfile["emergency_contacts"];
}

export interface UpdateHealthProfileInput {
  blood_group?: BloodGroup | null;
  allergies?: HealthProfile["allergies"];
  medical_conditions?: HealthProfile["medical_conditions"];
  disability_support?: HealthProfile["disability_support"];
  general_health_notes?: string | null;
  emergency_health_info?: string | null;
  emergency_contacts?: HealthProfile["emergency_contacts"];
}

// ─── Medical Record ─────────────────────────────────────────

export interface MedicalRecord {
  id: string;
  centre_id: string;
  child_id: string;
  record_date: string;
  record_type: MedicalRecordType;
  provider_name: string | null;
  provider_role: string | null;
  reason: string | null;
  findings: string | null;
  treatment: string | null;
  followup_required: boolean;
  followup_date: string | null;
  outcome: string | null;
  recorded_by: string;
  version: number;
  parent_record_id: string | null;
  is_amended: boolean;
  amended_by: string | null;
  amended_at: string | null;
  amendment_reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMedicalRecordInput {
  centre_id: string;
  child_id: string;
  record_date: string;
  record_type: MedicalRecordType;
  provider_name?: string | null;
  provider_role?: string | null;
  reason?: string | null;
  findings?: string | null;
  treatment?: string | null;
  followup_required?: boolean;
  followup_date?: string | null;
  outcome?: string | null;
}

export interface AmendMedicalRecordInput {
  findings?: string | null;
  treatment?: string | null;
  outcome?: string | null;
  followup_required?: boolean;
  followup_date?: string | null;
  amendment_reason: string;
}

// ─── Medical Visit ──────────────────────────────────────────

export interface MedicalVisit {
  id: string;
  centre_id: string;
  child_id: string;
  visit_date: string;
  visit_type: MedicalVisitType;
  provider_name: string | null;
  provider_role: string | null;
  reason: string | null;
  outcome: string | null;
  followup_required: boolean;
  followup_date: string | null;
  notes: string | null;
  recorded_by: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMedicalVisitInput {
  centre_id: string;
  child_id: string;
  visit_date: string;
  visit_type: MedicalVisitType;
  provider_name?: string | null;
  provider_role?: string | null;
  reason?: string | null;
  outcome?: string | null;
  followup_required?: boolean;
  followup_date?: string | null;
  notes?: string | null;
}

// ─── Medication ─────────────────────────────────────────────

export interface Medication {
  id: string;
  centre_id: string;
  child_id: string;
  medication_name: string;
  dosage: string | null;
  frequency: string | null;
  route: string | null;
  start_date: string;
  end_date: string | null;
  prescribed_by: string | null;
  reason: string | null;
  status: MedicationStatus;
  notes: string | null;
  created_by: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMedicationInput {
  centre_id: string;
  child_id: string;
  medication_name: string;
  dosage?: string | null;
  frequency?: string | null;
  route?: string | null;
  start_date: string;
  end_date?: string | null;
  prescribed_by?: string | null;
  reason?: string | null;
  status?: MedicationStatus;
  notes?: string | null;
}

export interface UpdateMedicationInput {
  dosage?: string | null;
  frequency?: string | null;
  route?: string | null;
  end_date?: string | null;
  status?: MedicationStatus;
  notes?: string | null;
}

// ─── Medication Administration ──────────────────────────────

export interface MedicationAdministration {
  id: string;
  centre_id: string;
  child_id: string;
  medication_id: string;
  scheduled_time: string;
  administered_time: string;
  administered_by: string | null;
  status: MedicationAdminStatus;
  not_administered_reason: string | null;
  notes: string | null;
  version: number;
  parent_admin_id: string | null;
  is_amended: boolean;
  amended_by: string | null;
  amended_at: string | null;
  amendment_reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMedicationAdministrationInput {
  centre_id: string;
  child_id: string;
  medication_id: string;
  scheduled_time: string;
  status?: MedicationAdminStatus;
  not_administered_reason?: string | null;
  notes?: string | null;
}

// ─── Appointment ────────────────────────────────────────────

export interface HealthAppointment {
  id: string;
  centre_id: string;
  child_id: string;
  appointment_type: AppointmentType;
  provider_name: string | null;
  appointment_date: string;
  appointment_time: string | null;
  location: string | null;
  purpose: string | null;
  status: AppointmentStatus;
  followup_required: boolean;
  followup_date: string | null;
  notes: string | null;
  created_by: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentStatusHistoryEntry {
  id: string;
  appointment_id: string;
  centre_id: string;
  previous_status: AppointmentStatus | null;
  new_status: AppointmentStatus;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
}

export interface CreateAppointmentInput {
  centre_id: string;
  child_id: string;
  appointment_type: AppointmentType;
  provider_name?: string | null;
  appointment_date: string;
  appointment_time?: string | null;
  location?: string | null;
  purpose?: string | null;
  followup_required?: boolean;
  followup_date?: string | null;
  notes?: string | null;
}

export interface UpdateAppointmentStatusInput {
  status: AppointmentStatus;
  reason?: string | null;
}

// ─── Screening ──────────────────────────────────────────────

export interface HealthScreening {
  id: string;
  centre_id: string;
  child_id: string;
  screening_type: ScreeningType;
  screening_date: string;
  provider_name: string | null;
  measurements: Record<string, unknown> | null;
  result: string | null;
  outcome: string | null;
  followup_required: boolean;
  followup_date: string | null;
  notes: string | null;
  recorded_by: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateScreeningInput {
  centre_id: string;
  child_id: string;
  screening_type: ScreeningType;
  screening_date: string;
  provider_name?: string | null;
  measurements?: Record<string, unknown> | null;
  result?: string | null;
  outcome?: string | null;
  followup_required?: boolean;
  followup_date?: string | null;
  notes?: string | null;
}

// ─── Immunization ───────────────────────────────────────────

export interface Immunization {
  id: string;
  centre_id: string;
  child_id: string;
  vaccine: string;
  dose: string | null;
  administered_date: string;
  provider_name: string | null;
  next_dose_date: string | null;
  status: ImmunizationStatus;
  notes: string | null;
  recorded_by: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateImmunizationInput {
  centre_id: string;
  child_id: string;
  vaccine: string;
  dose?: string | null;
  administered_date: string;
  provider_name?: string | null;
  next_dose_date?: string | null;
  status?: ImmunizationStatus;
  notes?: string | null;
}

// ─── Health Document ────────────────────────────────────────

export interface HealthDocument {
  id: string;
  centre_id: string;
  child_id: string;
  document_type: HealthDocumentType;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
  metadata: Record<string, unknown> | null;
}

export interface CreateHealthDocumentInput {
  centre_id: string;
  child_id: string;
  document_type: HealthDocumentType;
  file_name: string;
  file_type?: string | null;
  file_size?: number | null;
  storage_path: string;
  description?: string | null;
}

// ─── Health Alert ───────────────────────────────────────────

export interface HealthAlert {
  id: string;
  centre_id: string;
  child_id: string;
  alert_type: HealthAlertType;
  title: string;
  description: string | null;
  severity: string;
  visible_to_caregiver: boolean;
  is_active: boolean;
  source_record_id: string | null;
  created_by: string;
  resolved_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateHealthAlertInput {
  centre_id: string;
  child_id: string;
  alert_type: HealthAlertType;
  title: string;
  description?: string | null;
  severity?: string;
  visible_to_caregiver?: boolean;
  source_record_id?: string | null;
}

// ─── Health Follow-Up ───────────────────────────────────────

export interface HealthFollowup {
  id: string;
  centre_id: string;
  child_id: string;
  followup_type: HealthFollowupType;
  source_record_id: string | null;
  title: string;
  description: string | null;
  status: HealthFollowupStatus;
  responsible_user_id: string | null;
  due_date: string;
  completed_at: string | null;
  outcome: string | null;
  created_by: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateHealthFollowupInput {
  centre_id: string;
  child_id: string;
  followup_type: HealthFollowupType;
  source_record_id?: string | null;
  title: string;
  description?: string | null;
  responsible_user_id?: string | null;
  due_date: string;
}

// ─── Emergency Health View ──────────────────────────────────
// Restricted projection: only essential, authorised information is
// exposed for rapid access. Full medical records are NOT included.

export interface EmergencyHealthView {
  child_id: string;
  blood_group: BloodGroup | null;
  critical_allergies: Array<{ name: string; severity?: string; reaction?: string }>;
  important_conditions: Array<{ name: string; notes?: string }>;
  active_medications: Array<{ medication_name: string; dosage: string | null; frequency: string | null }>;
  emergency_health_info: string | null;
  emergency_contacts: HealthProfile["emergency_contacts"];
  active_alerts: Array<{ title: string; description: string | null; alert_type: HealthAlertType }>;
}

// ─── Search Filters ─────────────────────────────────────────

export interface HealthSearchFilters {
  centre_id: string;
  child_id?: string;
  limit?: number;
  offset?: number;
}

export interface MedicalRecordSearchFilters extends HealthSearchFilters {
  record_type?: MedicalRecordType;
  date_from?: string;
  date_to?: string;
}

export interface AppointmentSearchFilters extends HealthSearchFilters {
  status?: AppointmentStatus;
  date_from?: string;
  date_to?: string;
}

export interface MedicationSearchFilters extends HealthSearchFilters {
  status?: MedicationStatus;
}

export interface ScreeningSearchFilters extends HealthSearchFilters {
  screening_type?: ScreeningType;
}

export interface ImmunizationSearchFilters extends HealthSearchFilters {
  status?: ImmunizationStatus;
}

export interface DocumentSearchFilters extends HealthSearchFilters {
  document_type?: HealthDocumentType;
}

export interface AlertSearchFilters extends HealthSearchFilters {
  is_active?: boolean;
  visible_to_caregiver?: boolean;
}

export interface FollowupSearchFilters extends HealthSearchFilters {
  status?: HealthFollowupStatus;
  followup_type?: HealthFollowupType;
}

// ─── Display Helpers ────────────────────────────────────────

export function getBloodGroupDisplay(bg: BloodGroup): string {
  const map: Record<BloodGroup, string> = {
    A_POSITIVE: "A+",
    A_NEGATIVE: "A−",
    B_POSITIVE: "B+",
    B_NEGATIVE: "B−",
    AB_POSITIVE: "AB+",
    AB_NEGATIVE: "AB−",
    O_POSITIVE: "O+",
    O_NEGATIVE: "O−",
    UNKNOWN: "Unknown",
  };
  return map[bg];
}

export function getMedicalRecordTypeDisplay(t: MedicalRecordType): string {
  const map: Record<MedicalRecordType, string> = {
    consultation: "Consultation",
    diagnosis: "Diagnosis",
    treatment: "Treatment",
    surgery: "Surgery",
    lab_result: "Lab Result",
    imaging: "Imaging",
    referral: "Referral",
    hospitalisation: "Hospitalisation",
    discharge: "Discharge",
    other: "Other",
  };
  return map[t];
}

export function getMedicalVisitTypeDisplay(t: MedicalVisitType): string {
  const map: Record<MedicalVisitType, string> = {
    clinic: "Clinic",
    hospital: "Hospital",
    doctor_consultation: "Doctor Consultation",
    dental: "Dental",
    specialist: "Specialist",
    other: "Other",
  };
  return map[t];
}

export function getMedicationStatusDisplay(s: MedicationStatus): string {
  const map: Record<MedicationStatus, string> = {
    ACTIVE: "Active",
    COMPLETED: "Completed",
    DISCONTINUED: "Discontinued",
  };
  return map[s];
}

export function getMedicationAdminStatusDisplay(s: MedicationAdminStatus): string {
  const map: Record<MedicationAdminStatus, string> = {
    GIVEN: "Given",
    MISSED: "Missed",
    REFUSED: "Refused",
    NOT_AVAILABLE: "Not Available",
    OTHER_APPROVED: "Other Approved",
  };
  return map[s];
}

export function getAppointmentTypeDisplay(t: AppointmentType): string {
  const map: Record<AppointmentType, string> = {
    clinic: "Clinic",
    hospital: "Hospital",
    doctor_consultation: "Doctor Consultation",
    dental: "Dental",
    specialist: "Specialist",
    therapy: "Therapy",
    followup: "Follow-Up",
    other: "Other",
  };
  return map[t];
}

export function getAppointmentStatusDisplay(s: AppointmentStatus): string {
  const map: Record<AppointmentStatus, string> = {
    SCHEDULED: "Scheduled",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    MISSED: "Missed",
    RESCHEDULED: "Rescheduled",
  };
  return map[s];
}

export function getScreeningTypeDisplay(t: ScreeningType): string {
  const map: Record<ScreeningType, string> = {
    general_health: "General Health",
    dental: "Dental",
    vision: "Vision",
    hearing: "Hearing",
    growth_monitoring: "Growth Monitoring",
    other: "Other",
  };
  return map[t];
}

export function getImmunizationStatusDisplay(s: ImmunizationStatus): string {
  const map: Record<ImmunizationStatus, string> = {
    COMPLETED: "Completed",
    DUE: "Due",
    OVERDUE: "Overdue",
  };
  return map[s];
}

export function getHealthDocumentTypeDisplay(t: HealthDocumentType): string {
  const map: Record<HealthDocumentType, string> = {
    medical_report: "Medical Report",
    prescription: "Prescription",
    referral_letter: "Referral Letter",
    lab_result: "Lab Result",
    immunization_record: "Immunization Record",
    discharge_summary: "Discharge Summary",
    other: "Other",
  };
  return map[t];
}

export function getHealthAlertTypeDisplay(t: HealthAlertType): string {
  const map: Record<HealthAlertType, string> = {
    allergy: "Allergy",
    medication_requirement: "Medication Requirement",
    emergency_health_information: "Emergency Health Information",
    followup_due: "Follow-Up Due",
    other: "Other",
  };
  return map[t];
}

export function getHealthFollowupTypeDisplay(t: HealthFollowupType): string {
  const map: Record<HealthFollowupType, string> = {
    appointment: "Appointment",
    treatment: "Treatment",
    screening: "Screening",
    immunization: "Immunization",
    medication: "Medication",
    other: "Other",
  };
  return map[t];
}

export function getHealthFollowupStatusDisplay(s: HealthFollowupStatus): string {
  const map: Record<HealthFollowupStatus, string> = {
    open: "Open",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return map[s];
}
