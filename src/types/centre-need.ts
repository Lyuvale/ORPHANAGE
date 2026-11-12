/**
 * Centre Needs Types
 *
 * A centre publishes current needs (uniforms, food, repairs…) that donors can
 * support. Money raised is tracked as contributions, never as a stored total.
 *
 * PROGRESS MODEL (computed, never stored):
 *   raised    = SUM(amount) for contributions where status = 'verified'
 *   remaining = max(0, target - raised)
 *   percent   = min(100, raised / target * 100)
 *   completed = raised >= target
 *
 * SECURITY:
 *   - centre_id is always derived server-side, never from client input.
 *   - PublicCentreNeed is the ONLY shape exposed on /s/[code]; it deliberately
 *     omits created_by/updated_by and all contribution-level data.
 */

// ─── Status ─────────────────────────────────────────────────────────────────

export const CENTRE_NEED_STATUSES = ["active", "completed", "archived"] as const;

export type CentreNeedStatus = (typeof CENTRE_NEED_STATUSES)[number];

// ─── Contribution source ────────────────────────────────────────────────────

export const CENTRE_NEED_CONTRIBUTION_SOURCES = [
  "ONLINE",
  "MANUAL",
  "PUBLIC",
] as const;

export type CentreNeedContributionSource =
  (typeof CENTRE_NEED_CONTRIBUTION_SOURCES)[number];

// ─── Contribution verification status ───────────────────────────────────────

export const CENTRE_NEED_CONTRIBUTION_STATUSES = [
  "pending",
  "verified",
  "rejected",
] as const;

export type CentreNeedContributionStatus =
  (typeof CENTRE_NEED_CONTRIBUTION_STATUSES)[number];

// ─── Centre need record ─────────────────────────────────────────────────────

export interface CentreNeed {
  id: string;
  centre_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  target_amount: number;
  status: CentreNeedStatus;
  is_public: boolean;
  sort_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Contribution record ────────────────────────────────────────────────────

export interface CentreNeedContribution {
  id: string;
  need_id: string;
  centre_id: string;
  amount: number;
  source: CentreNeedContributionSource;
  status: CentreNeedContributionStatus;
  transaction_reference: string | null;
  contributor_name: string | null;
  contributor_phone: string | null;
  payment_transaction_id: string | null;
  note: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_by: string | null;
  created_at: string;
}

/** Contribution row enriched with the parent need's title (verification queue). */
export interface CentreNeedContributionWithNeed extends CentreNeedContribution {
  need_title: string | null;
}

// ─── Computed progress ──────────────────────────────────────────────────────

export interface CentreNeedProgress {
  need_id: string;
  target_amount: number;
  raised_amount: number;
  remaining_amount: number;
  percent: number;
  is_completed: boolean;
}

// ─── Public shape (safe for /s/[code]) ──────────────────────────────────────

export interface PublicCentreNeed {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  target_amount: number;
  status: CentreNeedStatus;
  sort_order: number;
  created_at: string;
  raised_amount: number;
  remaining_amount: number;
  percent: number;
  is_completed: boolean;
}

// ─── Inputs ─────────────────────────────────────────────────────────────────

export interface CreateCentreNeedInput {
  title: string;
  description?: string | null;
  image_url?: string | null;
  target_amount: number;
  status?: CentreNeedStatus;
  is_public?: boolean;
  sort_order?: number;
}

export type UpdateCentreNeedInput = Partial<CreateCentreNeedInput>;

// ─── Contribution inputs ────────────────────────────────────────────────────

export interface PublicContributionInput {
  needId: string;
  amount: number;
  transactionReference: string;
  contributorName?: string | null;
  contributorPhone?: string | null;
}

export interface ManualContributionInput {
  needId: string;
  amount: number;
  transactionReference?: string | null;
  contributorName?: string | null;
  contributorPhone?: string | null;
  note?: string | null;
}

// ─── Progress helper ────────────────────────────────────────────────────────

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Compute a need's progress from its target and the SUM of contributions.
 * This is the single source of truth used by manager and public views.
 */
export function computeNeedProgress(
  needId: string,
  targetAmount: number,
  raisedAmount: number,
): CentreNeedProgress {
  const target = Number.isFinite(Number(targetAmount)) ? Number(targetAmount) : 0;
  const raised = Number.isFinite(Number(raisedAmount)) ? Number(raisedAmount) : 0;

  const percentRaw = target > 0 ? (raised / target) * 100 : 0;

  return {
    need_id: needId,
    target_amount: round2(target),
    raised_amount: round2(raised),
    remaining_amount: round2(Math.max(0, target - raised)),
    percent: Math.min(100, Math.max(0, round2(percentRaw))),
    is_completed: target > 0 && raised >= target,
  };
}
