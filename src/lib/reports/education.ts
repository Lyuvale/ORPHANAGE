/**
 * Education & Development section reports — row builders + data queries.
 *
 * Each builder returns a flat table of rows suitable for CSV / Excel / PDF
 * export. All queries are scoped to a single centre (tenant isolation) and
 * only expose fields the `education_development.view` permission already
 * allows. This is a children's care centre — education is one part of the
 * child's care info, not a school management system.
 */
import {
  getEducationStatusDisplay,
  getEducationSupportTypeDisplay,
  getEducationSupportPriorityDisplay,
  getEducationSupportStatusDisplay,
  getEducationGoalStatusDisplay,
  getEducationProgressStatusDisplay,
  getEducationAchievementCategoryDisplay,
} from "@/types/education";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

export interface ReportRow {
  [key: string]: string | number;
}

function ymd(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/** Child id -> "First Last (REF)" label, scoped to the centre. */
async function getChildMap(admin: AdminClient, centreId: string): Promise<Map<string, string>> {
  const { data, error } = await admin
    .from("children")
    .select("id, reference_number, first_name, last_name")
    .eq("centre_id", centreId);
  if (error) throw new Error(`Failed to load children: ${error.message}`);
  const map = new Map<string, string>();
  for (const c of data ?? []) {
    map.set(c.id, `${c.first_name} ${c.last_name}${c.reference_number ? ` (${c.reference_number})` : ""}`);
  }
  return map;
}

/** Goal id -> title, scoped to the centre. */
async function getGoalTitleMap(admin: AdminClient, centreId: string): Promise<Map<string, string>> {
  const { data, error } = await admin
    .from("education_goals")
    .select("id, title")
    .eq("centre_id", centreId);
  if (error) throw new Error(`Failed to load development goals: ${error.message}`);
  const map = new Map<string, string>();
  for (const g of data ?? []) map.set(g.id, g.title);
  return map;
}

/** Count rows per value of a column, scoped to the centre, sorted by count desc. */
async function countBy(admin: AdminClient, table: string, centreId: string, column: string): Promise<[string, number][]> {
  const { data, error } = await admin
    .from(table)
    .select(column)
    .eq("centre_id", centreId);
  if (error) throw new Error(`Failed to load summary from ${table}: ${error.message}`);
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const value = row[column];
    const key = value === null || value === undefined ? "(none)" : String(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

// ─── Report row builders ────────────────────────────────────

export async function profilesRows(admin: AdminClient, centreId: string): Promise<ReportRow[]> {
  const { data, error } = await admin
    .from("education_profiles")
    .select("child_id, education_status, school_name, education_level, general_status")
    .eq("centre_id", centreId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load education profiles: ${error.message}`);
  const childMap = await getChildMap(admin, centreId);
  const rows: ReportRow[] = [];
  for (const p of data ?? []) {
    rows.push({
      child: childMap.get(p.child_id) ?? "Unknown",
      school: p.school_name ?? "-",
      level: p.education_level ?? "-",
      status: getEducationStatusDisplay(p.education_status),
      general_status: p.general_status ?? "-",
    });
  }
  return rows;
}

export async function goalsRows(admin: AdminClient, centreId: string): Promise<ReportRow[]> {
  const { data, error } = await admin
    .from("education_goals")
    .select("child_id, title, description, start_date, target_date, status")
    .eq("centre_id", centreId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load development goals: ${error.message}`);
  const childMap = await getChildMap(admin, centreId);
  const rows: ReportRow[] = [];
  for (const g of data ?? []) {
    rows.push({
      child: childMap.get(g.child_id) ?? "Unknown",
      goal: g.title,
      description: g.description ?? "-",
      start_date: ymd(g.start_date),
      target_date: ymd(g.target_date),
      status: getEducationGoalStatusDisplay(g.status),
    });
  }
  return rows;
}

export async function progressRows(admin: AdminClient, centreId: string): Promise<ReportRow[]> {
  const { data, error } = await admin
    .from("education_progress")
    .select("child_id, goal_id, progress_date, progress_status, observation")
    .eq("centre_id", centreId)
    .order("progress_date", { ascending: false });
  if (error) throw new Error(`Failed to load progress updates: ${error.message}`);
  const childMap = await getChildMap(admin, centreId);
  const goalTitleMap = await getGoalTitleMap(admin, centreId);
  const rows: ReportRow[] = [];
  for (const p of data ?? []) {
    rows.push({
      child: childMap.get(p.child_id) ?? "Unknown",
      goal: goalTitleMap.get(p.goal_id) ?? "Unknown",
      date: ymd(p.progress_date),
      status: getEducationProgressStatusDisplay(p.progress_status),
      observation: p.observation ?? "-",
    });
  }
  return rows;
}

export async function supportNeedsRows(admin: AdminClient, centreId: string): Promise<ReportRow[]> {
  const { data, error } = await admin
    .from("education_support_needs")
    .select("child_id, support_type, description, identified_date, priority, status")
    .eq("centre_id", centreId)
    .order("identified_date", { ascending: false });
  if (error) throw new Error(`Failed to load education support needs: ${error.message}`);
  const childMap = await getChildMap(admin, centreId);
  const rows: ReportRow[] = [];
  for (const n of data ?? []) {
    rows.push({
      child: childMap.get(n.child_id) ?? "Unknown",
      need_type: getEducationSupportTypeDisplay(n.support_type),
      description: n.description ?? "-",
      identified_date: ymd(n.identified_date),
      priority: getEducationSupportPriorityDisplay(n.priority),
      status: getEducationSupportStatusDisplay(n.status),
    });
  }
  return rows;
}

export async function achievementsRows(admin: AdminClient, centreId: string): Promise<ReportRow[]> {
  const { data, error } = await admin
    .from("education_achievements")
    .select("child_id, title, description, achievement_date, category")
    .eq("centre_id", centreId)
    .order("achievement_date", { ascending: false });
  if (error) throw new Error(`Failed to load achievements: ${error.message}`);
  const childMap = await getChildMap(admin, centreId);
  const rows: ReportRow[] = [];
  for (const a of data ?? []) {
    rows.push({
      child: childMap.get(a.child_id) ?? "Unknown",
      achievement: a.title,
      category: getEducationAchievementCategoryDisplay(a.category),
      date: ymd(a.achievement_date),
      description: a.description ?? "-",
    });
  }
  return rows;
}

export async function educationSummaryRows(admin: AdminClient, centreId: string): Promise<ReportRow[]> {
  const rows: ReportRow[] = [];
  const push = (area: string, category: string, count: number) => rows.push({ area, category, count });

  const profileStatuses = await countBy(admin, "education_profiles", centreId, "education_status");
  push("Education Profiles", "Total", profileStatuses.reduce((a, [, c]) => a + c, 0));
  for (const [status, count] of profileStatuses) push("Education Profiles", getEducationStatusDisplay(status as never), count);

  const goalStatuses = await countBy(admin, "education_goals", centreId, "status");
  push("Goals", "Total", goalStatuses.reduce((a, [, c]) => a + c, 0));
  for (const [status, count] of goalStatuses) push("Goals", getEducationGoalStatusDisplay(status as never), count);

  const progressCounts = await countBy(admin, "education_progress", centreId, "progress_status");
  push("Progress Updates", "Total", progressCounts.reduce((a, [, c]) => a + c, 0));
  for (const [status, count] of progressCounts) push("Progress Updates", getEducationProgressStatusDisplay(status as never), count);

  const supportStatuses = await countBy(admin, "education_support_needs", centreId, "status");
  push("Support Needs", "Total", supportStatuses.reduce((a, [, c]) => a + c, 0));
  for (const [status, count] of supportStatuses) push("Support Needs", getEducationSupportStatusDisplay(status as never), count);

  const achievementCategories = await countBy(admin, "education_achievements", centreId, "category");
  push("Achievements", "Total", achievementCategories.reduce((a, [, c]) => a + c, 0));
  for (const [category, count] of achievementCategories) push("Achievements", getEducationAchievementCategoryDisplay(category as never), count);

  return rows;
}