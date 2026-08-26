/**
 * Case Management & Assessment Types
 *
 * Defines the case, assessment, case plan, intervention,
 * and case note entities.
 *
 * SECURITY:
 *   - centre_id is always derived server-side, never from client input
 *   - Case records are never physically deleted
 *   - Case notes are immutable after creation (append-only)
 */

// ─── Case Status ─────────────────────────────────────────────

export const CASE_STATUSES = [
  "open",
  "under_assessment",
  "active_plan",
  "on_hold",
  "resolved",
  "closed",
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];

// ─── Case Type ───────────────────────────────────────────────

export const CASE_TYPES = [
  "protection",
  "family_reunification",
  "behavioural",
  "education",
  "health",
  "placement",
  "legal",
  "psychosocial",
  "other",
] as const;

export type CaseType = (typeof CASE_TYPES)[number];

// ─── Case Priority ───────────────────────────────────────────

export const CASE_PRIORITIES = ["low", "medium", "high", "critical"] as const;

export type CasePriority = (typeof CASE_PRIORITIES)[number];

// ─── Case Classification ─────────────────────────────────────

export const CASE_CLASSIFICATIONS = [
  "standard",
  "confidential",
  "highly_confidential",
] as const;

export type CaseClassification = (typeof CASE_CLASSIFICATIONS)[number];

// ─── Assessment Type ─────────────────────────────────────────

export const ASSESSMENT_TYPES = [
  "initial",
  "periodic",
  "specialized",
  "other",
] as const;

export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

// ─── Case Plan Status ────────────────────────────────────────

export const CASE_PLAN_STATUSES = [
  "draft",
  "active",
  "completed",
  "archived",
] as const;

export type CasePlanStatus = (typeof CASE_PLAN_STATUSES)[number];

// ─── Case Plan Item Status ───────────────────────────────────

export const CASE_PLAN_ITEM_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type CasePlanItemStatus = (typeof CASE_PLAN_ITEM_STATUSES)[number];

// ─── Case Note Type ──────────────────────────────────────────

export const CASE_NOTE_TYPES = [
  "general",
  "assessment",
  "plan_review",
  "incident",
  "progress",
  "communication",
  "safeguarding",
  "other",
] as const;

export type CaseNoteType = (typeof CASE_NOTE_TYPES)[number];

// ─── Valid Status Transitions ────────────────────────────────

export const CASE_STATUS_TRANSITIONS: Record<CaseStatus, readonly CaseStatus[]> = {
  open: ["under_assessment", "on_hold", "closed"],
  under_assessment: ["active_plan", "on_hold", "resolved", "closed"],
  active_plan: ["on_hold", "resolved", "closed"],
  on_hold: ["open", "under_assessment", "active_plan", "closed"],
  resolved: ["closed", "open"],
  closed: ["open"],
};

export const CASE_PLAN_STATUS_TRANSITIONS: Record<CasePlanStatus, readonly CasePlanStatus[]> = {
  draft: ["active", "archived"],
  active: ["completed", "archived", "draft"],
  completed: ["archived", "active"],
  archived: ["draft"],
};

// ─── Case Record ─────────────────────────────────────────────

export interface Case {
  id: string;
  centre_id: string;
  reference_number: string;
  child_id: string;
  title: string;
  description: string | null;
  case_type: CaseType;
  status: CaseStatus;
  priority: CasePriority;
  classification: CaseClassification;
  assigned_to: string | null;
  opened_by: string;
  opened_at: string;
  closed_at: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ─── Create Case Input ───────────────────────────────────────

export interface CreateCaseInput {
  centre_id: string;
  child_id: string;
  title: string;
  description?: string | null;
  case_type: CaseType;
  priority?: CasePriority;
  classification?: CaseClassification;
  assigned_to?: string | null;
}

// ─── Update Case Input ───────────────────────────────────────

export interface UpdateCaseInput {
  title?: string;
  description?: string | null;
  case_type?: CaseType;
  priority?: CasePriority;
  classification?: CaseClassification;
  assigned_to?: string | null;
  resolution_notes?: string | null;
}

// ─── Update Case Status Input ────────────────────────────────

export interface UpdateCaseStatusInput {
  new_status: CaseStatus;
  reason?: string | null;
}

// ─── Case Status History ─────────────────────────────────────

export interface CaseStatusHistory {
  id: string;
  case_id: string;
  centre_id: string;
  previous_status: CaseStatus | null;
  new_status: CaseStatus;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
}

// ─── Case Assessment ─────────────────────────────────────────

export interface CaseAssessment {
  id: string;
  case_id: string;
  centre_id: string;
  assessment_type: AssessmentType;
  title: string;
  summary: string | null;
  findings: string | null;
  recommendations: string | null;
  conducted_by: string;
  conducted_at: string;
  next_review_date: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAssessmentInput {
  case_id: string;
  centre_id: string;
  assessment_type: AssessmentType;
  title: string;
  summary?: string | null;
  findings?: string | null;
  recommendations?: string | null;
  next_review_date?: string | null;
}

export interface UpdateAssessmentInput {
  title?: string;
  summary?: string | null;
  findings?: string | null;
  recommendations?: string | null;
  next_review_date?: string | null;
}

// ─── Case Plan ───────────────────────────────────────────────

export interface CasePlan {
  id: string;
  case_id: string;
  centre_id: string;
  title: string;
  description: string | null;
  status: CasePlanStatus;
  start_date: string;
  end_date: string | null;
  review_frequency: string | null;
  next_review_date: string | null;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCasePlanInput {
  case_id: string;
  centre_id: string;
  title: string;
  description?: string | null;
  start_date?: string;
  end_date?: string | null;
  review_frequency?: string | null;
  next_review_date?: string | null;
}

export interface UpdateCasePlanInput {
  title?: string;
  description?: string | null;
  end_date?: string | null;
  review_frequency?: string | null;
  next_review_date?: string | null;
  metadata?: Record<string, unknown> | null;
}

// ─── Case Plan Item ──────────────────────────────────────────

export interface CasePlanItem {
  id: string;
  case_plan_id: string;
  centre_id: string;
  objective: string;
  description: string | null;
  status: CasePlanItemStatus;
  responsible_person: string | null;
  target_date: string | null;
  completed_date: string | null;
  completion_notes: string | null;
  sort_order: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCasePlanItemInput {
  case_plan_id: string;
  centre_id: string;
  objective: string;
  description?: string | null;
  responsible_person?: string | null;
  target_date?: string | null;
  sort_order?: number;
}

export interface UpdateCasePlanItemInput {
  objective?: string;
  description?: string | null;
  status?: CasePlanItemStatus;
  responsible_person?: string | null;
  target_date?: string | null;
  completed_date?: string | null;
  completion_notes?: string | null;
  sort_order?: number;
}

// ─── Intervention ────────────────────────────────────────────

export interface Intervention {
  id: string;
  case_id: string;
  centre_id: string;
  case_plan_item_id: string | null;
  title: string;
  description: string | null;
  intervention_type: string;
  status: string;
  scheduled_date: string | null;
  completed_date: string | null;
  outcome: string | null;
  notes: string | null;
  conducted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInterventionInput {
  case_id: string;
  centre_id: string;
  case_plan_item_id?: string | null;
  title: string;
  description?: string | null;
  intervention_type: string;
  scheduled_date?: string | null;
  conducted_by?: string | null;
}

export interface UpdateInterventionInput {
  title?: string;
  description?: string | null;
  intervention_type?: string;
  status?: string;
  scheduled_date?: string | null;
  completed_date?: string | null;
  outcome?: string | null;
  notes?: string | null;
  conducted_by?: string | null;
}

// ─── Case Note ───────────────────────────────────────────────

export interface CaseNote {
  id: string;
  case_id: string;
  centre_id: string;
  note_type: CaseNoteType;
  content: string;
  author_id: string;
  author_name: string | null;
  is_pinned: boolean;
  version: number;
  parent_note_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCaseNoteInput {
  case_id: string;
  centre_id: string;
  note_type?: CaseNoteType;
  content: string;
  author_name?: string | null;
  is_pinned?: boolean;
  parent_note_id?: string | null;
}

// ─── Case Document ───────────────────────────────────────────

export interface CaseDocument {
  id: string;
  case_id: string;
  centre_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  classification: CaseClassification;
  uploaded_by: string;
  uploaded_at: string;
  metadata: Record<string, unknown> | null;
}

// ─── Case Search Filters ─────────────────────────────────────

export interface CaseSearchFilters {
  centre_id: string;
  status?: CaseStatus;
  case_type?: CaseType;
  priority?: CasePriority;
  classification?: CaseClassification;
  child_id?: string;
  assigned_to?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// ─── Assessment Search Filters ───────────────────────────────

export interface AssessmentSearchFilters {
  centre_id: string;
  case_id: string;
  assessment_type?: AssessmentType;
  limit?: number;
  offset?: number;
}

// ─── Case Note Search Filters ────────────────────────────────

export interface CaseNoteSearchFilters {
  centre_id: string;
  case_id: string;
  note_type?: CaseNoteType;
  is_pinned?: boolean;
  limit?: number;
  offset?: number;
}

// ─── Display Helpers ─────────────────────────────────────────

export function getCaseStatusDisplay(status: CaseStatus): string {
  const map: Record<CaseStatus, string> = {
    open: "Open",
    under_assessment: "Under Assessment",
    active_plan: "Active Plan",
    on_hold: "On Hold",
    resolved: "Resolved",
    closed: "Closed",
  };
  return map[status];
}

export function getCaseTypeDisplay(type: CaseType): string {
  const map: Record<CaseType, string> = {
    protection: "Protection",
    family_reunification: "Family Reunification",
    behavioural: "Behavioural",
    education: "Education",
    health: "Health",
    placement: "Placement",
    legal: "Legal",
    psychosocial: "Psychosocial",
    other: "Other",
  };
  return map[type];
}

export function getCasePriorityDisplay(priority: CasePriority): string {
  const map: Record<CasePriority, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
  };
  return map[priority];
}

export function getCaseClassificationDisplay(
  classification: CaseClassification,
): string {
  const map: Record<CaseClassification, string> = {
    standard: "Standard",
    confidential: "Confidential",
    highly_confidential: "Highly Confidential",
  };
  return map[classification];
}

export function getAssessmentTypeDisplay(type: AssessmentType): string {
  const map: Record<AssessmentType, string> = {
    initial: "Initial",
    periodic: "Periodic",
    specialized: "Specialized",
    other: "Other",
  };
  return map[type];
}

export function getCasePlanStatusDisplay(status: CasePlanStatus): string {
  const map: Record<CasePlanStatus, string> = {
    draft: "Draft",
    active: "Active",
    completed: "Completed",
    archived: "Archived",
  };
  return map[status];
}

export function getCasePlanItemStatusDisplay(
  status: CasePlanItemStatus,
): string {
  const map: Record<CasePlanItemStatus, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return map[status];
}

export function getCaseNoteTypeDisplay(type: CaseNoteType): string {
  const map: Record<CaseNoteType, string> = {
    general: "General",
    assessment: "Assessment",
    plan_review: "Plan Review",
    incident: "Incident",
    progress: "Progress",
    communication: "Communication",
    safeguarding: "Safeguarding",
    other: "Other",
  };
  return map[type];
}

/**
 * Check if a case status transition is valid.
 */
export function isValidCaseStatusTransition(
  from: CaseStatus,
  to: CaseStatus,
): boolean {
  return CASE_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Check if a case plan status transition is valid.
 */
export function isValidCasePlanStatusTransition(
  from: CasePlanStatus,
  to: CasePlanStatus,
): boolean {
  return CASE_PLAN_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
