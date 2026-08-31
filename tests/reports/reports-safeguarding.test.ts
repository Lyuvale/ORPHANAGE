import { describe, it, expect } from "vitest";
import {
  concernsSummaryRows,
  concernsBySeverityRows,
  concernsSafeRows,
  actionsRows,
} from "@/lib/reports/safeguarding";

describe("Safeguarding report row builders", () => {
  it("summarises concerns by status", () => {
    const rows = concernsSummaryRows([
      { id: "1", child_id: "c1", concern_type: "abuse", severity: "high", status: "reported", reported_at: "2026-01-01" },
      { id: "2", child_id: "c2", concern_type: "neglect", severity: "low", status: "reported", reported_at: "2026-01-02" },
      { id: "3", child_id: "c3", concern_type: "abuse", severity: "critical", status: "closed", reported_at: "2026-01-03" },
    ]);
    expect(rows).toEqual([
      { status: "Reported", count: 2 },
      { status: "Closed", count: 1 },
    ]);
  });

  it("summarises concerns by severity", () => {
    const rows = concernsBySeverityRows([
      { id: "1", child_id: "c1", concern_type: "abuse", severity: "critical", status: "reported", reported_at: "2026-01-01" },
      { id: "2", child_id: "c2", concern_type: "neglect", severity: "low", status: "reported", reported_at: "2026-01-02" },
    ]);
    expect(rows).toEqual([
      { severity: "Critical", count: 1 },
      { severity: "Low", count: 1 },
    ]);
  });

  it("exports only safe summary fields, never raw narrative", () => {
    const rows = concernsSafeRows(
      [
        {
          id: "1",
          child_id: "c1",
          concern_type: "abuse",
          severity: "high",
          status: "under_investigation",
          reported_at: "2026-01-01",
          description: "deeply sensitive narrative",
          action_plan: "also sensitive",
        },
      ],
      new Map([["c1", "Jane Doe"]]),
    );
    expect(rows[0].child).toBe("Jane Doe");
    expect(rows[0].concern_type).toBe("Abuse");
    expect(rows[0].severity).toBe("High");
    expect(rows[0].status).toBe("Under Investigation");
    const keys = Object.keys(rows[0]);
    expect(keys).not.toContain("description");
    expect(keys).not.toContain("action_plan");
  });

  it("builds action rows without sensitive action narrative", () => {
    const rows = actionsRows(
      [
        { concern_id: "c1", action_type: "Review", status: "done", due_date: "2026-02-01", created_at: "2026-01-15" },
      ],
      new Map([["c1", "Jane Doe"]]),
    );
    expect(rows[0].concern).toBe("Jane Doe");
    expect(rows[0].action_type).toBe("Review");
    expect(rows[0].status).toBe("done");
  });
});
