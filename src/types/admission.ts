/**
 * Admission Types
 *
 * Represents the review process for incoming referrals.
 * An admission links a referral to a decision and, if approved,
 * leads to a placement.
 *
 * STATUS MODEL:
 *   pending  – awaiting review
 *   approved – accepted, ready for placement
 *   denied   – declined
 *   cancelled – withdrawn before decision
 *
 * SECURITY:
 *   - centre_id is always derived server-side, never from client input
 *   - reference_number is system-generated, immutable, never reused
 */

// ─── Admission Status ────────────────────────────────────────────────────────

export const ADMISSION_STATUSES = [
  "pending",
  "approved",
  "denied",
  "cancelled",
] as const;

export type AdmissionStatus = (typeof ADMISSION_STATUSES)[number];

// ─── Admission Record ────────────────────────────────────────────────────────

export interface Admission {
  id: string;
  centre_id: string;
  referral_id: string;
  reference_number: string;
  status: AdmissionStatus;
  decision: string | null;
  conditions: string | null;
  admitted_date: string | null;
  admitted_by: string | null;
  denied_reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ─── Create Input ────────────────────────────────────────────────────────────

export interface CreateAdmissionInput {
  centre_id: string;
  referral_id: string;
  decision?: string | null;
  conditions?: string | null;
  admitted_date?: string | null;
  metadata?: Record<string, unknown> | null;
}

// ─── Update Input ────────────────────────────────────────────────────────────

export interface UpdateAdmissionInput {
  decision?: string | null;
  conditions?: string | null;
  admitted_date?: string | null;
  metadata?: Record<string, unknown> | null;
}

// ─── Status Update Input ─────────────────────────────────────────────────────

export interface UpdateAdmissionStatusInput {
  new_status: AdmissionStatus;
  reason?: string | null;
  denied_reason?: string | null;
}

// ─── Admission History ───────────────────────────────────────────────────────

export interface AdmissionHistoryEntry {
  id: string;
  admission_id: string;
  centre_id: string;
  previous_status: AdmissionStatus | null;
  new_status: AdmissionStatus;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
}

// ─── Search Filters ──────────────────────────────────────────────────────────

export interface AdmissionSearchFilters {
  centre_id: string;
  status?: AdmissionStatus;
  referral_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// ─── Display Helpers ─────────────────────────────────────────────────────────

export function getAdmissionDisplayStatus(status: AdmissionStatus): string {
  const map: Record<AdmissionStatus, string> = {
    pending: "Pending",
    approved: "Approved",
    denied: "Denied",
    cancelled: "Cancelled",
  };
  return map[status];
}
