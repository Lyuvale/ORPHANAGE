/**
 * Referral Types
 *
 * Represents the intake process for children entering the care system.
 * A referral is submitted by an external source (police, court, hospital, etc.)
 * and goes through a review workflow before admission.
 *
 * STATUS MODEL:
 *   submitted    – just received, awaiting review
 *   under_review – being evaluated by staff
 *   admitted     – approved for admission
 *   rejected     – declined after review
 *   withdrawn    – withdrawn by referrer
 *
 * SECURITY:
 *   - centre_id is always derived server-side, never from client input
 *   - reference_number is system-generated, immutable, never reused
 *   - Status changes are recorded in the service layer
 */

// ─── Referral Status ─────────────────────────────────────────────────────────

export const REFERRAL_STATUSES = [
  "submitted",
  "under_review",
  "admitted",
  "rejected",
  "withdrawn",
] as const;

export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

// ─── Referral Source ─────────────────────────────────────────────────────────

export const REFERRAL_SOURCES = [
  "police",
  "court",
  "hospital",
  "school",
  "community",
  "government",
  "self_referral",
  "other",
] as const;

export type ReferralSource = (typeof REFERRAL_SOURCES)[number];

// ─── Referral Priority ───────────────────────────────────────────────────────

export const REFERRAL_PRIORITIES = [
  "low",
  "medium",
  "high",
  "urgent",
] as const;

export type ReferralPriority = (typeof REFERRAL_PRIORITIES)[number];

// ─── Referral Record ─────────────────────────────────────────────────────────

export interface Referral {
  id: string;
  centre_id: string;
  reference_number: string;
  child_first_name: string;
  child_middle_name: string | null;
  child_last_name: string;
  child_date_of_birth: string | null;
  child_gender: string | null;
  child_nationality: string | null;
  source: ReferralSource;
  priority: ReferralPriority;
  status: ReferralStatus;
  referrer_name: string | null;
  referrer_org: string | null;
  referrer_contact: string | null;
  reason: string;
  notes: string | null;
  submitted_by: string | null;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ─── Create Input ────────────────────────────────────────────────────────────

export interface CreateReferralInput {
  centre_id: string;
  child_first_name: string;
  child_middle_name?: string | null;
  child_last_name: string;
  child_date_of_birth?: string | null;
  child_gender?: string | null;
  child_nationality?: string | null;
  source: ReferralSource;
  priority?: ReferralPriority;
  referrer_name?: string | null;
  referrer_org?: string | null;
  referrer_contact?: string | null;
  reason: string;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

// ─── Update Input ────────────────────────────────────────────────────────────

export interface UpdateReferralInput {
  child_first_name?: string;
  child_middle_name?: string | null;
  child_last_name?: string;
  child_date_of_birth?: string | null;
  child_gender?: string | null;
  child_nationality?: string | null;
  source?: ReferralSource;
  priority?: ReferralPriority;
  referrer_name?: string | null;
  referrer_org?: string | null;
  referrer_contact?: string | null;
  reason?: string;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

// ─── Status Update Input ─────────────────────────────────────────────────────

export interface UpdateReferralStatusInput {
  new_status: ReferralStatus;
  reason?: string | null;
}

// ─── Search Filters ──────────────────────────────────────────────────────────

export interface ReferralSearchFilters {
  centre_id: string;
  status?: ReferralStatus;
  source?: ReferralSource;
  priority?: ReferralPriority;
  search?: string;
  limit?: number;
  offset?: number;
}

// ─── Referral Document ───────────────────────────────────────────────────────

export interface ReferralDocument {
  id: string;
  referral_id: string;
  centre_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  uploaded_by: string | null;
  uploaded_at: string;
  metadata: Record<string, unknown> | null;
}

// ─── Display Helpers ─────────────────────────────────────────────────────────

export function getReferralDisplayName(referral: Referral): string {
  const parts = [referral.child_first_name];
  if (referral.child_middle_name) parts.push(referral.child_middle_name);
  parts.push(referral.child_last_name);
  return parts.join(" ");
}

export function getReferralDisplayStatus(status: ReferralStatus): string {
  const map: Record<ReferralStatus, string> = {
    submitted: "Submitted",
    under_review: "Under Review",
    admitted: "Admitted",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
  };
  return map[status];
}

export function getReferralDisplaySource(source: ReferralSource): string {
  const map: Record<ReferralSource, string> = {
    police: "Police",
    court: "Court",
    hospital: "Hospital",
    school: "School",
    community: "Community",
    government: "Government",
    self_referral: "Self Referral",
    other: "Other",
  };
  return map[source];
}

export function getReferralDisplayPriority(priority: ReferralPriority): string {
  const map: Record<ReferralPriority, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
  };
  return map[priority];
}
