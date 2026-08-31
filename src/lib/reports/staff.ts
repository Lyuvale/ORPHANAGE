/**
 * Staff section reports — row builders + data queries.
 *
 * Each builder returns a flat table of rows suitable for CSV / Excel / PDF
 * export. All queries are scoped to a single centre (tenant isolation) and
 * only expose fields the `staff.view` permission already allows. Sensitive
 * personal / contact / emergency information is intentionally excluded.
 */

import { getStaffStatusDisplay } from "@/types/staff";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

function ymd(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export async function getAllStaff(admin: AdminClient, centreId: string): Promise<StaffLike[]> {
  const { data, error } = await admin
    .from("staff_profiles")
    .select("*")
    .eq("centre_id", centreId)
    .order("job_title");
  if (error) throw new Error(`Failed to load staff: ${error.message}`);
  return (data ?? []) as StaffLike[];
}

async function getAllAssignments(
  admin: AdminClient,
  centreId: string,
): Promise<AssignmentLike[]> {
  const { data, error } = await admin
    .from("staff_assignments")
    .select("*")
    .eq("centre_id", centreId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load staff assignments: ${error.message}`);
  return (data ?? []) as AssignmentLike[];
}

// ─── Report row builders ────────────────────────────────────

export function staffSummaryRows(staff: StaffLike[]): ReportRowLike[] {
  const byStatus = new Map<string, number>();
  const byRole = new Map<string, number>();
  const byDepartment = new Map<string, number>();
  for (const s of staff) {
    byStatus.set(s.employment_status, (byStatus.get(s.employment_status) ?? 0) + 1);
    const role = s.operational_role ?? "Unassigned";
    byRole.set(role, (byRole.get(role) ?? 0) + 1);
    const dept = s.department ?? "Unassigned";
    byDepartment.set(dept, (byDepartment.get(dept) ?? 0) + 1);
  }

  const statusRows = Array.from(byStatus.entries())
    .map(([employment_status, count]) => ({
      dimension: "Status",
      value: getStaffStatusDisplay(employment_status as never),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const roleRows = Array.from(byRole.entries())
    .map(([value, count]) => ({ dimension: "Role", value, count }))
    .sort((a, b) => b.count - a.count);

  const departmentRows = Array.from(byDepartment.entries())
    .map(([value, count]) => ({ dimension: "Department", value, count }))
    .sort((a, b) => b.count - a.count);

  return [...statusRows, ...roleRows, ...departmentRows];
}

export function staffDetailRows(staff: StaffLike[]): ReportRowLike[] {
  return staff.map((s) => ({
    staff_identifier: s.staff_identifier ?? "-",
    job_title: s.job_title,
    department: s.department ?? "-",
    operational_role: s.operational_role ?? "-",
    status: getStaffStatusDisplay(s.employment_status as never),
    start_date: ymd(s.start_date),
    end_date: s.end_date ? ymd(s.end_date) : "-",
  }));
}

export function staffByRoleRows(staff: StaffLike[]): ReportRowLike[] {
  const counts = new Map<string, number>();
  for (const s of staff) {
    const role = s.operational_role ?? "Unassigned";
    counts.set(role, (counts.get(role) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([operational_role, count]) => ({ operational_role, count }))
    .sort((a, b) => b.count - a.count);
}

export async function staffAssignmentRows(
  admin: AdminClient,
  centreId: string,
): Promise<ReportRowLike[]> {
  const [assignments, staff] = await Promise.all([
    getAllAssignments(admin, centreId),
    getAllStaff(admin, centreId),
  ]);

  const staffById = new Map(staff.map((s) => [s.id, s]));

  return assignments.map((a) => {
    const profile = staffById.get(a.staff_id);
    return {
      staff: profile ? `${profile.job_title}${profile.staff_identifier ? ` (${profile.staff_identifier})` : ""}` : "Unknown",
      assignment: a.responsibility_type,
      description: a.description ?? "-",
      status: a.status === "ENDED" ? "Ended" : "Active",
      assigned_date: ymd(a.assigned_date),
    };
  });
}

// ─── Types ──────────────────────────────────────────────────

export interface StaffLike {
  id: string;
  staff_identifier: string | null;
  job_title: string;
  department: string | null;
  operational_role: string | null;
  employment_status: string;
  start_date: string | null;
  end_date: string | null;
  [key: string]: unknown;
}

export interface AssignmentLike {
  id: string;
  centre_id: string;
  staff_id: string;
  responsibility_type: string;
  description: string | null;
  assigned_date: string | null;
  status: string;
  [key: string]: unknown;
}

export interface ReportRowLike {
  [key: string]: string | number;
}
