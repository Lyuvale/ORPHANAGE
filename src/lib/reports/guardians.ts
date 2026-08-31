/**
 * Guardians section reports — row builders + data queries.
 *
 * Each builder returns a flat table of rows suitable for CSV / Excel / PDF
 * export. All queries are scoped to a single centre (tenant isolation) and
 * only expose fields the `guardians.view` permission already allows (the list
 * page itself shows phone/email, so those safe contact fields are included).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

import {
  getGuardianDisplayStatus,
  getRelationshipTypeDisplay,
  type GuardianStatus,
  type RelationshipType,
} from "@/types/guardian";

function ymd(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export interface ReportRowLike {
  [key: string]: string | number;
}

export function guardiansSummaryRows(guardians: GuardianLike[]): ReportRowLike[] {
  const counts = new Map<string, number>();
  for (const g of guardians) {
    const key = getGuardianDisplayStatus(g.status as GuardianStatus);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}

export function guardianDetailRows(
  guardians: GuardianLike[],
  relationshipTypes: Map<string, string>,
): ReportRowLike[] {
  return guardians.map((g) => ({
    name: `${g.first_name} ${g.last_name}`,
    relationship_types: relationshipTypes.get(g.id) ?? "-",
    email: g.email ?? "-",
    phone: g.phone ?? "-",
    status: getGuardianDisplayStatus(g.status as GuardianStatus),
    registered_at: ymd(g.created_at),
  }));
}

export function relationshipsRows(
  relationships: RelationshipLike[],
  guardians: Map<string, string>,
  children: Map<string, string>,
): ReportRowLike[] {
  return relationships.map((r) => ({
    guardian: guardians.get(r.guardian_id) ?? "Unknown",
    child: children.get(r.child_id) ?? "Unknown",
    relationship_type: getRelationshipTypeDisplay(r.relationship_type as RelationshipType),
    status: r.is_active ? "Active" : "Ended",
    start_date: ymd(r.start_date),
  }));
}

export async function guardianRows(
  admin: AdminClient,
  centreId: string,
): Promise<GuardianLike[]> {
  const { data, error } = await admin
    .from("guardians")
    .select("id, first_name, middle_name, last_name, preferred_name, email, phone, status, created_at")
    .eq("centre_id", centreId)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });
  if (error) throw new Error(`Failed to load guardians: ${error.message}`);
  return data ?? [];
}

export async function relationshipRows(
  admin: AdminClient,
  centreId: string,
): Promise<RelationshipLike[]> {
  const { data, error } = await admin
    .from("child_guardians")
    .select("child_id, guardian_id, relationship_type, is_active, start_date")
    .eq("centre_id", centreId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load relationships: ${error.message}`);
  return data ?? [];
}

/** Build a guardian-id -> relationship-type labels map for this centre. */
export async function guardianRelationshipTypes(
  admin: AdminClient,
  centreId: string,
): Promise<Map<string, string>> {
  const { data, error } = await admin
    .from("child_guardians")
    .select("guardian_id, relationship_type")
    .eq("centre_id", centreId)
    .eq("is_active", true);
  if (error) throw new Error(`Failed to load relationships: ${error.message}`);
  const map = new Map<string, string[]>();
  for (const r of data ?? []) {
    const list = map.get(r.guardian_id) ?? [];
    list.push(getRelationshipTypeDisplay(r.relationship_type as RelationshipType));
    map.set(r.guardian_id, list);
  }
  const out = new Map<string, string>();
  for (const [id, types] of map) out.set(id, Array.from(new Set(types)).join("; "));
  return out;
}

/** Build a guardian-id -> display name map for this centre. */
export async function guardianNameMap(
  admin: AdminClient,
  centreId: string,
): Promise<Map<string, string>> {
  const { data, error } = await admin
    .from("guardians")
    .select("id, first_name, middle_name, last_name, preferred_name")
    .eq("centre_id", centreId);
  if (error) throw new Error(`Failed to load guardians: ${error.message}`);
  return new Map(
    (data ?? []).map(
      (g: { id: string; first_name: string; middle_name: string | null; last_name: string; preferred_name: string | null }) => [
        g.id,
        `${g.preferred_name || g.first_name} ${g.last_name}`,
      ],
    ),
  );
}

/** Build a child-id -> display label map for this centre. */
export async function childNameMap(
  admin: AdminClient,
  centreId: string,
): Promise<Map<string, string>> {
  const { data, error } = await admin
    .from("children")
    .select("id, reference_number, first_name, last_name")
    .eq("centre_id", centreId);
  if (error) throw new Error(`Failed to load children: ${error.message}`);
  return new Map(
    (data ?? []).map(
      (c: { id: string; reference_number: string; first_name: string; last_name: string }) => [
        c.id,
        `${c.first_name} ${c.last_name} (${c.reference_number})`,
      ],
    ),
  );
}

export interface GuardianLike {
  id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  preferred_name?: string | null;
  email?: string | null;
  phone?: string | null;
  status: string;
  created_at: string;
  [key: string]: unknown;
}

export interface RelationshipLike {
  child_id: string;
  guardian_id: string;
  relationship_type: string;
  is_active: boolean;
  start_date: string;
  [key: string]: unknown;
}
