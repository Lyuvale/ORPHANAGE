/**
 * Visit & Family Contact Types
 *
 * Defines the visit, visit restriction, and contact attempt entities.
 *
 * SECURITY:
 *   - centre_id is always derived server-side, never from client input
 *   - Visit records are never physically deleted
 *   - Restrictions cannot be bypassed from the frontend
 */

// ─── Visit Type ─────────────────────────────────────────────

export const VISIT_TYPES = [
  "in_person",
  "phone",
  "video",
  "off_site",
  "other_approved",
] as const;

export type VisitType = (typeof VISIT_TYPES)[number];

// ─── Visit Status ───────────────────────────────────────────

export const VISIT_STATUSES = [
  "requested",
  "pending_approval",
  "approved",
  "scheduled",
  "checked_in",
  "completed",
  "cancelled",
  "rejected",
  "no_show",
] as const;

export type VisitStatus = (typeof VISIT_STATUSES)[number];

// ─── Visit Outcome ──────────────────────────────────────────

export const VISIT_OUTCOMES = [
  "positive",
  "neutral",
  "negative",
  "concern_noted",
  "incident_reported",
  "pending_review",
  "none",
] as const;

export type VisitOutcome = (typeof VISIT_OUTCOMES)[number];

// ─── Restriction Type ───────────────────────────────────────

export const RESTRICTION_TYPES = [
  "no_visits",
  "supervised_only",
  "limited_frequency",
  "limited_duration",
  "phone_only",
  "temporary_ban",
  "other",
] as const;

export type RestrictionType = (typeof RESTRICTION_TYPES)[number];

// ─── Contact Attempt Type ───────────────────────────────────

export const CONTACT_ATTEMPT_TYPES = [
  "phone_call",
  "message",
  "visit_attempt",
  "video_call",
  "email",
  "other",
] as const;

export type ContactAttemptType = (typeof CONTACT_ATTEMPT_TYPES)[number];

// ─── Contact Attempt Result ─────────────────────────────────

export const CONTACT_ATTEMPT_RESULTS = [
  "successful",
  "unsuccessful",
  "no_answer",
  "wrong_number",
  "voicemail_left",
  "cancelled",
  "other",
] as const;

export type ContactAttemptResult = (typeof CONTACT_ATTEMPT_RESULTS)[number];

// ─── Valid Status Transitions ───────────────────────────────

export const VISIT_STATUS_TRANSITIONS: Record<VisitStatus, readonly VisitStatus[]> = {
  requested: ["pending_approval", "approved", "cancelled", "rejected"],
  pending_approval: ["approved", "cancelled", "rejected"],
  approved: ["scheduled", "cancelled", "no_show"],
  scheduled: ["checked_in", "cancelled", "no_show"],
  checked_in: ["completed"],
  completed: [],
  cancelled: [],
  rejected: [],
  no_show: ["requested"],
};

// ─── Visit Record ───────────────────────────────────────────

export interface Visit {
  id: string;
  centre_id: string;
  reference_number: string;
  child_id: string;
  guardian_id: string;
  visit_type: VisitType;
  status: VisitStatus;
  scheduled_date: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  actual_check_in_time: string | null;
  actual_check_out_time: string | null;
  location: string | null;
  purpose: string;
  notes: string | null;
  outcome: VisitOutcome | null;
  outcome_notes: string | null;
  child_response: string | null;
  family_response: string | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  follow_up_staff_id: string | null;
  supervised: boolean;
  supervisor_id: string | null;
  supervision_notes: string | null;
  supervisor_notes: string | null;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  checked_in_by: string | null;
  checked_out_by: string | null;
  created_by: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ─── Create Visit Input ─────────────────────────────────────

export interface CreateVisitInput {
  centre_id: string;
  child_id: string;
  guardian_id: string;
  visit_type?: VisitType;
  scheduled_date: string;
  scheduled_start_time?: string | null;
  scheduled_end_time?: string | null;
  location?: string | null;
  purpose: string;
  notes?: string | null;
}

// ─── Update Visit Input ─────────────────────────────────────

export interface UpdateVisitInput {
  visit_type?: VisitType;
  scheduled_date?: string;
  scheduled_start_time?: string | null;
  scheduled_end_time?: string | null;
  location?: string | null;
  purpose?: string;
  notes?: string | null;
}

// ─── Update Visit Status Input ──────────────────────────────

export interface UpdateVisitStatusInput {
  new_status: VisitStatus;
  reason?: string | null;
}

// ─── Check-In Input ─────────────────────────────────────────

export interface CheckInInput {
  verification_method?: string | null;
  notes?: string | null;
}

// ─── Check-Out Input ────────────────────────────────────────

export interface CheckOutInput {
  notes?: string | null;
}

// ─── Visit Outcome Input ────────────────────────────────────

export interface VisitOutcomeInput {
  outcome: VisitOutcome;
  outcome_notes?: string | null;
  child_response?: string | null;
  family_response?: string | null;
  follow_up_required?: boolean;
  follow_up_date?: string | null;
  follow_up_staff_id?: string | null;
}

// ─── Visit Status History ───────────────────────────────────

export interface VisitStatusHistory {
  id: string;
  visit_id: string;
  centre_id: string;
  previous_status: VisitStatus | null;
  new_status: VisitStatus;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
}

// ─── Visit Restriction ──────────────────────────────────────

export interface VisitRestriction {
  id: string;
  centre_id: string;
  child_id: string;
  guardian_id: string;
  restriction_type: RestrictionType;
  reason: string;
  source_authority: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_by: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRestrictionInput {
  centre_id: string;
  child_id: string;
  guardian_id: string;
  restriction_type: RestrictionType;
  reason: string;
  source_authority?: string | null;
  start_date?: string;
  end_date?: string | null;
}

export interface UpdateRestrictionInput {
  restriction_type?: RestrictionType;
  reason?: string;
  source_authority?: string | null;
  end_date?: string | null;
  is_active?: boolean;
}

// ─── Contact Attempt ────────────────────────────────────────

export interface ContactAttempt {
  id: string;
  centre_id: string;
  child_id: string;
  guardian_id: string;
  contact_type: ContactAttemptType;
  result: ContactAttemptResult;
  attempted_at: string;
  reason_unsuccessful: string | null;
  notes: string | null;
  staff_member_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface CreateContactAttemptInput {
  centre_id: string;
  child_id: string;
  guardian_id: string;
  contact_type: ContactAttemptType;
  result: ContactAttemptResult;
  attempted_at?: string;
  reason_unsuccessful?: string | null;
  notes?: string | null;
  staff_member_id: string;
}

// ─── Search Filters ─────────────────────────────────────────

export interface VisitSearchFilters {
  centre_id: string;
  status?: VisitStatus;
  visit_type?: VisitType;
  child_id?: string;
  child_ids?: string[];
  guardian_id?: string;
  date_from?: string;
  date_to?: string;
  upcoming?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface RestrictionSearchFilters {
  centre_id: string;
  child_id?: string;
  guardian_id?: string;
  is_active?: boolean;
  restriction_type?: RestrictionType;
  limit?: number;
  offset?: number;
}

export interface ContactAttemptSearchFilters {
  centre_id: string;
  child_id?: string;
  guardian_id?: string;
  contact_type?: ContactAttemptType;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

// ─── Display Helpers ────────────────────────────────────────

export function getVisitTypeDisplay(type: VisitType): string {
  const map: Record<VisitType, string> = {
    in_person: "In Person",
    phone: "Phone",
    video: "Video",
    off_site: "Off Site",
    other_approved: "Other Approved",
  };
  return map[type];
}

export function getVisitStatusDisplay(status: VisitStatus): string {
  const map: Record<VisitStatus, string> = {
    requested: "Requested",
    pending_approval: "Pending Approval",
    approved: "Approved",
    scheduled: "Scheduled",
    checked_in: "Checked In",
    completed: "Completed",
    cancelled: "Cancelled",
    rejected: "Rejected",
    no_show: "No Show",
  };
  return map[status];
}

export function getVisitOutcomeDisplay(outcome: VisitOutcome): string {
  const map: Record<VisitOutcome, string> = {
    positive: "Positive",
    neutral: "Neutral",
    negative: "Negative",
    concern_noted: "Concern Noted",
    incident_reported: "Incident Reported",
    pending_review: "Pending Review",
    none: "None",
  };
  return map[outcome];
}

export function getRestrictionTypeDisplay(type: RestrictionType): string {
  const map: Record<RestrictionType, string> = {
    no_visits: "No Visits",
    supervised_only: "Supervised Only",
    limited_frequency: "Limited Frequency",
    limited_duration: "Limited Duration",
    phone_only: "Phone Only",
    temporary_ban: "Temporary Ban",
    other: "Other",
  };
  return map[type];
}

export function getContactAttemptTypeDisplay(type: ContactAttemptType): string {
  const map: Record<ContactAttemptType, string> = {
    phone_call: "Phone Call",
    message: "Message",
    visit_attempt: "Visit Attempt",
    video_call: "Video Call",
    email: "Email",
    other: "Other",
  };
  return map[type];
}

export function getContactAttemptResultDisplay(result: ContactAttemptResult): string {
  const map: Record<ContactAttemptResult, string> = {
    successful: "Successful",
    unsuccessful: "Unsuccessful",
    no_answer: "No Answer",
    wrong_number: "Wrong Number",
    voicemail_left: "Voicemail Left",
    cancelled: "Cancelled",
    other: "Other",
  };
  return map[result];
}

/**
 * Check if a visit status transition is valid.
 */
export function isValidVisitStatusTransition(
  from: VisitStatus,
  to: VisitStatus,
): boolean {
  return VISIT_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Check if a visit can be checked in.
 */
export function canCheckIn(status: VisitStatus): boolean {
  return status === "approved" || status === "scheduled";
}

/**
 * Check if a visit can be checked out.
 */
export function canCheckOut(status: VisitStatus): boolean {
  return status === "checked_in";
}

/**
 * Check if a visit has ended (terminal state).
 */
export function isVisitTerminal(status: VisitStatus): boolean {
  return status === "completed" || status === "cancelled" || status === "rejected";
}
