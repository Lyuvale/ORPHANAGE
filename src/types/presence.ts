/**
 * Child Presence Types
 *
 * Defines the child presence/attendance entity and related types.
 *
 * SECURITY:
 *   - centre_id is always derived server-side, never from client input
 *   - Presence records are never physically deleted
 *   - Official timestamps are server-controlled
 */

// ─── Presence Status ────────────────────────────────────────

export const PRESENCE_STATUSES = [
  "present",
  "absent",
  "on_leave",
  "off_site",
  "transferred",
  "other_approved",
] as const;

export type PresenceStatus = (typeof PRESENCE_STATUSES)[number];

// ─── Absence Reason ─────────────────────────────────────────

export const ABSENCE_REASONS = [
  "illness",
  "family_leave",
  "unknown",
  "external_programme",
  "approved_absence",
  "other",
] as const;

export type AbsenceReason = (typeof ABSENCE_REASONS)[number];

// ─── Child Presence Record ──────────────────────────────────

export interface ChildPresence {
  id: string;
  centre_id: string;
  child_id: string;
  presence_date: string;
  status: PresenceStatus;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_by: string | null;
  check_out_by: string | null;
  absence_reason: AbsenceReason | null;
  off_site_reason: string | null;
  off_site_destination: string | null;
  off_site_expected_return: string | null;
  off_site_actual_return: string | null;
  authorised_by: string | null;
  visit_id: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ─── Create Presence Input ──────────────────────────────────

export interface CreatePresenceInput {
  centre_id: string;
  child_id: string;
  presence_date: string;
  status?: PresenceStatus;
  notes?: string | null;
}

// ─── Update Presence Input ──────────────────────────────────

export interface UpdatePresenceInput {
  status?: PresenceStatus;
  absence_reason?: AbsenceReason | null;
  notes?: string | null;
}

// ─── Check-In Input ─────────────────────────────────────────

export interface PresenceCheckInInput {
  notes?: string | null;
}

// ─── Check-Out Input ────────────────────────────────────────

export interface PresenceCheckOutInput {
  destination_type?: string | null;
  reason?: string | null;
  notes?: string | null;
}

// ─── Off-Site Input ─────────────────────────────────────────

export interface OffSiteInput {
  off_site_reason: string;
  off_site_destination?: string | null;
  off_site_expected_return?: string | null;
  authorised_by?: string | null;
  visit_id?: string | null;
}

// ─── Presence Search Filters ────────────────────────────────

export interface PresenceSearchFilters {
  centre_id: string;
  child_id?: string;
  child_ids?: string[];
  presence_date?: string;
  status?: PresenceStatus;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

// ─── Display Helpers ────────────────────────────────────────

export function getPresenceStatusDisplay(status: PresenceStatus): string {
  const map: Record<PresenceStatus, string> = {
    present: "Present",
    absent: "Absent",
    on_leave: "On Leave",
    off_site: "Off Site",
    transferred: "Transferred",
    other_approved: "Other Approved",
  };
  return map[status];
}

export function getAbsenceReasonDisplay(reason: AbsenceReason): string {
  const map: Record<AbsenceReason, string> = {
    illness: "Illness",
    family_leave: "Family Leave",
    unknown: "Unknown",
    external_programme: "External Programme",
    approved_absence: "Approved Absence",
    other: "Other",
  };
  return map[reason];
}
