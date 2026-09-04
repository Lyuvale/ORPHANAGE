import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Placement,
  CreatePlacementInput,
  UpdatePlacementInput,
  UpdatePlacementStatusInput,
  PlacementSearchFilters,
} from "@/types/placement";

const TABLE = "placements" as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

// ─── List Placements ─────────────────────────────────────────────────────────

export async function listPlacements(
  adminSupabase: AdminClient,
  filters: PlacementSearchFilters,
): Promise<{ data: Placement[]; count: number }> {
  let query = adminSupabase
    .from(TABLE)
    .select("*", { count: "exact" })
    .eq("centre_id", filters.centre_id)
    .order("start_date", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.child_id) {
    query = query.eq("child_id", filters.child_id);
  }

  if (filters.child_ids) {
    if (filters.child_ids.length === 0) return { data: [], count: 0 };
    query = query.in("child_id", filters.child_ids);
  }

  if (filters.placement_type) {
    query = query.eq("placement_type", filters.placement_type);
  }

  if (filters.search) {
    const term = filters.search.trim();
    query = query.or(
      `reference_number.ilike.%${term}%,bed_reference.ilike.%${term}%,room_number.ilike.%${term}%,notes.ilike.%${term}%`,
    );
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list placements: ${error.message}`);
  }

  return { data: (data ?? []) as Placement[], count: count ?? 0 };
}

// ─── Get Placement By ID ─────────────────────────────────────────────────────

export async function getPlacementById(
  adminSupabase: AdminClient,
  id: string,
): Promise<Placement | null> {
  const { data, error } = await adminSupabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get placement: ${error.message}`);
  }

  return data as Placement;
}

// ─── Get Placement By Child ID (active) ──────────────────────────────────────

export async function getActivePlacementByChildId(
  adminSupabase: AdminClient,
  childId: string,
): Promise<Placement | null> {
  const { data, error } = await adminSupabase
    .from(TABLE)
    .select("*")
    .eq("child_id", childId)
    .eq("status", "active")
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to get active placement: ${error.message}`);
  }

  return data as Placement;
}

// ─── Generate Placement Reference ────────────────────────────────────────────

export async function generatePlacementReference(
  adminSupabase: AdminClient,
  centreId: string,
): Promise<string> {
  const { data: centre, error: centreError } = await adminSupabase
    .from("centres")
    .select("code")
    .eq("id", centreId)
    .single();

  if (centreError || !centre) {
    throw new Error("Centre not found");
  }

  const { count, error: countError } = await adminSupabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("centre_id", centreId);

  if (countError) {
    throw new Error(`Failed to generate reference: ${countError.message}`);
  }

  const nextNumber = (count ?? 0) + 1;
  return `${centre.code}-PLC-${String(nextNumber).padStart(6, "0")}`;
}

// ─── Create Placement ────────────────────────────────────────────────────────

export async function createPlacement(
  adminSupabase: AdminClient,
  input: CreatePlacementInput,
): Promise<Placement> {
  // Check that child doesn't already have an active placement
  const existing = await getActivePlacementByChildId(adminSupabase, input.child_id);
  if (existing) {
    throw new Error("Child already has an active placement");
  }

  const referenceNumber = await generatePlacementReference(
    adminSupabase,
    input.centre_id,
  );

  const payload = {
    centre_id: input.centre_id,
    child_id: input.child_id,
    admission_id: input.admission_id ?? null,
    reference_number: referenceNumber,
    status: "active" as const,
    bed_reference: input.bed_reference ?? null,
    room_number: input.room_number ?? null,
    start_date: input.start_date,
    end_date: input.end_date ?? null,
    placement_type: input.placement_type ?? "residential",
    notes: input.notes ?? null,
    metadata: input.metadata ?? null,
  };

  const { data, error } = await adminSupabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A placement with this reference already exists");
    }
    if (error.code === "23503") {
      throw new Error("Invalid centre, child, or admission reference");
    }
    throw new Error(`Failed to create placement: ${error.message}`);
  }

  return data as Placement;
}

// ─── Update Placement ────────────────────────────────────────────────────────

export async function updatePlacement(
  adminSupabase: AdminClient,
  id: string,
  input: UpdatePlacementInput,
): Promise<Placement> {
  const payload: Record<string, unknown> = {};

  if (input.bed_reference !== undefined) payload.bed_reference = input.bed_reference || null;
  if (input.room_number !== undefined) payload.room_number = input.room_number || null;
  if (input.end_date !== undefined) payload.end_date = input.end_date || null;
  if (input.placement_type !== undefined) payload.placement_type = input.placement_type;
  if (input.notes !== undefined) payload.notes = input.notes || null;
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
      throw new Error("Placement not found");
    }
    throw new Error(`Failed to update placement: ${error.message}`);
  }

  return data as Placement;
}

// ─── Update Placement Status ─────────────────────────────────────────────────

export async function updatePlacementStatus(
  adminSupabase: AdminClient,
  placementId: string,
  centreId: string,
  input: UpdatePlacementStatusInput,
): Promise<Placement> {
  const placement = await getPlacementById(adminSupabase, placementId);
  if (!placement) {
    throw new Error("Placement not found");
  }

  if (placement.centre_id !== centreId) {
    throw new Error("Placement does not belong to this centre");
  }

  const previousStatus = placement.status;

  if (previousStatus === input.new_status) {
    throw new Error(`Placement is already ${input.new_status}`);
  }

  const updatePayload: Record<string, unknown> = {
    status: input.new_status,
  };

  // Set end_date when completing or discharging
  if (input.end_date) {
    updatePayload.end_date = input.end_date;
  } else if (["completed", "transferred", "discharged"].includes(input.new_status)) {
    updatePayload.end_date = new Date().toISOString().split("T")[0];
  }

  const { data, error } = await adminSupabase
    .from(TABLE)
    .update(updatePayload)
    .eq("id", placementId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update placement status: ${error.message}`);
  }

  return data as Placement;
}

// ─── Get Placements By Child ─────────────────────────────────────────────────

export async function getPlacementsByChild(
  adminSupabase: AdminClient,
  childId: string,
): Promise<Placement[]> {
  const { data, error } = await adminSupabase
    .from(TABLE)
    .select("*")
    .eq("child_id", childId)
    .order("start_date", { ascending: false });

  if (error) {
    throw new Error(`Failed to get placements by child: ${error.message}`);
  }

  return (data ?? []) as Placement[];
}
