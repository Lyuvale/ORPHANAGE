import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Guardian,
  CreateGuardianInput,
  UpdateGuardianInput,
  UpdateGuardianStatusInput,
  GuardianSearchFilters,
  ChildGuardian,
  CreateRelationshipInput,
  UpdateRelationshipInput,
  EndRelationshipInput,
  RelationshipSearchFilters,
  GuardianDocument,
} from "@/types/guardian";

const GUARDIAN_TABLE = "guardians" as const;
const RELATIONSHIP_TABLE = "child_guardians" as const;
const DOCUMENT_TABLE = "guardian_documents" as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

// ─── List Guardians ──────────────────────────────────────────

export async function listGuardians(
  adminSupabase: AdminClient,
  filters: GuardianSearchFilters,
): Promise<{ data: Guardian[]; count: number }> {
  let query = adminSupabase
    .from(GUARDIAN_TABLE)
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("last_name", { ascending: true });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.ids) {
    if (filters.ids.length === 0) return { data: [], count: 0 };
    query = query.in("id", filters.ids);
  }

  if (filters.search) {
    const term = filters.search.trim();
    query = query.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,middle_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
    );
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list guardians: ${error.message}`);
  }

  return { data: (data ?? []) as Guardian[], count: count ?? 0 };
}

// ─── Get Guardian By ID ──────────────────────────────────────

export async function getGuardianById(
  adminSupabase: AdminClient,
  id: string,
): Promise<Guardian | null> {
  const { data, error } = await adminSupabase
    .from(GUARDIAN_TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get guardian: ${error.message}`);
  }

  return data as Guardian;
}

// ─── Duplicate Detection ─────────────────────────────────────

export async function findDuplicateGuardians(
  adminSupabase: AdminClient,
  centreId: string,
  firstName: string,
  lastName: string,
  phone?: string | null,
  email?: string | null,
): Promise<Guardian[]> {
  const query = adminSupabase
    .from(GUARDIAN_TABLE)
    .select("*")
    .eq("centre_id", centreId)
    .ilike("first_name", firstName.trim())
    .ilike("last_name", lastName.trim());

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to check duplicates: ${error.message}`);
  }

  const candidates = (data ?? []) as Guardian[];

  // Additional fuzzy matching on phone/email
  if (phone || email) {
    return candidates.filter((g) => {
      if (phone && g.phone && g.phone.replace(/\D/g, "") === phone.replace(/\D/g, "")) return true;
      if (email && g.email && g.email.toLowerCase() === email.toLowerCase()) return true;
      return false;
    });
  }

  return candidates;
}

// ─── Create Guardian ─────────────────────────────────────────

export async function createGuardian(
  adminSupabase: AdminClient,
  input: CreateGuardianInput,
): Promise<Guardian> {
  const payload = {
    centre_id: input.centre_id,
    first_name: input.first_name,
    middle_name: input.middle_name ?? null,
    last_name: input.last_name,
    preferred_name: input.preferred_name ?? null,
    gender: input.gender ?? null,
    date_of_birth: input.date_of_birth ?? null,
    phone: input.phone ?? null,
    alternative_phone: input.alternative_phone ?? null,
    email: input.email ?? null,
    address: input.address ?? null,
    occupation: input.occupation ?? null,
    id_reference: input.id_reference ?? null,
    status: "active" as const,
    notes: input.notes ?? null,
    metadata: input.metadata ?? null,
  };

  const { data, error } = await adminSupabase
    .from(GUARDIAN_TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23503") {
      throw new Error("Invalid centre reference");
    }
    throw new Error(`Failed to create guardian: ${error.message}`);
  }

  return data as Guardian;
}

// ─── Update Guardian ─────────────────────────────────────────

export async function updateGuardian(
  adminSupabase: AdminClient,
  id: string,
  input: UpdateGuardianInput,
): Promise<Guardian> {
  const payload: Record<string, unknown> = {};

  if (input.first_name !== undefined) payload.first_name = input.first_name;
  if (input.middle_name !== undefined) payload.middle_name = input.middle_name || null;
  if (input.last_name !== undefined) payload.last_name = input.last_name;
  if (input.preferred_name !== undefined) payload.preferred_name = input.preferred_name || null;
  if (input.gender !== undefined) payload.gender = input.gender || null;
  if (input.date_of_birth !== undefined) payload.date_of_birth = input.date_of_birth || null;
  if (input.phone !== undefined) payload.phone = input.phone || null;
  if (input.alternative_phone !== undefined) payload.alternative_phone = input.alternative_phone || null;
  if (input.email !== undefined) payload.email = input.email || null;
  if (input.address !== undefined) payload.address = input.address || null;
  if (input.occupation !== undefined) payload.occupation = input.occupation || null;
  if (input.id_reference !== undefined) payload.id_reference = input.id_reference || null;
  if (input.notes !== undefined) payload.notes = input.notes || null;
  if (input.metadata !== undefined) payload.metadata = input.metadata;

  if (Object.keys(payload).length === 0) {
    throw new Error("No fields to update");
  }

  const { data, error } = await adminSupabase
    .from(GUARDIAN_TABLE)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Guardian not found");
    }
    throw new Error(`Failed to update guardian: ${error.message}`);
  }

  return data as Guardian;
}

// ─── Update Guardian Status ──────────────────────────────────

export async function updateGuardianStatus(
  adminSupabase: AdminClient,
  guardianId: string,
  centreId: string,
  input: UpdateGuardianStatusInput,
): Promise<Guardian> {
  const guardian = await getGuardianById(adminSupabase, guardianId);
  if (!guardian) {
    throw new Error("Guardian not found");
  }

  if (guardian.centre_id !== centreId) {
    throw new Error("Guardian does not belong to this centre");
  }

  if (guardian.status === input.new_status) {
    throw new Error(`Guardian is already ${input.new_status}`);
  }

  const { data, error } = await adminSupabase
    .from(GUARDIAN_TABLE)
    .update({ status: input.new_status })
    .eq("id", guardianId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update guardian status: ${error.message}`);
  }

  return data as Guardian;
}

// ─── List Relationships ──────────────────────────────────────

export async function listRelationships(
  adminSupabase: AdminClient,
  filters: RelationshipSearchFilters,
): Promise<{ data: ChildGuardian[]; count: number }> {
  let query = adminSupabase
    .from(RELATIONSHIP_TABLE)
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("created_at", { ascending: false });

  if (filters.child_id) {
    query = query.eq("child_id", filters.child_id);
  }

  if (filters.child_ids) {
    if (filters.child_ids.length === 0) return { data: [], count: 0 };
    query = query.in("child_id", filters.child_ids);
  }

  if (filters.guardian_id) {
    query = query.eq("guardian_id", filters.guardian_id);
  }

  if (filters.is_active !== undefined) {
    query = query.eq("is_active", filters.is_active);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list relationships: ${error.message}`);
  }

  const rows = (data ?? []) as ChildGuardian[];

  // Attach guardian + child display info so callers can show names
  // (guardian info merged with child info) without extra round trips.
  if (rows.length > 0) {
    const guardianIds = [...new Set(rows.map((r) => r.guardian_id))];
    const childIds = [...new Set(rows.map((r) => r.child_id))];

    const [{ data: guardians }, { data: children }] = await Promise.all([
      adminSupabase
        .from("guardians")
        .select("id, first_name, middle_name, last_name, phone")
        .in("id", guardianIds),
      adminSupabase
        .from("children")
        .select("id, first_name, middle_name, last_name, reference_number")
        .in("id", childIds),
    ]);

    const guardianById = new Map(
      ((guardians ?? []) as NonNullable<ChildGuardian["guardian"]>[]).map((g) => [g.id, g]),
    );
    const childById = new Map(
      ((children ?? []) as NonNullable<ChildGuardian["child"]>[]).map((c) => [c.id, c]),
    );

    for (const row of rows) {
      row.guardian = guardianById.get(row.guardian_id) ?? null;
      row.child = childById.get(row.child_id) ?? null;
    }
  }

  return { data: rows, count: count ?? 0 };
}

// ─── Get Relationship By ID ──────────────────────────────────

export async function getRelationshipById(
  adminSupabase: AdminClient,
  id: string,
): Promise<ChildGuardian | null> {
  const { data, error } = await adminSupabase
    .from(RELATIONSHIP_TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get relationship: ${error.message}`);
  }

  return data as ChildGuardian;
}

// ─── Create Relationship ─────────────────────────────────────

export async function createRelationship(
  adminSupabase: AdminClient,
  input: CreateRelationshipInput,
): Promise<ChildGuardian> {
  // Validate child exists
  const { data: child, error: childError } = await adminSupabase
    .from("children")
    .select("id, centre_id")
    .eq("id", input.child_id)
    .single();

  if (childError || !child) {
    throw new Error("Child not found");
  }

  if (child.centre_id !== input.centre_id) {
    throw new Error("Child does not belong to this centre");
  }

  // Validate guardian exists
  const guardian = await getGuardianById(adminSupabase, input.guardian_id);
  if (!guardian) {
    throw new Error("Guardian not found");
  }

  if (guardian.centre_id !== input.centre_id) {
    throw new Error("Guardian does not belong to this centre");
  }

  // Check for existing active relationship between same child and guardian
  const { data: existing } = await adminSupabase
    .from(RELATIONSHIP_TABLE)
    .select("id")
    .eq("child_id", input.child_id)
    .eq("guardian_id", input.guardian_id)
    .eq("is_active", true)
    .limit(1);

  if (existing && existing.length > 0) {
    throw new Error("An active relationship already exists between this child and guardian");
  }

  // If marking as primary, deactivate existing primary for this child
  if (input.is_primary) {
    await adminSupabase
      .from(RELATIONSHIP_TABLE)
      .update({ is_primary: false })
      .eq("child_id", input.child_id)
      .eq("is_primary", true)
      .eq("is_active", true);
  }

  const payload = {
    child_id: input.child_id,
    guardian_id: input.guardian_id,
    centre_id: input.centre_id,
    relationship_type: input.relationship_type,
    is_primary: input.is_primary ?? false,
    is_active: true,
    start_date: input.start_date || new Date().toISOString().split("T")[0],
    legal_authority: input.legal_authority ?? "none",
    contact_permitted: input.contact_permitted ?? true,
    updates_permitted: input.updates_permitted ?? true,
    visit_permitted: input.visit_permitted ?? true,
    meeting_permitted: input.meeting_permitted ?? true,
    information_permitted: input.information_permitted ?? true,
    notes: input.notes ?? null,
  };

  const { data, error } = await adminSupabase
    .from(RELATIONSHIP_TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A relationship already exists with these details");
    }
    if (error.code === "23503") {
      throw new Error("Invalid child or guardian reference");
    }
    throw new Error(`Failed to create relationship: ${error.message}`);
  }

  return data as ChildGuardian;
}

// ─── Update Relationship ─────────────────────────────────────

export async function updateRelationship(
  adminSupabase: AdminClient,
  id: string,
  input: UpdateRelationshipInput,
): Promise<ChildGuardian> {
  const existing = await getRelationshipById(adminSupabase, id);
  if (!existing) {
    throw new Error("Relationship not found");
  }

  if (!existing.is_active) {
    throw new Error("Cannot update an ended relationship");
  }

  const payload: Record<string, unknown> = {};

  if (input.relationship_type !== undefined) payload.relationship_type = input.relationship_type;
  if (input.is_primary !== undefined) payload.is_primary = input.is_primary;
  if (input.legal_authority !== undefined) payload.legal_authority = input.legal_authority;
  if (input.contact_permitted !== undefined) payload.contact_permitted = input.contact_permitted;
  if (input.updates_permitted !== undefined) payload.updates_permitted = input.updates_permitted;
  if (input.visit_permitted !== undefined) payload.visit_permitted = input.visit_permitted;
  if (input.meeting_permitted !== undefined) payload.meeting_permitted = input.meeting_permitted;
  if (input.information_permitted !== undefined) payload.information_permitted = input.information_permitted;
  if (input.contact_restricted !== undefined) payload.contact_restricted = input.contact_restricted;
  if (input.visits_restricted !== undefined) payload.visits_restricted = input.visits_restricted;
  if (input.restriction_notes !== undefined) payload.restriction_notes = input.restriction_notes || null;
  if (input.notes !== undefined) payload.notes = input.notes || null;

  if (Object.keys(payload).length === 0) {
    throw new Error("No fields to update");
  }

  // If marking as primary, deactivate existing primary for this child
  if (input.is_primary) {
    await adminSupabase
      .from(RELATIONSHIP_TABLE)
      .update({ is_primary: false })
      .eq("child_id", existing.child_id)
      .eq("is_primary", true)
      .eq("is_active", true)
      .neq("id", id);
  }

  const { data, error } = await adminSupabase
    .from(RELATIONSHIP_TABLE)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Relationship not found");
    }
    throw new Error(`Failed to update relationship: ${error.message}`);
  }

  return data as ChildGuardian;
}

// ─── End Relationship ────────────────────────────────────────

export async function endRelationship(
  adminSupabase: AdminClient,
  id: string,
  centreId: string,
  input: EndRelationshipInput,
): Promise<ChildGuardian> {
  const existing = await getRelationshipById(adminSupabase, id);
  if (!existing) {
    throw new Error("Relationship not found");
  }

  if (existing.centre_id !== centreId) {
    throw new Error("Relationship does not belong to this centre");
  }

  if (!existing.is_active) {
    throw new Error("Relationship is already ended");
  }

  const { data, error } = await adminSupabase
    .from(RELATIONSHIP_TABLE)
    .update({
      is_active: false,
      is_primary: false,
      end_date: input.end_date || new Date().toISOString().split("T")[0],
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to end relationship: ${error.message}`);
  }

  return data as ChildGuardian;
}

// ─── Guardian Documents ──────────────────────────────────────

export async function getGuardianDocuments(
  adminSupabase: AdminClient,
  guardianId: string,
): Promise<GuardianDocument[]> {
  const { data, error } = await adminSupabase
    .from(DOCUMENT_TABLE)
    .select("*")
    .eq("guardian_id", guardianId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get guardian documents: ${error.message}`);
  }

  return (data ?? []) as GuardianDocument[];
}
