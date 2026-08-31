import { describe, it, expect } from "vitest";
import {
  guardiansSummaryRows,
  guardianDetailRows,
  relationshipsRows,
} from "@/lib/reports/guardians";

describe("Guardians report row builders", () => {
  it("summarises guardians by status", () => {
    const rows = guardiansSummaryRows([
      { id: "1", first_name: "A", last_name: "B", status: "active", created_at: "2026-01-01" },
      { id: "2", first_name: "C", last_name: "D", status: "active", created_at: "2026-01-02" },
      { id: "3", first_name: "E", last_name: "F", status: "inactive", created_at: "2026-01-03" },
    ]);
    expect(rows).toEqual([
      { status: "Active", count: 2 },
      { status: "Inactive", count: 1 },
    ]);
  });

  it("builds detail rows with safe contact fields the list view already shows", () => {
    const rows = guardianDetailRows(
      [
        { id: "1", first_name: "Ann", last_name: "Smith", email: "a@x.com", phone: "555", status: "active", created_at: "2026-01-01" },
      ],
      new Map([["1", "Mother"]]),
    );
    expect(rows[0].name).toBe("Ann Smith");
    expect(rows[0].relationship_types).toBe("Mother");
    expect(rows[0].email).toBe("a@x.com");
    expect(rows[0].phone).toBe("555");
    expect(rows[0].status).toBe("Active");
  });

  it("builds relationships rows with display labels", () => {
    const rows = relationshipsRows(
      [{ child_id: "c1", guardian_id: "g1", relationship_type: "mother", is_active: true, start_date: "2025-01-01" }],
      new Map([["g1", "Ann Smith"]]),
      new Map([["c1", "Jane Doe"]]),
    );
    expect(rows[0].guardian).toBe("Ann Smith");
    expect(rows[0].child).toBe("Jane Doe");
    expect(rows[0].relationship_type).toBe("Mother");
    expect(rows[0].status).toBe("Active");
  });
});