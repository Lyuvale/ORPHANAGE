/**
 * Children section reports — row builders + data queries.
 *
 * Each builder returns a flat table of rows suitable for CSV / Excel / PDF
 * export. All queries are scoped to a single centre (tenant isolation) and
 * only expose fields the `children.view` permission already allows.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

function ymd(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/** Compute age in years from an ISO date at the given reference (default now). */
export function ageYears(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return Math.max(0, age);
}

export const AGE_GROUPS = [
  { key: "0-5", label: "0–5", test: (a: number) => a <= 5 },
  { key: "6-10", label: "6–10", test: (a: number) => a >= 6 && a <= 10 },
  { key: "11-14", label: "11–14", test: (a: number) => a >= 11 && a <= 14 },
  { key: "15-17", label: "15–17", test: (a: number) => a >= 15 && a <= 17 },
  { key: "18+", label: "18+", test: (a: number) => a >= 18 },
] as const;

async function getActiveChildren(admin: AdminClient, centreId: string) {
  const { data, error } = await admin
    .from("children")
    .select("*")
    .eq("centre_id", centreId)
    .order("last_name")
    .order("first_name");
  if (error) throw new Error(`Failed to load children: ${error.message}`);
  return data ?? [];
}

// ─── Report row builders ────────────────────────────────────

export function childrenByStatusRows(children: ChildLike[]): ReportRowLike[] {
  const counts = new Map<string, number>();
  for (const c of children) counts.set(c.status, (counts.get(c.status) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}

export function childrenDetailRows(children: ChildLike[]): ReportRowLike[] {
  return children.map((c) => ({
    reference: c.reference_number,
    name: `${c.first_name} ${c.middle_name ? c.middle_name + " " : ""}${c.last_name}`,
    gender: c.gender,
    date_of_birth: ymd(c.date_of_birth),
    age: ageYears(c.date_of_birth) ?? "",
    status: c.status,
    admission_date: ymd(c.admission_date),
    nationality: c.nationality ?? "-",
  }));
}

export function childrenAgeGroupRows(children: ChildLike[]): ReportRowLike[] {
  const counts = new Map<string, number>();
  for (const c of children) {
    const age = ageYears(c.date_of_birth);
    const group = AGE_GROUPS.find((g) => age !== null && g.test(age));
    const key = group?.key ?? "Unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const labelMap = new Map<string, string>(AGE_GROUPS.map((g) => [g.key, g.label]));
  return Array.from(counts.entries())
    .map(([key, count]) => ({
      age_group: labelMap.get(key) ?? key,
      children: count,
    }))
    .sort((a, b) => (a.age_group === "Unknown" ? 1 : b.age_group === "Unknown" ? -1 : 0));
}

export async function admissionHistoryRows(
  admin: AdminClient,
  centreId: string,
): Promise<ReportRowLike[]> {
  const { data, error } = await admin
    .from("children")
    .select("reference_number, first_name, last_name, admission_date, status, created_at")
    .eq("centre_id", centreId)
    .order("admission_date", { ascending: false });
  if (error) throw new Error(`Failed to load admission history: ${error.message}`);
  const rows = data ?? [];
  return rows.map((c: { reference_number: string; first_name: string; last_name: string; admission_date?: string | null; status: string; created_at?: string | null }) => ({
    reference: c.reference_number,
    name: `${c.first_name} ${c.last_name}`,
    admission_date: ymd(c.admission_date),
    current_status: c.status,
    recorded_at: ymd(c.created_at),
  }));
}

export async function statusHistoryRows(
  admin: AdminClient,
  centreId: string,
): Promise<ReportRowLike[]> {
  const { data: history, error: hErr } = await admin
    .from("child_status_history")
    .select("child_id, changed_at, previous_status, new_status, reason")
    .eq("centre_id", centreId)
    .order("changed_at", { ascending: false })
    .limit(1000);
  if (hErr) throw new Error(`Failed to load status history: ${hErr.message}`);

  // Build a child-id -> label map scoped to this centre.
  const { data: children, error: cErr } = await admin
    .from("children")
    .select("id, reference_number, first_name, last_name")
    .eq("centre_id", centreId);
  if (cErr) throw new Error(`Failed to load children: ${cErr.message}`);
  const nameById = new Map(
    (children ?? []).map((c: { id: string; reference_number: string; first_name: string; last_name: string }) => [
      c.id,
      `${c.first_name} ${c.last_name} (${c.reference_number})`,
    ]),
  );

  return (history ?? []).map((h: { child_id: string; changed_at: string; previous_status?: string | null; new_status: string; reason?: string | null }) => ({
    date: ymd(h.changed_at),
    child: nameById.get(h.child_id) ?? "Unknown",
    from: h.previous_status ?? "-",
    to: h.new_status,
    reason: h.reason ?? "-",
  }));
}

export interface ChildLike {
  reference_number: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  gender: string;
  date_of_birth?: string | null;
  status: string;
  admission_date?: string | null;
  nationality?: string | null;
  [key: string]: unknown;
}

export interface ReportRowLike {
  [key: string]: string | number;
}

export { getActiveChildren };
