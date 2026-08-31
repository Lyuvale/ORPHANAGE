import { describe, it, expect } from "vitest";
import {
  visitsByStatusRows,
  visitHistoryRows,
  upcomingVisitsReport,
} from "@/lib/reports/visits";
import { makeAdmin, centreFilter } from "./mock-admin";

const CENTRE = "centre-1";

describe("Visits report row builders", () => {
  it("groups visits by status with display labels", () => {
    const rows = visitsByStatusRows([
      { reference_number: "V1", child_id: "c1", guardian_id: "g1", visit_type: "in_person", status: "approved", scheduled_date: "2026-01-01", purpose: "x" },
      { reference_number: "V2", child_id: "c2", guardian_id: "g2", visit_type: "phone", status: "approved", scheduled_date: "2026-01-02", purpose: "y" },
      { reference_number: "V3", child_id: "c3", guardian_id: "g3", visit_type: "video", status: "completed", scheduled_date: "2026-01-03", purpose: "z" },
    ]);
    expect(rows).toEqual([
      { status: "Approved", visits: 2 },
      { status: "Completed", visits: 1 },
    ]);
  });

  it("builds history rows resolving child and guardian names", () => {
    const rows = visitHistoryRows(
      [
        { reference_number: "V1", child_id: "c1", guardian_id: "g1", visit_type: "in_person", status: "approved", scheduled_date: "2026-01-01", purpose: "Meet" },
      ],
      new Map([["c1", "Jane Doe"]]),
      new Map([["g1", "Ann Smith"]]),
    );
    expect(rows[0].child).toBe("Jane Doe");
    expect(rows[0].visitor).toBe("Ann Smith");
    expect(rows[0].visit_type).toBe("In Person");
    expect(rows[0].status).toBe("Approved");
  });

  it("flags unknown children and guardians", () => {
    const rows = visitHistoryRows(
      [{ reference_number: "V1", child_id: "nope", guardian_id: "nope2", visit_type: "phone", status: "requested", scheduled_date: "2026-01-01", purpose: "x" }],
      new Map(),
      new Map(),
    );
    expect(rows[0].child).toBe("Unknown");
    expect(rows[0].visitor).toBe("Unknown");
  });

  it("scopes upcoming visits to the centre", async () => {
    const { admin, calls } = makeAdmin({
      visits: [
        { reference_number: "V1", child_id: "c1", guardian_id: "g1", visit_type: "in_person", status: "approved", scheduled_date: "2099-01-01", purpose: "p" },
      ],
      children: [{ id: "c1", first_name: "Jane", last_name: "Doe" }],
      guardians: [{ id: "g1", first_name: "Ann", last_name: "Smith" }],
    });
    const rows = await upcomingVisitsReport(admin as never, CENTRE);
    expect(rows).toHaveLength(1);
    expect(centreFilter(calls, "visits")).toBe(CENTRE);
  });
});
