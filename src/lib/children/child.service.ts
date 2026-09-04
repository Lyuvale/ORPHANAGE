import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Child,
  ChildStatus,
  CreateChildInput,
  UpdateChildInput,
  UpdateChildStatusInput,
  ChildStatusHistoryEntry,
  ChildSearchFilters,
} from "@/types/child";

const TABLE = "children" as const;
const HISTORY_TABLE = "child_status_history" as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

// ─── List Children ───────────────────────────────────────────────────────────

export async function listChildren(
  adminSupabase: AdminClient,
  filters: ChildSearchFilters,
): Promise<{ data: Child[]; count: number }> {
  let query = adminSupabase
    .from(TABLE)
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("last_name")
    .order("first_name");

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.search) {
    const term = filters.search.trim();
    query = query.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,middle_name.ilike.%${term}%,reference_number.ilike.%${term}%`,
    );
  }

  if (filters.ids) {
    // Empty id set => no rows (never fall back to unscoped listing).
    if (filters.ids.length === 0) {
      return { data: [], count: 0 };
    }
    query = query.in("id", filters.ids);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list children: ${error.message}`);
  }

  return { data: (data ?? []) as Child[], count: count ?? 0 };
}

// ─── Get Child By ID ─────────────────────────────────────────────────────────

export async function getChildById(
  adminSupabase: AdminClient,
  id: string,
): Promise<Child | null> {
  const { data, error } = await adminSupabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get child: ${error.message}`);
  }

  return data as Child;
}

// ─── Get Child By Reference Number ───────────────────────────────────────────

export async function getChildByReference(
  adminSupabase: AdminClient,
  centreId: string,
  referenceNumber: string,
): Promise<Child | null> {
  const { data, error } = await adminSupabase
    .from(TABLE)
    .select("*")
    .eq("centre_id", centreId)
    .eq("reference_number", referenceNumber)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get child by reference: ${error.message}`);
  }

  return data as Child;
}

// ─── Check Reference Number Exists ──────────────────────────────────────────

export async function referenceNumberExists(
  adminSupabase: AdminClient,
  centreId: string,
  referenceNumber: string,
  excludeId?: string,
): Promise<boolean> {
  let query = adminSupabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("centre_id", centreId)
    .eq("reference_number", referenceNumber);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to check reference: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

// ─── Generate Child Reference ────────────────────────────────────────────────

export async function generateChildReference(
  adminSupabase: AdminClient,
  centreId: string,
): Promise<string> {
  // Call the database function to generate the next reference
  const { data, error } = await adminSupabase.rpc("generate_child_reference" as never, {
    p_centre_id: centreId,
  } as never);

  if (error) {
    throw new Error(`Failed to generate reference: ${error.message}`);
  }

  return data as string;
}

// ─── Create Child ────────────────────────────────────────────────────────────

export async function createChild(
  adminSupabase: AdminClient,
  input: CreateChildInput,
): Promise<Child> {
  // Generate reference number
  const referenceNumber = await generateChildReference(
    adminSupabase,
    input.centre_id,
  );

  const payload = {
    centre_id: input.centre_id,
    reference_number: referenceNumber,
    first_name: input.first_name,
    middle_name: input.middle_name ?? null,
    last_name: input.last_name,
    preferred_name: input.preferred_name ?? null,
    date_of_birth: input.date_of_birth,
    gender: input.gender,
    nationality: input.nationality ?? null,
    admission_date: input.admission_date,
    metadata: input.metadata ?? null,
    status: "active" as const,
  };

  const { data, error } = await adminSupabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A child with this reference already exists");
    }
    if (error.code === "23503") {
      throw new Error("Invalid centre reference");
    }
    throw new Error(`Failed to create child: ${error.message}`);
  }

  // Record initial status in history
  await recordStatusHistory(
    adminSupabase,
    data.id,
    input.centre_id,
    null,
    "active",
    null,
    "Initial admission",
  );

  return data as Child;
}

// ─── Update Child ────────────────────────────────────────────────────────────

export async function updateChild(
  adminSupabase: AdminClient,
  id: string,
  input: UpdateChildInput,
): Promise<Child> {
  const payload: Record<string, unknown> = {};

  if (input.first_name !== undefined) payload.first_name = input.first_name;
  if (input.middle_name !== undefined) payload.middle_name = input.middle_name || null;
  if (input.last_name !== undefined) payload.last_name = input.last_name;
  if (input.preferred_name !== undefined) payload.preferred_name = input.preferred_name || null;
  if (input.date_of_birth !== undefined) payload.date_of_birth = input.date_of_birth;
  if (input.gender !== undefined) payload.gender = input.gender;
  if (input.nationality !== undefined) payload.nationality = input.nationality || null;
  if (input.photo_url !== undefined) payload.photo_url = input.photo_url || null;
  if (input.admission_date !== undefined) payload.admission_date = input.admission_date;
  if (input.metadata !== undefined) payload.metadata = input.metadata;

  if (Object.keys(payload).length === 0) {
    throw new Error("No fields to update");
  }

  const { data, error } = await adminSupabase
    .from(TABLE)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Child not found");
    }
    throw new Error(`Failed to update child: ${error.message}`);
  }

  return data as Child;
}

// ─── Update Child Status ────────────────────────────────────────────────────

export async function updateChildStatus(
  adminSupabase: AdminClient,
  childId: string,
  centreId: string,
  input: UpdateChildStatusInput,
  changedBy: string | null,
): Promise<Child> {
  // Get current child
  const child = await getChildById(adminSupabase, childId);
  if (!child) {
    throw new Error("Child not found");
  }

  if (child.centre_id !== centreId) {
    throw new Error("Child does not belong to this centre");
  }

  const previousStatus = child.status;

  if (previousStatus === input.new_status) {
    throw new Error(`Child is already ${input.new_status}`);
  }

  // Update status
  const { data, error } = await adminSupabase
    .from(TABLE)
    .update({ status: input.new_status })
    .eq("id", childId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update child status: ${error.message}`);
  }

  // Record in history
  await recordStatusHistory(
    adminSupabase,
    childId,
    centreId,
    previousStatus,
    input.new_status,
    changedBy,
    input.reason ?? null,
  );

  return data as Child;
}

// ─── Deactivate Child (Soft Delete) ─────────────────────────────────────────

export async function deactivateChild(
  adminSupabase: AdminClient,
  id: string,
): Promise<Child> {
  return updateChildStatus(
    adminSupabase,
    id,
    "", // centre_id validated by caller
    { new_status: "deactivated", reason: "Record deactivated" },
    null,
  );
}

// ─── Record Status History ──────────────────────────────────────────────────

async function recordStatusHistory(
  adminSupabase: AdminClient,
  childId: string,
  centreId: string,
  previousStatus: ChildStatus | null,
  newStatus: ChildStatus,
  changedBy: string | null,
  reason: string | null,
): Promise<ChildStatusHistoryEntry> {
  const { data, error } = await adminSupabase
    .from(HISTORY_TABLE)
    .insert({
      child_id: childId,
      centre_id: centreId,
      previous_status: previousStatus,
      new_status: newStatus,
      changed_by: changedBy,
      reason: reason,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record status history: ${error.message}`);
  }

  return data as ChildStatusHistoryEntry;
}

// ─── Get Status History ─────────────────────────────────────────────────────

export async function getChildStatusHistory(
  adminSupabase: AdminClient,
  childId: string,
): Promise<ChildStatusHistoryEntry[]> {
  const { data, error } = await adminSupabase
    .from(HISTORY_TABLE)
    .select("*")
    .eq("child_id", childId)
    .order("changed_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get status history: ${error.message}`);
  }

  return (data ?? []) as ChildStatusHistoryEntry[];
}
