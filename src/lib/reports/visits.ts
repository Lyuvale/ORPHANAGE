/**
 * Visits section reports — row builders + data queries.
 *
 * Each builder returns a flat table of rows suitable for CSV / Excel / PDF
 * export. All queries are scoped to a single centre (tenant isolation) and
 * only expose fields the `visits.view` permission already allows.
 */

import type { VisitStatus } from "@/types/visit";
import { getVisitStatusDisplay, getVisitTypeDisplay } from "@/types/visit";

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

export interface VisitLike {
  reference_number: string;
  child_id: string;
  guardian_id: string;
  visit_type: string;
  status: VisitStatus;
  scheduled_date: string;
  purpose: string;
  [key: string]: unknown;
}

interface NameLike {
  id: string;
  first_name: string;
  last_name: string;
}

function fullName(r: NameLike): string {
  return `${r.first_name} ${r.last_name}`;
}

/**
 * Load all visits for a centre, optionally pinned to a set of statuses, plus
 * the child and guardian name maps needed to render visitor / child labels.
 */
async function loadVisitsWithNames(
  admin: AdminClient,
  centreId: string,
  opts: { statuses?: VisitStatus[]; futureOnly?: boolean } = {},
) {
  let query = admin
    .from("visits")
    .select("reference_number, child_id, guardian_id, visit_type, status, scheduled_date, purpose")
    .eq("centre_id", centreId);

  if (opts.statuses && opts.statuses.length > 0) {
    query = query.in("status", opts.statuses);
  }
  if (opts.futureOnly) {
    const today = new Date().toISOString().split("T")[0];
    query = query.gte("scheduled_date", today);
  }

  const { data: visits, error } = await query.order("scheduled_date", { ascending: true });
  if (error) throw new Error(`Failed to load visits: ${error.message}`);

  const childIds = Array.from(new Set((visits ?? []).map((v: VisitLike) => v.child_id)));
  const guardianIds = Array.from(new Set((visits ?? []).map((v: VisitLike) => v.guardian_id)));

  const [childrenRes, guardiansRes] = await Promise.all([
    admin
      .from("children")
      .select("id, first_name, last_name")
      .in("id", childIds.length ? childIds : ["__none__"]),
    admin
      .from("guardians")
      .select("id, first_name, last_name")
      .in("id", guardianIds.length ? guardianIds : ["__none__"]),
  ]);
  if (childrenRes.error) throw new Error(`Failed to load children: ${childrenRes.error.message}`);
  if (guardiansRes.error) throw new Error(`Failed to load guardians: ${guardiansRes.error.message}`);

  const childNames: Map<string, string> = new Map(
    (childrenRes.data ?? []).map((c: NameLike) => [c.id, fullName(c)]),
  );
  const guardianNames: Map<string, string> = new Map(
    (guardiansRes.data ?? []).map((g: NameLike) => [g.id, fullName(g)]),
  );

  return { visits: visits ?? [], childNames, guardianNames };
}

// ─── Report row builders ────────────────────────────────────

export function visitsByStatusRows(visits: VisitLike[]): ReportRowLike[] {
  const counts = new Map<string, number>();
  for (const v of visits) {
    counts.set(v.status, (counts.get(v.status) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([status, count]) => ({
      status: getVisitStatusDisplay(status as VisitStatus),
      visits: count,
    }))
    .sort((a, b) => b.visits - a.visits);
}

export function visitHistoryRows(
  visits: VisitLike[],
  childNames: Map<string, string>,
  guardianNames: Map<string, string>,
): ReportRowLike[] {
  return visits.map((v) => ({
    reference: v.reference_number,
    child: childNames.get(v.child_id) ?? "Unknown",
    visitor: guardianNames.get(v.guardian_id) ?? "Unknown",
    visit_type: getVisitTypeDisplay(v.visit_type as never),
    date: ymd(v.scheduled_date),
    purpose: v.purpose,
    status: getVisitStatusDisplay(v.status as VisitStatus),
  }));
}

// ─── Aggregate data loaders ─────────────────────────────────

export async function allVisitsCountsByStatus(
  admin: AdminClient,
  centreId: string,
): Promise<ReportRowLike[]> {
  const { data, error } = await admin
    .from("visits")
    .select("status")
    .eq("centre_id", centreId);
  if (error) throw new Error(`Failed to load visits: ${error.message}`);
  return visitsByStatusRows((data ?? []) as VisitLike[]);
}

export async function visitHistoryReport(
  admin: AdminClient,
  centreId: string,
): Promise<ReportRowLike[]> {
  const { visits, childNames, guardianNames } = await loadVisitsWithNames(admin, centreId);
  return visitHistoryRows(visits, childNames, guardianNames);
}

export async function upcomingVisitsReport(
  admin: AdminClient,
  centreId: string,
): Promise<ReportRowLike[]> {
  const { visits, childNames, guardianNames } = await loadVisitsWithNames(admin, centreId, {
    statuses: ["approved", "scheduled", "checked_in"],
    futureOnly: true,
  });
  return visitHistoryRows(visits, childNames, guardianNames);
}
