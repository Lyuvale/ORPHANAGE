/**
 * Placements section reports — row builders + data queries.
 *
 * Each builder returns a flat table of rows suitable for CSV / Excel / PDF
 * export. All queries are scoped to a single centre (tenant isolation) and
 * only expose fields the `placements.view` permission already allows.
 */
import {
  getPlacementDisplayStatus,
  getPlacementDisplayType,
} from "@/types/placement";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

function ymd(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export async function getAllPlacements(
  admin: AdminClient,
  centreId: string,
): Promise<PlacementLike[]> {
  const { data, error } = await admin
    .from("placements")
    .select("*")
    .eq("centre_id", centreId)
    .order("start_date", { ascending: false });
  if (error) throw new Error(`Failed to load placements: ${error.message}`);
  return (data ?? []) as PlacementLike[];
}

async function getChildLabels(
  admin: AdminClient,
  centreId: string,
): Promise<Map<string, string>> {
  const { data, error } = await admin
    .from("children")
    .select("id, first_name, last_name, reference_number")
    .eq("centre_id", centreId);
  if (error) throw new Error(`Failed to load children: ${error.message}`);
  return new Map(
    (data ?? []).map((c: { id: string; first_name: string; last_name: string; reference_number: string | null }) => [
      c.id,
      `${c.first_name} ${c.last_name}${c.reference_number ? ` (${c.reference_number})` : ""}`,
    ]),
  );
}

// ─── Report row builders ────────────────────────────────────

export async function placementsDetailRows(
  admin: AdminClient,
  centreId: string,
): Promise<ReportRowLike[]> {
  const [placements, childLabels] = await Promise.all([
    getAllPlacements(admin, centreId),
    getChildLabels(admin, centreId),
  ]);

  return placements.map((p) => ({
    reference: p.reference_number,
    child: childLabels.get(p.child_id) ?? p.child_id,
    placement_type: getPlacementDisplayType(p.placement_type as never),
    location: [p.bed_reference, p.room_number].filter(Boolean).join(" / ") || "-",
    start_date: ymd(p.start_date),
    end_date: p.end_date ? ymd(p.end_date) : "-",
    status: getPlacementDisplayStatus(p.status as never),
  }));
}

export async function placementsByStatusRows(
  admin: AdminClient,
  centreId: string,
): Promise<ReportRowLike[]> {
  const placements = await getAllPlacements(admin, centreId);
  const counts = new Map<string, number>();
  for (const p of placements) {
    const status = getPlacementDisplayStatus(p.status as never);
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}

// ─── Types ──────────────────────────────────────────────────

export interface PlacementLike {
  id: string;
  child_id: string;
  reference_number: string;
  status: string;
  placement_type: string;
  bed_reference: string | null;
  room_number: string | null;
  start_date: string;
  end_date: string | null;
  [key: string]: unknown;
}

export interface ReportRowLike {
  [key: string]: string | number;
}
