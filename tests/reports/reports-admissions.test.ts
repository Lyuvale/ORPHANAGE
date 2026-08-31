import { describe, it, expect } from "vitest";
import {
  admissionsDetailRows,
  admissionsByStatusRows,
  admissionsSummaryRows,
} from "@/lib/reports/admissions";

describe("Admissions report row builders", () => {
  const admissions = [
    { id: "1", referral_id: "REF-1", reference_number: "ADM-1", status: "approved", decision: "Accepted", admitted_date: "2026-01-10", created_at: "2026-01-05" },
    { id: "2", referral_id: "REF-2", reference_number: "ADM-2", status: "pending", decision: null, admitted_date: null, created_at: "2026-01-06" },
    { id: "3", referral_id: "REF-3", reference_number: "ADM-3", status: "denied", decision: "No room", admitted_date: null, created_at: "2026-01-07" },
  ];

  it("builds detail rows with display status", () => {
    const rows = admissionsDetailRows(admissions);
    expect(rows[0].reference).toBe("ADM-1");
    expect(rows[0].status).toBe("Approved");
    expect(rows[0].admitted_date).toBe("2026-01-10");
  });

  it("groups by status", () => {
    const rows = admissionsByStatusRows(admissions);
    expect(rows).toEqual([
      { status: "Approved", count: 1 },
      { status: "Pending", count: 1 },
      { status: "Denied", count: 1 },
    ]);
  });

  it("builds a summary with totals", () => {
    const rows = admissionsSummaryRows(admissions);
    expect(rows).toContainEqual({ dimension: "Total", value: "All Admissions", count: 3 });
    expect(rows).toContainEqual({ dimension: "Total", value: "Approved", count: 1 });
    expect(rows).toContainEqual({ dimension: "Total", value: "Pending", count: 1 });
    expect(rows).toContainEqual({ dimension: "Status", value: "Approved", count: 1 });
  });
});