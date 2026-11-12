import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeNeedProgress,
  type CentreNeed,
  type CentreNeedContribution,
  type CentreNeedContributionStatus,
  type CentreNeedContributionWithNeed,
  type CentreNeedProgress,
  type CreateCentreNeedInput,
  type ManualContributionInput,
  type PublicCentreNeed,
  type PublicContributionInput,
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

/**
 * Explicit column list for contribution reads. Never select `*` here, and
 * never expose `payment_transaction_id` on the public path.
 */
const CONTRIBUTION_COLUMNS =
  "id, need_id, centre_id, amount, source, status, transaction_reference, contributor_name, payment_transaction_id, note, verified_by, verified_at, created_by, created_at";

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

  // Progress is computed from VERIFIED contributions only. Pending public
  // submissions and rejected rows must never inflate the amount raised.
  const { data, error } = await admin
    .from(CONTRIBUTIONS_TABLE)
    .select("need_id, amount")
    .eq("centre_id", centreId)
    .eq("status", "verified")
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

// ─── Contribution reads ─────────────────────────────────────────────────────

export async function getContribution(
  admin: AdminClient,
  centreId: string,
  contributionId: string,
): Promise<CentreNeedContribution | null> {
  const { data, error } = await admin
    .from(CONTRIBUTIONS_TABLE)
    .select(CONTRIBUTION_COLUMNS)
    .eq("id", contributionId)
    .eq("centre_id", centreId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to load contribution: ${error.message}`);
  }
  return (data as CentreNeedContribution | null) ?? null;
}

export async function listContributionsByStatus(
  admin: AdminClient,
  centreId: string,
  status: CentreNeedContributionStatus,
): Promise<CentreNeedContributionWithNeed[]> {
  const { data, error } = await admin
    .from(CONTRIBUTIONS_TABLE)
    .select(CONTRIBUTION_COLUMNS)
    .eq("centre_id", centreId)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(`Failed to list ${status} contributions: ${error.message}`);
  }

  const rows = (data ?? []) as CentreNeedContribution[];
  if (rows.length === 0) return [];

  const needIds = [...new Set(rows.map((row) => row.need_id))];
  const { data: needs } = await admin
    .from(TABLE)
    .select("id, title")
    .eq("centre_id", centreId)
    .in("id", needIds);

  const titles = new Map<string, string>();
  for (const need of (needs ?? []) as { id: string; title: string }[]) {
    titles.set(need.id, need.title);
  }

  return rows.map((row) => ({
    ...row,
    need_title: titles.get(row.need_id) ?? null,
  }));
}

// ─── Contribution writes ────────────────────────────────────────────────────

export async function createPublicContribution(
  admin: AdminClient,
  centreId: string,
  input: PublicContributionInput,
): Promise<CentreNeedContribution> {
  const need = await getNeed(admin, centreId, input.needId);
  if (!need || need.status !== "active" || !need.is_public) {
    throw new Error("Need not available");
  }

  const { data, error } = await admin
    .from(CONTRIBUTIONS_TABLE)
    .insert({
      need_id: need.id,
      centre_id: centreId,
      amount: round2(input.amount),
      source: "PUBLIC",
      status: "pending",
      transaction_reference: input.transactionReference.trim(),
      contributor_name: input.contributorName?.trim() || null,
      created_by: null,
    })
    .select(CONTRIBUTION_COLUMNS)
    .single();

  if (error) {
    throw new Error(`Failed to record contribution: ${error.message}`);
  }
  return data as CentreNeedContribution;
}

export async function createManualContribution(
  admin: AdminClient,
  centreId: string,
  input: ManualContributionInput,
  createdBy: string,
): Promise<CentreNeedContribution> {
  const need = await getNeed(admin, centreId, input.needId);
  if (!need) throw new Error("Need not found");

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from(CONTRIBUTIONS_TABLE)
    .insert({
      need_id: need.id,
      centre_id: centreId,
      amount: round2(input.amount),
      source: "MANUAL",
      status: "verified",
      transaction_reference: input.transactionReference?.trim() || null,
      contributor_name: input.contributorName?.trim() || null,
      note: input.note ?? null,
      verified_by: createdBy,
      verified_at: now,
      created_by: createdBy,
    })
    .select(CONTRIBUTION_COLUMNS)
    .single();

  if (error) {
    throw new Error(`Failed to record manual contribution: ${error.message}`);
  }
  return data as CentreNeedContribution;
}

export async function verifyContribution(
  admin: AdminClient,
  centreId: string,
  contributionId: string,
  verifiedBy: string,
): Promise<CentreNeedContribution | null> {
  const { data, error } = await admin
    .from(CONTRIBUTIONS_TABLE)
    .update({
      status: "verified",
      verified_by: verifiedBy,
      verified_at: new Date().toISOString(),
    })
    .eq("id", contributionId)
    .eq("centre_id", centreId)
    .eq("status", "pending")
    .select(CONTRIBUTION_COLUMNS)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to verify contribution: ${error.message}`);
  }
  return (data as CentreNeedContribution | null) ?? null;
}

export async function rejectContribution(
  admin: AdminClient,
  centreId: string,
  contributionId: string,
  rejectedBy: string,
  note?: string | null,
): Promise<CentreNeedContribution | null> {
  const patch: Record<string, unknown> = {
    status: "rejected",
    verified_by: rejectedBy,
    verified_at: new Date().toISOString(),
  };
  if (note !== undefined) patch.note = note;

  const { data, error } = await admin
    .from(CONTRIBUTIONS_TABLE)
    .update(patch)
    .eq("id", contributionId)
    .eq("centre_id", centreId)
    .eq("status", "pending")
    .select(CONTRIBUTION_COLUMNS)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to reject contribution: ${error.message}`);
  }
  return (data as CentreNeedContribution | null) ?? null;
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
