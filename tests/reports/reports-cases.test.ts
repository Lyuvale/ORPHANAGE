import { describe, it, expect } from "vitest";
import {
  casesByStatusRows,
  caseSummaryRows,
  openCasesRows,
  type CaseLike,
} from "@/lib/reports/cases";

describe("Cases report row builders", () => {
  it("groups cases by status with display labels", () => {
    const rows = casesByStatusRows([
      { reference_number: "C1", child_id: "c1", case_type: "protection", status: "open", priority: "high", opened_at: "2026-01-01" },
      { reference_number: "C2", child_id: "c2", case_type: "health", status: "open", priority: "low", opened_at: "2026-01-02" },
      { reference_number: "C3", child_id: "c3", case_type: "legal", status: "closed", priority: "medium", opened_at: "2026-01-03" },
    ] as CaseLike[]);
    expect(rows).toEqual([
      { status: "Open", cases: 2 },
      { status: "Closed", cases: 1 },
    ]);
  });

  it("summary is the same as by-status grouping", () => {
    const input = [
      { reference_number: "C1", child_id: "c1", case_type: "protection", status: "resolved", priority: "high", opened_at: "2026-01-01" },
    ] as CaseLike[];
    expect(caseSummaryRows(input)).toEqual(casesByStatusRows(input));
  });

  it("builds open-case rows with safe summary fields and no narratives", () => {
    const rows = openCasesRows(
      [
        {
          reference_number: "C1",
          child_id: "c1",
          case_type: "protection",
          status: "open",
          priority: "critical",
          opened_at: "2026-01-01",
          title: "sensitive title",
          description: "sensitive body",
          resolution_notes: "very sensitive",
        },
      ] as CaseLike[],
      new Map([["c1", "Jane Doe"]]),
    );
    expect(rows[0].reference).toBe("C1");
    expect(rows[0].child).toBe("Jane Doe");
    expect(rows[0].case_type).toBe("Protection");
    expect(rows[0].status).toBe("Open");
    expect(rows[0].priority).toBe("Critical");
    // sensitive narrative must never be exported
    const keys = Object.keys(rows[0]);
    expect(keys).not.toContain("title");
    expect(keys).not.toContain("description");
    expect(keys).not.toContain("resolution_notes");
  });
});
