/**
 * Staff Management & Workforce Operations Types
 *
 * Manages who works at the centre, what role they perform, whether
 * they are active, when they joined, their employment/work information,
 * assigned responsibilities, and their history at the centre.
 *
 * SECURITY:
 *   - centre_id is always derived server-side, never from client input
 *   - staff.* permissions are granted granularly; staff membership is
 *     separate from the user-account/roles authorization system
 *   - Staff employment status is separate from user account status
 *     (a staff member may be ON_LEAVE while their account stays active)
 *   - Staff history is preserved; records are never deleted
 *   - Emergency contact information and staff documents are restricted
 *   - This module is NOT a payroll system (no salary processing)
 */

// ─── Staff Employment Status ────────────────────────────────
// Logically separate from user account status.

export const STAFF_STATUSES = [
  "ACTIVE",
  "ON_LEAVE",
  "SUSPENDED",
  "INACTIVE",
  "ENDED",
] as const;

export type StaffStatus = (typeof STAFF_STATUSES)[number];

// ─── Staff History Event Types ──────────────────────────────

export const STAFF_HISTORY_EVENTS = [
  "JOINED",
  "ROLE_CHANGED",
  "JOB_TITLE_CHANGED",
  "ASSIGNMENT_CHANGED",
  "STATUS_CHANGED",
  "ENDED",
  "OTHER",
] as const;

export type StaffHistoryEvent = (typeof STAFF_HISTORY_EVENTS)[number];

// ─── Assignment Status ──────────────────────────────────────

export const STAFF_ASSIGNMENT_STATUSES = ["ACTIVE", "ENDED"] as const;

export type StaffAssignmentStatus = (typeof STAFF_ASSIGNMENT_STATUSES)[number];

// ─── Training Status ────────────────────────────────────────

export const STAFF_TRAINING_STATUSES = ["PENDING", "COMPLETED"] as const;

export type StaffTrainingStatus = (typeof STAFF_TRAINING_STATUSES)[number];

// ─── Qualification Verification Status ──────────────────────

export const STAFF_VERIFICATION_STATUSES = [
  "VERIFIED",
  "PENDING",
  "NOT_VERIFIED",
] as const;

export type StaffVerificationStatus = (typeof STAFF_VERIFICATION_STATUSES)[number];

// ─── Staff Document Types ───────────────────────────────────

export const STAFF_DOCUMENT_TYPES = [
  "EMPLOYMENT_AGREEMENT",
  "IDENTIFICATION",
  "QUALIFICATION_CERTIFICATE",
  "TRAINING_CERTIFICATE",
  "OTHER",
] as const;

export type StaffDocumentType = (typeof STAFF_DOCUMENT_TYPES)[number];

export const STAFF_DOCUMENTS_BUCKET = "staff-documents";

// ─── Staff Profile ──────────────────────────────────────────

export interface StaffProfile {
  id: string;
  centre_id: string;
  user_profile_id: string | null;
  staff_identifier: string | null;
  job_title: string;
  department: string | null;
  operational_role: string | null;
  employment_status: StaffStatus;
  start_date: string | null;
  end_date: string | null;
  work_phone: string | null;
  work_email: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateStaffInput {
  centre_id: string;
  user_profile_id?: string | null;
  staff_identifier?: string | null;
  job_title: string;
  department?: string | null;
  operational_role?: string | null;
  employment_status?: StaffStatus;
  start_date?: string | null;
  end_date?: string | null;
  work_phone?: string | null;
  work_email?: string | null;
  notes?: string | null;
}

export interface UpdateStaffInput {
  user_profile_id?: string | null;
  staff_identifier?: string | null;
  job_title?: string;
  department?: string | null;
  operational_role?: string | null;
  employment_status?: StaffStatus;
  start_date?: string | null;
  end_date?: string | null;
  work_phone?: string | null;
  work_email?: string | null;
  notes?: string | null;
}

// ─── Staff History Entry ────────────────────────────────────

export interface StaffHistory {
  id: string;
  staff_id: string;
  event_type: StaffHistoryEvent;
  description: string | null;
  changed_by: string;
  created_at: string;
}

// ─── Staff Assignment ───────────────────────────────────────

export interface StaffAssignment {
  id: string;
  centre_id: string;
  staff_id: string;
  responsibility_type: string;
  description: string | null;
  assigned_by: string;
  assigned_date: string | null;
  status: StaffAssignmentStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateStaffAssignmentInput {
  centre_id: string;
  staff_id: string;
  responsibility_type: string;
  description?: string | null;
  assigned_date?: string | null;
}

// ─── Staff Training ─────────────────────────────────────────

export interface StaffTraining {
  id: string;
  centre_id: string;
  staff_id: string;
  training_title: string;
  provider: string | null;
  training_date: string | null;
  due_date: string | null;
  completion_status: StaffTrainingStatus;
  certificate_reference: string | null;
  expiry_date: string | null;
  notes: string | null;
  recorded_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateStaffTrainingInput {
  centre_id: string;
  staff_id: string;
  training_title: string;
  provider?: string | null;
  training_date?: string | null;
  due_date?: string | null;
  completion_status?: StaffTrainingStatus;
  certificate_reference?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
}

export interface UpdateStaffTrainingInput {
  training_title?: string | null;
  provider?: string | null;
  training_date?: string | null;
  due_date?: string | null;
  completion_status?: StaffTrainingStatus;
  certificate_reference?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
}

// ─── Staff Qualification ────────────────────────────────────

export interface StaffQualification {
  id: string;
  centre_id: string;
  staff_id: string;
  qualification: string;
  institution: string | null;
  qualification_year: string | null;
  verification_status: StaffVerificationStatus;
  notes: string | null;
  recorded_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateStaffQualificationInput {
  centre_id: string;
  staff_id: string;
  qualification: string;
  institution?: string | null;
  qualification_year?: string | null;
  verification_status?: StaffVerificationStatus;
  notes?: string | null;
}

// ─── Staff Emergency Contact ────────────────────────────────

export interface StaffEmergencyContact {
  id: string;
  centre_id: string;
  staff_id: string;
  contact_name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateStaffEmergencyContactInput {
  centre_id: string;
  staff_id: string;
  contact_name: string;
  relationship?: string | null;
  phone?: string | null;
  email?: string | null;
}

// ─── Staff Document ─────────────────────────────────────────

export interface StaffDocument {
  id: string;
  centre_id: string;
  staff_id: string;
  document_type: StaffDocumentType;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
  metadata: Record<string, unknown> | null;
}

export interface CreateStaffDocumentInput {
  centre_id: string;
  staff_id: string;
  document_type: StaffDocumentType;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  description?: string | null;
}

// ─── Staff Dashboard Overview ───────────────────────────────

export interface StaffOverview {
  total_active: number;
  on_leave: number;
  suspended: number;
  ended: number;
  by_role: { operational_role: string | null; count: number }[];
  recent_changes: StaffProfile[];
  training_attention: number;
}

// ─── Search Filters ─────────────────────────────────────────

export interface StaffSearchFilters {
  centre_id: string;
  search?: string;
  employment_status?: StaffStatus;
  operational_role?: string;
  department?: string;
  limit?: number;
  offset?: number;
}

// ─── Display Helpers ────────────────────────────────────────

export function getStaffStatusDisplay(s: StaffStatus): string {
  const map: Record<StaffStatus, string> = {
    ACTIVE: "Active",
    ON_LEAVE: "On Leave",
    SUSPENDED: "Suspended",
    INACTIVE: "Inactive",
    ENDED: "Ended",
  };
  return map[s];
}

export function getStaffHistoryEventDisplay(e: StaffHistoryEvent): string {
  const map: Record<StaffHistoryEvent, string> = {
    JOINED: "Joined Centre",
    ROLE_CHANGED: "Role Changed",
    JOB_TITLE_CHANGED: "Job Title Changed",
    ASSIGNMENT_CHANGED: "Assignment Changed",
    STATUS_CHANGED: "Status Changed",
    ENDED: "Employment Ended",
    OTHER: "Other",
  };
  return map[e];
}

export function getStaffTrainingStatusDisplay(s: StaffTrainingStatus): string {
  const map: Record<StaffTrainingStatus, string> = {
    PENDING: "Pending",
    COMPLETED: "Completed",
  };
  return map[s];
}

export function getStaffVerificationStatusDisplay(s: StaffVerificationStatus): string {
  const map: Record<StaffVerificationStatus, string> = {
    VERIFIED: "Verified",
    PENDING: "Pending",
    NOT_VERIFIED: "Not Verified",
  };
  return map[s];
}

export function getStaffDocumentTypeDisplay(t: StaffDocumentType): string {
  const map: Record<StaffDocumentType, string> = {
    EMPLOYMENT_AGREEMENT: "Employment Agreement",
    IDENTIFICATION: "Identification",
    QUALIFICATION_CERTIFICATE: "Qualification Certificate",
    TRAINING_CERTIFICATE: "Training Certificate",
    OTHER: "Other",
  };
  return map[t];
}