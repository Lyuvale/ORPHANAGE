import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeNeedProgress,
  type CentreNeed,
  type CentreNeedProgress,
  type CreateCentreNeedInput,
  type PublicCentreNeed,
  type UpdateCentreNeedInput,
} from "@/types/centre-need";

const TABLE = "centre_needs" as const;
const CONTRIBUTIONS_TABLE = "centre_need_contributions" as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

/**
 * Explicit PUBLIC column list for /s/[code].
 * Never add created_by/updated_by, and never select contribution notes,
 * actors or payment_transaction_id on this path.
 */
const PUBLIC_NEED_COLUMNS =
  "id, title, description, image_url, target_amount, status, sort_order, created_at";

interface ContributionAmountRow {
  need_id: string;
  amount: number | string;
}

interface PublicNeedRow {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  target_amount: number | string;
  status: PublicCentreNeed["status"];
  sort_order: number;
  created_at: string;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

async function sumRaisedByNeed(
  admin: AdminClient,
  centreId: string,
  needIds: string[],
): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  if (needIds.length === 0) return totals;

  const { data, error } = await admin
    .from(CONTRIBUTIONS_TABLE)
    .select("need_id, amount")
    .eq("centre_id", centreId)
    .in("need_id", needIds);

  if (error) {
    throw new Error(`Failed to sum need contributions: ${error.message}`);
  }

  for (const row of (data ?? []) as ContributionAmountRow[]) {
    const current = totals.get(row.need_id) ?? 0;
    totals.set(row.need_id, current + Number(row.amount));
  }

  return totals;
}

// ─── Manager reads ──────────────────────────────────────────────────────────

export async function listNeeds(
  admin: AdminClient,
  centreId: string,
): Promise<CentreNeed[]> {
  const { data, error } = await admin
    .from(TABLE)
    .select("*")
    .eq("centre_id", centreId)
    .order("sort_order")
    .order("created_at");

  if (error) throw new Error(`Failed to list centre needs: ${error.message}`);
  return (data ?? []) as CentreNeed[];
}

export async function getNeed(
  admin: AdminClient,
  centreId: string,
  needId: string,
): Promise<CentreNeed | null> {
  const { data, error } = await admin
    .from(TABLE)
    .select("*")
    .eq("id", needId)
    .eq("centre_id", centreId)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to load centre need: ${error.message}`);
  }
  return (data as CentreNeed | null) ?? null;
}

export interface CentreNeedWithProgress {
  need: CentreNeed;
  progress: CentreNeedProgress;
}

export async function listNeedsWithProgress(
  admin: AdminClient,
  centreId: string,
): Promise<CentreNeedWithProgress[]> {
  const needs = await listNeeds(admin, centreId);
  const totals = await sumRaisedByNeed(
    admin,
    centreId,
    needs.map((need) => need.id),
  );

  return needs.map((need) => ({
    need,
    progress: computeNeedProgress(
      need.id,
      Number(need.target_amount),
      totals.get(need.id) ?? 0,
    ),
  }));
}

export async function getNeedProgress(
  admin: AdminClient,
  centreId: string,
  needId: string,
): Promise<CentreNeedProgress | null> {
  const need = await getNeed(admin, centreId, needId);
  if (!need) return null;

  const totals = await sumRaisedByNeed(admin, centreId, [need.id]);
  return computeNeedProgress(
    need.id,
    Number(need.target_amount),
    totals.get(need.id) ?? 0,
  );
}

// ─── Manager writes (centre_id always comes from the server ctx) ────────────

export async function createNeed(
  admin: AdminClient,
  centreId: string,
  input: CreateCentreNeedInput,
  createdBy: string,
): Promise<CentreNeed> {
  const { data, error } = await admin
    .from(TABLE)
    .insert({
      centre_id: centreId,
      title: input.title.trim(),
      description: input.description ?? null,
      image_url: input.image_url ?? null,
      target_amount: round2(input.target_amount),
      status: input.status ?? "active",
      is_public: input.is_public ?? true,
      sort_order: input.sort_order ?? 0,
      created_by: createdBy,
      updated_by: createdBy,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create centre need: ${error.message}`);
  return data as CentreNeed;
}

export async function updateNeed(
  admin: AdminClient,
  centreId: string,
  needId: string,
  patch: UpdateCentreNeedInput,
  updatedBy: string,
): Promise<CentreNeed | null> {
  const next: Record<string, unknown> = { updated_by: updatedBy };

  if (patch.title !== undefined) next.title = patch.title.trim();
  if (patch.description !== undefined) next.description = patch.description;
  if (patch.image_url !== undefined) next.image_url = patch.image_url;
  if (patch.target_amount !== undefined) {
    next.target_amount = round2(patch.target_amount);
  }
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.is_public !== undefined) next.is_public = patch.is_public;
  if (patch.sort_order !== undefined) next.sort_order = patch.sort_order;

  const { data, error } = await admin
    .from(TABLE)
    .update(next)
    .eq("id", needId)
    .eq("centre_id", centreId)
    .select()
    .maybeSingle();

  if (error) throw new Error(`Failed to update centre need: ${error.message}`);
  return (data as CentreNeed | null) ?? null;
}

export async function deleteNeed(
  admin: AdminClient,
  centreId: string,
  needId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from(TABLE)
    .delete()
    .eq("id", needId)
    .eq("centre_id", centreId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`Failed to delete centre need: ${error.message}`);
  return Boolean(data);
}

// ─── Public read (safe shape only) ──────────────────────────────────────────

export async function listPublicNeeds(
  admin: AdminClient,
  centreId: string,
): Promise<PublicCentreNeed[]> {
  const { data, error } = await admin
    .from(TABLE)
    .select(PUBLIC_NEED_COLUMNS)
    .eq("centre_id", centreId)
    .eq("is_public", true)
    .neq("status", "archived")
    .order("sort_order")
    .order("created_at");

  if (error) {
    throw new Error(`Failed to list public centre needs: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as PublicNeedRow[];
  const totals = await sumRaisedByNeed(
    admin,
    centreId,
    rows.map((row) => row.id),
  );

  return rows.map((row) => {
    const progress = computeNeedProgress(
      row.id,
      Number(row.target_amount),
      totals.get(row.id) ?? 0,
    );

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      image_url: row.image_url,
      target_amount: Number(row.target_amount),
      status: row.status,
      sort_order: row.sort_order,
      created_at: row.created_at,
      raised_amount: progress.raised_amount,
      remaining_amount: progress.remaining_amount,
      percent: progress.percent,
      is_completed: progress.is_completed,
    };
  });
}
