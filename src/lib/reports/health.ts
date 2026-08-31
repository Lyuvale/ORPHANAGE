/**
 * Health section reports — row builders + data queries.
 *
 * Each builder returns a flat table of rows suitable for CSV / Excel / PDF
 * export. All queries are scoped to a single centre (tenant isolation) and
 * only expose fields the `health.view` permission already allows. Sensitive
 * free-text narratives (findings, treatment, outcome detail) are omitted in
 * favour of the same short fields the normal list views show.
 */
import {
  getMedicalRecordTypeDisplay,
  getAppointmentTypeDisplay,
  getAppointmentStatusDisplay,
  getHealthFollowupTypeDisplay,
  getHealthFollowupStatusDisplay,
  getScreeningTypeDisplay,
  getImmunizationStatusDisplay,
} from "@/types/health";

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

export async function medicalRecordsRows(admin: AdminClient, centreId: string): Promise<ReportRow[]> {
  const { data, error } = await admin
    .from("health_medical_records")
    .select("child_id, record_date, record_type, provider_name, reason, followup_required, version")
    .eq("centre_id", centreId)
    .order("record_date", { ascending: false });
  if (error) throw new Error(`Failed to load medical records: ${error.message}`);
  const childMap = await getChildMap(admin, centreId);
  const rows: ReportRow[] = [];
  for (const r of data ?? []) {
    rows.push({
      child: childMap.get(r.child_id) ?? "Unknown",
      record_type: getMedicalRecordTypeDisplay(r.record_type),
      date: ymd(r.record_date),
      provider: r.provider_name ?? "-",
      reason: r.reason ?? "-",
      followup_required: r.followup_required ? "Yes" : "No",
      version: r.version,
    });
  }
  return rows;
}

export async function appointmentsRows(admin: AdminClient, centreId: string): Promise<ReportRow[]> {
  const { data, error } = await admin
    .from("health_appointments")
    .select("child_id, appointment_date, appointment_time, appointment_type, provider_name, location, status")
    .eq("centre_id", centreId)
    .order("appointment_date", { ascending: false });
  if (error) throw new Error(`Failed to load appointments: ${error.message}`);
  const childMap = await getChildMap(admin, centreId);
  const rows: ReportRow[] = [];
  for (const a of data ?? []) {
    rows.push({
      child: childMap.get(a.child_id) ?? "Unknown",
      date: ymd(a.appointment_date),
      time: a.appointment_time ?? "-",
      type: getAppointmentTypeDisplay(a.appointment_type),
      provider: a.provider_name ?? "-",
      location: a.location ?? "-",
      status: getAppointmentStatusDisplay(a.status),
    });
  }
  return rows;
}

export async function followupsRows(admin: AdminClient, centreId: string): Promise<ReportRow[]> {
  const { data, error } = await admin
    .from("health_followups")
    .select("child_id, title, followup_type, due_date, status")
    .eq("centre_id", centreId)
    .order("due_date", { ascending: true });
  if (error) throw new Error(`Failed to load health follow-ups: ${error.message}`);
  const childMap = await getChildMap(admin, centreId);
  const rows: ReportRow[] = [];
  for (const f of data ?? []) {
    rows.push({
      child: childMap.get(f.child_id) ?? "Unknown",
      title: f.title ?? "-",
      type: getHealthFollowupTypeDisplay(f.followup_type),
      due_date: ymd(f.due_date),
      status: getHealthFollowupStatusDisplay(f.status),
    });
  }
  return rows;
}

export async function screeningsRows(admin: AdminClient, centreId: string): Promise<ReportRow[]> {
  const { data, error } = await admin
    .from("health_screenings")
    .select("child_id, screening_date, screening_type, provider_name, result, outcome, followup_required")
    .eq("centre_id", centreId)
    .order("screening_date", { ascending: false });
  if (error) throw new Error(`Failed to load screenings: ${error.message}`);
  const childMap = await getChildMap(admin, centreId);
  const rows: ReportRow[] = [];
  for (const s of data ?? []) {
    rows.push({
      child: childMap.get(s.child_id) ?? "Unknown",
      date: ymd(s.screening_date),
      type: getScreeningTypeDisplay(s.screening_type),
      provider: s.provider_name ?? "-",
      result: s.result ?? "-",
      outcome: s.outcome ?? "-",
      followup_required: s.followup_required ? "Yes" : "No",
    });
  }
  return rows;
}

export async function immunizationsRows(admin: AdminClient, centreId: string): Promise<ReportRow[]> {
  const { data, error } = await admin
    .from("health_immunizations")
    .select("child_id, vaccine, dose, administered_date, next_dose_date, provider_name, status")
    .eq("centre_id", centreId)
    .order("administered_date", { ascending: false });
  if (error) throw new Error(`Failed to load immunizations: ${error.message}`);
  const childMap = await getChildMap(admin, centreId);
  const rows: ReportRow[] = [];
  for (const i of data ?? []) {
    rows.push({
      child: childMap.get(i.child_id) ?? "Unknown",
      vaccine: i.vaccine,
      dose: i.dose ?? "-",
      administered_date: ymd(i.administered_date),
      next_dose_date: ymd(i.next_dose_date),
      provider: i.provider_name ?? "-",
      status: getImmunizationStatusDisplay(i.status),
    });
  }
  return rows;
}

export async function healthSummaryRows(admin: AdminClient, centreId: string): Promise<ReportRow[]> {
  const rows: ReportRow[] = [];
  const push = (area: string, category: string, count: number) => rows.push({ area, category, count });

  const medicalRecordTypes = await countBy(admin, "health_medical_records", centreId, "record_type");
  push("Medical Records", "Total", medicalRecordTypes.reduce((a, [, c]) => a + c, 0));
  for (const [type, count] of medicalRecordTypes) push("Medical Records", getMedicalRecordTypeDisplay(type as never), count);

  const appointmentStatuses = await countBy(admin, "health_appointments", centreId, "status");
  push("Appointments", "Total", appointmentStatuses.reduce((a, [, c]) => a + c, 0));
  for (const [status, count] of appointmentStatuses) push("Appointments", getAppointmentStatusDisplay(status as never), count);

  const followupStatuses = await countBy(admin, "health_followups", centreId, "status");
  push("Follow-Ups", "Total", followupStatuses.reduce((a, [, c]) => a + c, 0));
  for (const [status, count] of followupStatuses) push("Follow-Ups", getHealthFollowupStatusDisplay(status as never), count);

  const screeningTypes = await countBy(admin, "health_screenings", centreId, "screening_type");
  push("Screenings", "Total", screeningTypes.reduce((a, [, c]) => a + c, 0));
  for (const [type, count] of screeningTypes) push("Screenings", getScreeningTypeDisplay(type as never), count);

  const immunizationStatuses = await countBy(admin, "health_immunizations", centreId, "status");
  push("Immunizations", "Total", immunizationStatuses.reduce((a, [, c]) => a + c, 0));
  for (const [status, count] of immunizationStatuses) push("Immunizations", getImmunizationStatusDisplay(status as never), count);

  return rows;
}