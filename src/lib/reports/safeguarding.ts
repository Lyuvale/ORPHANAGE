/**
 * Safeguarding section reports — row builders + data queries.
 *
 * Each builder returns a flat table of rows suitable for CSV / Excel / PDF
 * export. All queries are scoped to a single centre (tenant isolation).
 *
 * SECURITY: this section is sensitive and gated by `safeguarding.view`. Only
 * SAFE SUMMARY fields are exported — concern/action descriptions, titles
 * containing raw narrative, and other sensitive details are never included.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

import {
  getSafeguardingStatusDisplay,
  getSafeguardingSeverityDisplay,
  getSafeguardingConcernTypeDisplay,
  type SafeguardingConcernType,
  type SafeguardingSeverity,
  type SafeguardingStatus,
} from "@/types/safeguarding";

function ymd(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export interface ReportRowLike {
  [key: string]: string | number;
}

/** Build a child-id -> label map for this centre (child reference only). */
async function childLabels(
  admin: AdminClient,
  centreId: string,
): Promise<Map<string, string>> {
  const { data, error } = await admin
    .from("children")
    .select("id, reference_number, first_name, last_name")
    .eq("centre_id", centreId);
  if (error) throw new Error(`Failed to load children: ${error.message}`);
  return new Map(
    (data ?? []).map((c: { id: string; reference_number: string; first_name: string; last_name: string }) => [
      c.id,
      `${c.first_name} ${c.last_name} (${c.reference_number})`,
    ]),
  );
}

export function concernsSummaryRows(concerns: ConcernLike[]): ReportRowLike[] {
  const counts = new Map<string, number>();
  for (const c of concerns) {
    const key = getSafeguardingStatusDisplay(c.status as SafeguardingStatus);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}

export function concernsBySeverityRows(concerns: ConcernLike[]): ReportRowLike[] {
  const counts = new Map<string, number>();
  for (const c of concerns) {
    const key = getSafeguardingSeverityDisplay(c.severity as SafeguardingSeverity);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([severity, count]) => ({ severity, count }))
    .sort((a, b) => b.count - a.count);
}

export function concernsSafeRows(
  concerns: ConcernLike[],
  children: Map<string, string>,
): ReportRowLike[] {
  return concerns.map((c) => ({
    child: children.get(c.child_id) ?? "Unknown",
    concern_type: getSafeguardingConcernTypeDisplay(c.concern_type as SafeguardingConcernType),
    severity: getSafeguardingSeverityDisplay(c.severity as SafeguardingSeverity),
    status: getSafeguardingStatusDisplay(c.status as SafeguardingStatus),
    reported_at: ymd(c.reported_at),
  }));
}

export function actionsRows(
  actions: ActionLike[],
  concerns: Map<string, string>,
): ReportRowLike[] {
  return actions.map((a) => ({
    concern: concerns.get(a.concern_id) ?? "Unknown",
    action_type: a.action_type,
    status: a.status,
    due_date: ymd(a.due_date),
    recorded_at: ymd(a.created_at),
  }));
}

export async function safeguardingConcernRows(
  admin: AdminClient,
  centreId: string,
): Promise<ConcernLike[]> {
  const { data, error } = await admin
    .from("safeguarding_concerns")
    .select("id, child_id, concern_type, severity, status, reported_at")
    .eq("centre_id", centreId)
    .order("reported_at", { ascending: false });
  if (error) throw new Error(`Failed to load safeguarding concerns: ${error.message}`);
  return data ?? [];
}

export async function safeguardingActionRows(
  admin: AdminClient,
  centreId: string,
): Promise<ActionLike[]> {
  const { data, error } = await admin
    .from("safeguarding_actions")
    .select("concern_id, action_type, status, due_date, created_at")
    .eq("centre_id", centreId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load safeguarding actions: ${error.message}`);
  return data ?? [];
}

export interface ConcernLike {
  id: string;
  child_id: string;
  concern_type: string;
  severity: string;
  status: string;
  reported_at: string;
  [key: string]: unknown;
}

export interface ActionLike {
  concern_id: string;
  action_type: string;
  status: string;
  due_date: string | null;
  created_at: string;
  [key: string]: unknown;
}

export { childLabels };
