/**
 * Cases section reports — row builders + data queries.
 *
 * Each builder returns a flat table of rows suitable for CSV / Excel / PDF
 * export. Queries are scoped to a single centre (tenant isolation) and are
 * gated by the `cases.view` permission.
 *
 * SENSITIVITY: case records can contain sensitive narratives. These reports
 * only expose summary-level fields (reference, child, case type/category,
 * status, dates, priority) and never export free-text narratives such as
 * `title`, `description`, `resolution_notes`, or note content.
 */

import type { CaseStatus } from "@/types/case";
import { getCaseStatusDisplay, getCaseTypeDisplay, getCasePriorityDisplay } from "@/types/case";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AdminClient = any;

export interface ReportRowLike {
  [key: string]: string | number;
}

function ymd(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export interface CaseLike {
  reference_number: string;
  child_id: string;
  case_type: string;
  status: CaseStatus;
  priority: string;
  opened_at: string;
  closed_at?: string | null;
  [key: string]: unknown;
}

/** Cases that are not resolved/closed (still open workflow). */
const OPEN_STATUSES: CaseStatus[] = ["open", "under_assessment", "active_plan", "on_hold"];

// ─── Report row builders ────────────────────────────────────

export function casesByStatusRows(cases: CaseLike[]): ReportRowLike[] {
  const counts = new Map<string, number>();
  for (const c of cases) {
    counts.set(c.status, (counts.get(c.status) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([status, count]) => ({
      status: getCaseStatusDisplay(status as CaseStatus),
      cases: count,
    }))
    .sort((a, b) => b.cases - a.cases);
}

export function caseSummaryRows(cases: CaseLike[]): ReportRowLike[] {
  return casesByStatusRows(cases);
}

export function openCasesRows(
  cases: CaseLike[],
  childNames: Map<string, string>,
): ReportRowLike[] {
  return cases.map((c) => ({
    reference: c.reference_number,
    child: childNames.get(c.child_id) ?? "Unknown",
    case_type: getCaseTypeDisplay(c.case_type as never),
    status: getCaseStatusDisplay(c.status as CaseStatus),
    priority: getCasePriorityDisplay(c.priority as never),
    opened_date: ymd(c.opened_at),
  }));
}

// ─── Aggregate data loaders ─────────────────────────────────

async function loadCases(admin: AdminClient, centreId: string, statuses?: CaseStatus[]) {
  let query = admin
    .from("cases")
    .select("reference_number, child_id, case_type, status, priority, opened_at, closed_at")
    .eq("centre_id", centreId);
  if (statuses && statuses.length > 0) {
    query = query.in("status", statuses);
  }
  const { data, error } = await query.order("opened_at", { ascending: false });
  if (error) throw new Error(`Failed to load cases: ${error.message}`);
  return (data ?? []) as CaseLike[];
}

async function loadChildNames(
  admin: AdminClient,
  centreId: string,
  cases: CaseLike[],
): Promise<Map<string, string>> {
  const childIds = Array.from(new Set(cases.map((c: CaseLike) => c.child_id)));
  const { data, error } = await admin
    .from("children")
    .select("id, first_name, last_name")
    .eq("centre_id", centreId)
    .in("id", childIds.length ? childIds : ["__none__"]);
  if (error) throw new Error(`Failed to load children: ${error.message}`);
  return new Map(
    (data ?? []).map((c: ChildNameLike) => [c.id, `${c.first_name} ${c.last_name}`]),
  );
}

interface ChildNameLike {
  id: string;
  first_name: string;
  last_name: string;
}

export async function casesByStatusReport(
  admin: AdminClient,
  centreId: string,
): Promise<ReportRowLike[]> {
  const cases = await loadCases(admin, centreId);
  return casesByStatusRows(cases);
}

export async function caseSummaryReport(
  admin: AdminClient,
  centreId: string,
): Promise<ReportRowLike[]> {
  const cases = await loadCases(admin, centreId);
  return caseSummaryRows(cases);
}

export async function openCasesReport(
  admin: AdminClient,
  centreId: string,
): Promise<ReportRowLike[]> {
  const cases = await loadCases(admin, centreId, OPEN_STATUSES);
  const childNames = await loadChildNames(admin, centreId, cases);
  return openCasesRows(cases, childNames);
}
