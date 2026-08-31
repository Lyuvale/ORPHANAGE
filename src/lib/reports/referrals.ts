/**
 * Referrals section reports — row builders + data queries.
 *
 * Each builder returns a flat table of rows suitable for CSV / Excel / PDF
 * export. All queries are scoped to a single centre (tenant isolation) and
 * only expose fields the `referrals.view` permission already allows. Sensitive
 * referral narrative (reason / notes) is intentionally excluded in favour of
 * reference, child, source, status and dates.
 */
import {
  getReferralDisplayName,
  getReferralDisplayStatus,
  getReferralDisplaySource,
  type Referral,
} from "@/types/referral";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

function ymd(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export async function getAllReferrals(
  admin: AdminClient,
  centreId: string,
): Promise<Referral[]> {
  const { data, error } = await admin
    .from("referrals")
    .select("*")
    .eq("centre_id", centreId)
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(`Failed to load referrals: ${error.message}`);
  return (data ?? []) as Referral[];
}

// ─── Report row builders ────────────────────────────────────

export function referralsDetailRows(referrals: Referral[]): ReportRowLike[] {
  return referrals.map((r) => ({
    reference: r.reference_number,
    child: getReferralDisplayName(r),
    referral_type: getReferralDisplaySource(r.source),
    status: getReferralDisplayStatus(r.status),
    submitted: ymd(r.submitted_at),
  }));
}

export function referralsByStatusRows(referrals: Referral[]): ReportRowLike[] {
  const counts = new Map<string, number>();
  for (const r of referrals) {
    const status = getReferralDisplayStatus(r.status);
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}

export interface ReportRowLike {
  [key: string]: string | number;
}
