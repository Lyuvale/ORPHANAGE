/**
 * Child Record Types
 *
 * Defines the central child entity. Every child belongs to exactly one centre.
 *
 * STATUS MODEL:
 *   active      – currently in care
 *   transferred – moved to another centre or facility
 *   graduated   – completed the programme
 *   alumni      – former child, historical record
 *   deactivated – soft-deactivated, no longer operationally active
 *
 * SECURITY:
 *   - centre_id is always derived server-side, never from client input
 *   - reference_number is system-generated, immutable, never reused
 *   - status changes are recorded in child_status_history
 */

// ─── Child Status ────────────────────────────────────────────────────────────

export const CHILD_STATUSES = [
  "active",
  "transferred",
  "graduated",
  "alumni",
  "deactivated",
] as const;

export type ChildStatus = (typeof CHILD_STATUSES)[number];

export type ChildStatusTuple = typeof CHILD_STATUSES;

// ─── Child Record ────────────────────────────────────────────────────────────

export interface Child {
  id: string;
  centre_id: string;
  reference_number: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  preferred_name: string | null;
  date_of_birth: string;
  gender: ChildGender;
  nationality: string | null;
  photo_url: string | null;
  status: ChildStatus;
  admission_date: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type ChildGender = "male" | "female" | "other" | "undisclosed";

export const CHILD_GENDERS = ["male", "female", "other", "undisclosed"] as const;

// ─── Create Input ────────────────────────────────────────────────────────────

export interface CreateChildInput {
  centre_id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  preferred_name?: string | null;
  date_of_birth: string;
  gender: ChildGender;
  nationality?: string | null;
  admission_date: string;
  metadata?: Record<string, unknown> | null;
}

// ─── Update Input ────────────────────────────────────────────────────────────

export interface UpdateChildInput {
  first_name?: string;
  middle_name?: string | null;
  last_name?: string;
  preferred_name?: string | null;
  date_of_birth?: string;
  gender?: ChildGender;
  nationality?: string | null;
  photo_url?: string | null;
  admission_date?: string;
  metadata?: Record<string, unknown> | null;
}

// ─── Child Status History ────────────────────────────────────────────────────

export interface ChildStatusHistoryEntry {
  id: string;
  child_id: string;
  centre_id: string;
  previous_status: ChildStatus | null;
  new_status: ChildStatus;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
}

// ─── Status Update Input ─────────────────────────────────────────────────────

export interface UpdateChildStatusInput {
  new_status: ChildStatus;
  reason?: string | null;
}

// ─── Child Search Filters ────────────────────────────────────────────────────

export interface ChildSearchFilters {
  centre_id: string;
  status?: ChildStatus;
  search?: string;
  limit?: number;
  offset?: number;
  // Assignment scoping (spec: caregiver sees assigned children only).
  ids?: string[];
}

// ─── Display Helpers ─────────────────────────────────────────────────────────

export function getChildDisplayName(child: Child): string {
  const parts = [child.first_name];
  if (child.middle_name) parts.push(child.middle_name);
  parts.push(child.last_name);
  return parts.join(" ");
}

export function getChildDisplayStatus(status: ChildStatus): string {
  const map: Record<ChildStatus, string> = {
    active: "Active",
    transferred: "Transferred",
    graduated: "Graduated",
    alumni: "Alumni",
    deactivated: "Deactivated",
  };
  return map[status];
}
