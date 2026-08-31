import { describe, it, expect } from "vitest";
import { placementsDetailRows, placementsByStatusRows } from "@/lib/reports/placements";
import { makeAdmin, centreFilter } from "./mock-admin";

const CENTRE = "centre-1";

describe("Placements report row builders", () => {
  const placements = [
    { id: "1", child_id: "c1", reference_number: "PL-1", status: "active", placement_type: "residential", bed_reference: "B3", room_number: "Room 2", start_date: "2026-01-01", end_date: null },
    { id: "2", child_id: "c2", reference_number: "PL-2", status: "completed", placement_type: "foster", bed_reference: null, room_number: null, start_date: "2025-01-01", end_date: "2025-12-01" },
  ];

  it("scopes detail rows to the caller's centre and resolves child labels", async () => {
    const { admin, calls } = makeAdmin({
      placements,
      children: [
        { id: "c1", first_name: "Jane", last_name: "Doe", reference_number: "CH-1" },
        { id: "c2", first_name: "Ann", last_name: "Lee", reference_number: "CH-2" },
      ],
    });
    const rows = await placementsDetailRows(admin as never, CENTRE);
    expect(centreFilter(calls, "placements")).toBe(CENTRE);
    expect(centreFilter(calls, "children")).toBe(CENTRE);
    expect(rows[0].child).toBe("Jane Doe (CH-1)");
    expect(rows[0].placement_type).toBe("Residential");
    expect(rows[0].location).toBe("B3 / Room 2");
    expect(rows[0].status).toBe("Active");
  });

  it("groups placements by status scoped to the centre", async () => {
    const { admin, calls } = makeAdmin({ placements });
    const rows = await placementsByStatusRows(admin as never, CENTRE);
    expect(rows).toEqual([
      { status: "Active", count: 1 },
      { status: "Completed", count: 1 },
    ]);
    expect(centreFilter(calls, "placements")).toBe(CENTRE);
  });
});