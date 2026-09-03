/**
 * Guardian & Family Relationship Types
 *
 * Defines the guardian entity and child-guardian relationship.
 *
 * STATUS MODEL (guardians):
 *   active    – currently a known guardian
 *   inactive  – relationship paused or ended
 *   deceased  – guardian has passed away
 *   unknown   – status not determined
 *
 * SECURITY:
 *   - centre_id is always derived server-side, never from client input
 *   - guardian records are never physically deleted
 *   - relationship changes are preserved (append-only pattern)
 */

// ─── Guardian Status ──────────────────────────────────────────

export const GUARDIAN_STATUSES = [
  "active",
  "inactive",
  "deceased",
  "unknown",
] as const;

export type GuardianStatus = (typeof GUARDIAN_STATUSES)[number];

// ─── Relationship Type ───────────────────────────────────────

export const RELATIONSHIP_TYPES = [
  "mother",
  "father",
  "grandparent",
  "sibling",
  "aunt",
  "uncle",
  "legal_guardian",
  "foster_caregiver",
  "other_relative",
  "other_authorised",
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

// ─── Legal Authority Type ────────────────────────────────────

export const LEGAL_AUTHORITY_TYPES = [
  "parent",
  "legal_guardian",
  "court_authorised",
  "other_authorised",
  "none",
] as const;

export type LegalAuthorityType = (typeof LEGAL_AUTHORITY_TYPES)[number];

// ─── Guardian Record ─────────────────────────────────────────

export interface Guardian {
  id: string;
  centre_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  preferred_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  phone: string | null;
  alternative_phone: string | null;
  email: string | null;
  address: string | null;
  occupation: string | null;
  id_reference: string | null;
  status: GuardianStatus;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ─── Create Guardian Input ───────────────────────────────────

export interface CreateGuardianInput {
  centre_id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  preferred_name?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  alternative_phone?: string | null;
  email?: string | null;
  address?: string | null;
  occupation?: string | null;
  id_reference?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

// ─── Update Guardian Input ───────────────────────────────────

export interface UpdateGuardianInput {
  first_name?: string;
  middle_name?: string | null;
  last_name?: string;
  preferred_name?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  alternative_phone?: string | null;
  email?: string | null;
  address?: string | null;
  occupation?: string | null;
  id_reference?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

// ─── Update Guardian Status Input ────────────────────────────

export interface UpdateGuardianStatusInput {
  new_status: GuardianStatus;
  reason?: string | null;
}

// ─── Child-Guardian Relationship ─────────────────────────────

export interface ChildGuardian {
  id: string;
  child_id: string;
  guardian_id: string;
  centre_id: string;
  relationship_type: RelationshipType;
  is_primary: boolean;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  legal_authority: LegalAuthorityType;
  contact_permitted: boolean;
  updates_permitted: boolean;
  visit_permitted: boolean;
  meeting_permitted: boolean;
  information_permitted: boolean;
  contact_restricted: boolean;
  visits_restricted: boolean;
  restriction_notes: string | null;
  notes: string | null;
  created_by: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Optional display embeds populated by listRelationships so UIs can show
  // names instead of raw ids (guardian info merged with child info).
  guardian?: {
    id: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    phone: string | null;
  } | null;
  child?: {
    id: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    reference_number: string | null;
  } | null;
}

// ─── Create Relationship Input ───────────────────────────────

export interface CreateRelationshipInput {
  child_id: string;
  guardian_id: string;
  centre_id: string;
  relationship_type: RelationshipType;
  is_primary?: boolean;
  start_date?: string;
  legal_authority?: LegalAuthorityType;
  contact_permitted?: boolean;
  updates_permitted?: boolean;
  visit_permitted?: boolean;
  meeting_permitted?: boolean;
  information_permitted?: boolean;
  notes?: string | null;
}

// ─── Update Relationship Input ───────────────────────────────

export interface UpdateRelationshipInput {
  relationship_type?: RelationshipType;
  is_primary?: boolean;
  legal_authority?: LegalAuthorityType;
  contact_permitted?: boolean;
  updates_permitted?: boolean;
  visit_permitted?: boolean;
  meeting_permitted?: boolean;
  information_permitted?: boolean;
  contact_restricted?: boolean;
  visits_restricted?: boolean;
  restriction_notes?: string | null;
  notes?: string | null;
}

// ─── End Relationship Input ──────────────────────────────────

export interface EndRelationshipInput {
  end_date?: string | null;
  reason?: string | null;
}

// ─── Guardian Search Filters ─────────────────────────────────

export interface GuardianSearchFilters {
  centre_id: string;
  status?: GuardianStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

// ─── Relationship Search Filters ─────────────────────────────

export interface RelationshipSearchFilters {
  centre_id: string;
  child_id?: string;
  guardian_id?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

// ─── Guardian Document ───────────────────────────────────────

export const GUARDIAN_DOCUMENT_TYPES = [
  "guardianship",
  "court_order",
  "consent",
  "identification",
  "medical",
  "other",
] as const;

export type GuardianDocumentType = (typeof GUARDIAN_DOCUMENT_TYPES)[number];

export interface GuardianDocument {
  id: string;
  guardian_id: string;
  centre_id: string;
  relationship_id: string | null;
  document_type: GuardianDocumentType;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  uploaded_by: string | null;
  uploaded_at: string;
  metadata: Record<string, unknown> | null;
}

// ─── Display Helpers ─────────────────────────────────────────

export function getGuardianDisplayName(guardian: Guardian): string {
  const name = guardian.preferred_name || guardian.first_name;
  return `${name} ${guardian.last_name}`;
}

export function getGuardianFullName(guardian: Guardian): string {
  const parts = [guardian.first_name];
  if (guardian.middle_name) parts.push(guardian.middle_name);
  parts.push(guardian.last_name);
  return parts.join(" ");
}

export function getGuardianDisplayStatus(status: GuardianStatus): string {
  const map: Record<GuardianStatus, string> = {
    active: "Active",
    inactive: "Inactive",
    deceased: "Deceased",
    unknown: "Unknown",
  };
  return map[status];
}

export function getRelationshipTypeDisplay(type: RelationshipType): string {
  const map: Record<RelationshipType, string> = {
    mother: "Mother",
    father: "Father",
    grandparent: "Grandparent",
    sibling: "Sibling",
    aunt: "Aunt",
    uncle: "Uncle",
    legal_guardian: "Legal Guardian",
    foster_caregiver: "Foster/Responsible Caregiver",
    other_relative: "Other Relative",
    other_authorised: "Other Authorised Person",
  };
  return map[type];
}

export function getLegalAuthorityDisplay(authority: LegalAuthorityType): string {
  const map: Record<LegalAuthorityType, string> = {
    parent: "Parent",
    legal_guardian: "Legal Guardian",
    court_authorised: "Court-Authorised",
    other_authorised: "Other Authorised",
    none: "None",
  };
  return map[authority];
}

export function getGuardianDocumentTypeDisplay(type: GuardianDocumentType): string {
  const map: Record<GuardianDocumentType, string> = {
    guardianship: "Guardianship Documentation",
    court_order: "Court/Authority Documentation",
    consent: "Consent Documentation",
    identification: "Identification Document",
    medical: "Medical Document",
    other: "Other",
  };
  return map[type];
}
