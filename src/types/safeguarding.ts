/**
 * Safeguarding Types
 *
 * Defines safeguarding concerns, actions, escalations, and
 * documents for child protection.
 *
 * SECURITY:
 *   - centre_id is always derived server-side, never from client input
 *   - Safeguarding records are never physically deleted
 *   - Access requires safeguarding-specific permissions, NOT just children.view
 */

// ─── Safeguarding Status ─────────────────────────────────────

export const SAFEGUARDING_STATUSES = [
  "reported",
  "initial_review",
  "action_required",
  "under_investigation",
  "resolved",
  "closed",
] as const;

export type SafeguardingStatus = (typeof SAFEGUARDING_STATUSES)[number];

// ─── Safeguarding Severity ───────────────────────────────────

export const SAFEGUARDING_SEVERITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export type SafeguardingSeverity = (typeof SAFEGUARDING_SEVERITIES)[number];

// ─── Safeguarding Concern Type ───────────────────────────────

export const SAFEGUARDING_CONCERN_TYPES = [
  "abuse",
  "neglect",
  "exploitation",
  "violence",
  "missing_child",
  "self_harm",
  "unsafe_environment",
  "trafficking",
  "other",
] as const;

export type SafeguardingConcernType =
  (typeof SAFEGUARDING_CONCERN_TYPES)[number];

// ─── Escalation Status ───────────────────────────────────────

export const ESCALATION_STATUSES = [
  "pending",
  "acknowledged",
  "in_progress",
  "completed",
] as const;

export type EscalationStatus = (typeof ESCALATION_STATUSES)[number];

// ─── Valid Status Transitions ────────────────────────────────

export const SAFEGUARDING_STATUS_TRANSITIONS: Record<
  SafeguardingStatus,
  readonly (typeof SAFEGUARDING_STATUSES)[number][]
> = {
  reported: ["initial_review", "closed"],
  initial_review: ["action_required", "under_investigation", "resolved", "closed"],
  action_required: ["under_investigation", "resolved", "closed"],
  under_investigation: ["action_required", "resolved", "closed"],
  resolved: ["closed"],
  closed: [],
};

export const ESCALATION_STATUS_TRANSITIONS: Record<
  EscalationStatus,
  readonly EscalationStatus[]
> = {
  pending: ["acknowledged", "completed"],
  acknowledged: ["in_progress", "completed"],
  in_progress: ["completed"],
  completed: [],
};

// ─── Safeguarding Concern ────────────────────────────────────

export interface SafeguardingConcern {
  id: string;
  centre_id: string;
  child_id: string;
  case_id: string | null;
  concern_type: SafeguardingConcernType;
  title: string;
  description: string;
  severity: SafeguardingSeverity;
  status: SafeguardingStatus;
  reported_by: string;
  reported_at: string;
  assigned_to: string | null;
  location: string | null;
  witnesses: string | null;
  evidence_summary: string | null;
  action_taken: string | null;
  external_referral: boolean;
  external_agency: string | null;
  external_reference: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ─── Create Safeguarding Concern Input ───────────────────────

export interface CreateSafeguardingConcernInput {
  centre_id: string;
  child_id: string;
  case_id?: string | null;
  concern_type: SafeguardingConcernType;
  title: string;
  description: string;
  severity?: SafeguardingSeverity;
  location?: string | null;
  witnesses?: string | null;
  evidence_summary?: string | null;
  action_taken?: string | null;
  external_referral?: boolean;
  external_agency?: string | null;
  external_reference?: string | null;
  assigned_to?: string | null;
}

// ─── Update Safeguarding Concern Input ───────────────────────

export interface UpdateSafeguardingConcernInput {
  title?: string;
  description?: string;
  severity?: SafeguardingSeverity;
  assigned_to?: string | null;
  location?: string | null;
  witnesses?: string | null;
  evidence_summary?: string | null;
  action_taken?: string | null;
  external_referral?: boolean;
  external_agency?: string | null;
  external_reference?: string | null;
  resolution_notes?: string | null;
}

// ─── Update Safeguarding Status Input ────────────────────────

export interface UpdateSafeguardingStatusInput {
  new_status: SafeguardingStatus;
  reason?: string | null;
}

// ─── Safeguarding Status History ─────────────────────────────

export interface SafeguardingStatusHistory {
  id: string;
  concern_id: string;
  centre_id: string;
  previous_status: SafeguardingStatus | null;
  new_status: SafeguardingStatus;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
}

// ─── Safeguarding Action ─────────────────────────────────────

export interface SafeguardingAction {
  id: string;
  concern_id: string;
  centre_id: string;
  action_type: string;
  description: string;
  status: string;
  assigned_to: string | null;
  due_date: string | null;
  completed_date: string | null;
  outcome: string | null;
  notes: string | null;
  created_by: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSafeguardingActionInput {
  concern_id: string;
  centre_id: string;
  action_type: string;
  description: string;
  assigned_to?: string | null;
  due_date?: string | null;
}

export interface UpdateSafeguardingActionInput {
  action_type?: string;
  description?: string;
  status?: string;
  assigned_to?: string | null;
  due_date?: string | null;
  completed_date?: string | null;
  outcome?: string | null;
  notes?: string | null;
}

// ─── Safeguarding Escalation ─────────────────────────────────

export interface SafeguardingEscalation {
  id: string;
  concern_id: string;
  centre_id: string;
  title: string;
  description: string;
  reason: string;
  status: EscalationStatus;
  escalated_by: string;
  escalated_to: string | null;
  escalated_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEscalationInput {
  concern_id: string;
  centre_id: string;
  title: string;
  description: string;
  reason: string;
  escalated_to?: string | null;
}

export interface UpdateEscalationInput {
  status?: EscalationStatus;
  resolution_notes?: string | null;
}

// ─── Safeguarding Document ───────────────────────────────────

export interface SafeguardingDocument {
  id: string;
  concern_id: string;
  centre_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  uploaded_by: string;
  uploaded_at: string;
  metadata: Record<string, unknown> | null;
}

// ─── Safeguarding Search Filters ─────────────────────────────

export interface SafeguardingSearchFilters {
  centre_id: string;
  child_id?: string;
  case_id?: string;
  status?: SafeguardingStatus;
  severity?: SafeguardingSeverity;
  concern_type?: SafeguardingConcernType;
  assigned_to?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// ─── Action Search Filters ───────────────────────────────────

export interface SafeguardingActionSearchFilters {
  centre_id: string;
  concern_id?: string;
  status?: string;
  assigned_to?: string;
  limit?: number;
  offset?: number;
}

// ─── Escalation Search Filters ───────────────────────────────

export interface EscalationSearchFilters {
  centre_id: string;
  concern_id?: string;
  status?: EscalationStatus;
  limit?: number;
  offset?: number;
}

// ─── Display Helpers ─────────────────────────────────────────

export function getSafeguardingStatusDisplay(status: SafeguardingStatus): string {
  const map: Record<SafeguardingStatus, string> = {
    reported: "Reported",
    initial_review: "Initial Review",
    action_required: "Action Required",
    under_investigation: "Under Investigation",
    resolved: "Resolved",
    closed: "Closed",
  };
  return map[status];
}

export function getSafeguardingSeverityDisplay(
  severity: SafeguardingSeverity,
): string {
  const map: Record<SafeguardingSeverity, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
  };
  return map[severity];
}

export function getSafeguardingConcernTypeDisplay(
  type: SafeguardingConcernType,
): string {
  const map: Record<SafeguardingConcernType, string> = {
    abuse: "Abuse",
    neglect: "Neglect",
    exploitation: "Exploitation",
    violence: "Violence",
    missing_child: "Missing Child",
    self_harm: "Self-Harm",
    unsafe_environment: "Unsafe Environment",
    trafficking: "Trafficking",
    other: "Other",
  };
  return map[type];
}

export function getEscalationStatusDisplay(status: EscalationStatus): string {
  const map: Record<EscalationStatus, string> = {
    pending: "Pending",
    acknowledged: "Acknowledged",
    in_progress: "In Progress",
    completed: "Completed",
  };
  return map[status];
}

/**
 * Check if a safeguarding status transition is valid.
 */
export function isValidSafeguardingStatusTransition(
  from: SafeguardingStatus,
  to: SafeguardingStatus,
): boolean {
  return SAFEGUARDING_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Check if an escalation status transition is valid.
 */
export function isValidEscalationStatusTransition(
  from: EscalationStatus,
  to: EscalationStatus,
): boolean {
  return ESCALATION_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
