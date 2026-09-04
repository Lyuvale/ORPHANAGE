/**
 * Placement Types
 *
 * Represents the assignment of admitted children to beds/rooms.
 * A placement links a child to a physical location within a centre.
 *
 * STATUS MODEL:
 *   active       – currently placed
 *   completed    – placement ended normally
 *   transferred  – moved to another centre/facility
 *   discharged   – left care
 *
 * SECURITY:
 *   - centre_id is always derived server-side, never from client input
 *   - reference_number is system-generated, immutable, never reused
 */

// ─── Placement Status ────────────────────────────────────────────────────────

export const PLACEMENT_STATUSES = [
  "active",
  "completed",
  "transferred",
  "discharged",
] as const;

export type PlacementStatus = (typeof PLACEMENT_STATUSES)[number];

// ─── Placement Type ──────────────────────────────────────────────────────────

export const PLACEMENT_TYPES = [
  "residential",
  "foster",
  "adoption",
  "transitional",
  "temporary",
] as const;

export type PlacementType = (typeof PLACEMENT_TYPES)[number];

// ─── Placement Record ────────────────────────────────────────────────────────

export interface Placement {
  id: string;
  centre_id: string;
  child_id: string;
  admission_id: string | null;
  reference_number: string;
  status: PlacementStatus;
  bed_reference: string | null;
  room_number: string | null;
  start_date: string;
  end_date: string | null;
  placement_type: PlacementType;
  notes: string | null;
  assigned_by: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ─── Create Input ────────────────────────────────────────────────────────────

export interface CreatePlacementInput {
  centre_id: string;
  child_id: string;
  admission_id?: string | null;
  bed_reference?: string | null;
  room_number?: string | null;
  start_date: string;
  end_date?: string | null;
  placement_type?: PlacementType;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

// ─── Update Input ────────────────────────────────────────────────────────────

export interface UpdatePlacementInput {
  bed_reference?: string | null;
  room_number?: string | null;
  end_date?: string | null;
  placement_type?: PlacementType;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

// ─── Status Update Input ─────────────────────────────────────────────────────

export interface UpdatePlacementStatusInput {
  new_status: PlacementStatus;
  reason?: string | null;
  end_date?: string | null;
}

// ─── Search Filters ──────────────────────────────────────────────────────────

export interface PlacementSearchFilters {
  centre_id: string;
  status?: PlacementStatus;
  child_id?: string;
  child_ids?: string[];
  placement_type?: PlacementType;
  search?: string;
  limit?: number;
  offset?: number;
}

// ─── Display Helpers ─────────────────────────────────────────────────────────

export function getPlacementDisplayStatus(status: PlacementStatus): string {
  const map: Record<PlacementStatus, string> = {
    active: "Active",
    completed: "Completed",
    transferred: "Transferred",
    discharged: "Discharged",
  };
  return map[status];
}

export function getPlacementDisplayType(type: PlacementType): string {
  const map: Record<PlacementType, string> = {
    residential: "Residential",
    foster: "Foster Care",
    adoption: "Adoption",
    transitional: "Transitional",
    temporary: "Temporary",
  };
  return map[type];
}
