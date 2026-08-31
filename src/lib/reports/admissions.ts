/**
 * Admissions section reports — row builders + data queries.
 *
 * Each builder returns a flat table of rows suitable for CSV / Excel / PDF
 * export. All queries are scoped to a single centre (tenant isolation) and
 * only expose fields the `admissions.view` permission already allows.
 */
import { getAdmissionDisplayStatus } from "@/types/admission";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

function ymd(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export async function getAllAdmissions(
  admin: AdminClient,
  centreId: string,
): Promise<AdmissionLike[]> {
  const { data, error } = await admin
    .from("admissions")
    .select("*")
    .eq("centre_id", centreId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load admissions: ${error.message}`);
  return (data ?? []) as AdmissionLike[];
}

// ─── Report row builders ────────────────────────────────────

export function admissionsDetailRows(admissions: AdmissionLike[]): ReportRowLike[] {
  return admissions.map((a) => ({
    reference: a.reference_number,
    referral_reference: a.referral_id,
    status: getAdmissionDisplayStatus(a.status as never),
    admitted_date: a.admitted_date ? ymd(a.admitted_date) : "-",
    decision: a.decision ?? "-",
    created: ymd(a.created_at),
  }));
}

export function admissionsByStatusRows(admissions: AdmissionLike[]): ReportRowLike[] {
  const counts = new Map<string, number>();
  for (const a of admissions) {
    const status = getAdmissionDisplayStatus(a.status as never);
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}

export function admissionsSummaryRows(admissions: AdmissionLike[]): ReportRowLike[] {
  const byStatus = new Map<string, number>();
  for (const a of admissions) {
    const status = getAdmissionDisplayStatus(a.status as never);
    byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
  }
  const statusRows = Array.from(byStatus.entries())
    .map(([status, count]) => ({ dimension: "Status", value: status, count }))
    .sort((a, b) => b.count - a.count);

  const approved = admissions.filter((a) => a.status === "approved").length;
  const pending = admissions.filter((a) => a.status === "pending").length;
  const denied = admissions.filter((a) => a.status === "denied").length;
  const cancelled = admissions.filter((a) => a.status === "cancelled").length;
  const total = admissions.length;

  return [
    { dimension: "Total", value: "All Admissions", count: total },
    { dimension: "Total", value: "Approved", count: approved },
    { dimension: "Total", value: "Pending", count: pending },
    { dimension: "Total", value: "Denied", count: denied },
    { dimension: "Total", value: "Cancelled", count: cancelled },
    ...statusRows,
  ];
}

// ─── Types ──────────────────────────────────────────────────

export interface AdmissionLike {
  id: string;
  referral_id: string;
  reference_number: string;
  status: string;
  decision: string | null;
  admitted_date: string | null;
  created_at: string;
  [key: string]: unknown;
}

export interface ReportRowLike {
  [key: string]: string | number;
}
