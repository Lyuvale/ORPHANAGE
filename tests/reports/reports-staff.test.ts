import { describe, it, expect } from "vitest";
import { staffSummaryRows, staffDetailRows, staffByRoleRows } from "@/lib/reports/staff";

describe("Staff report row builders", () => {
  const staff = [
    { id: "1", staff_identifier: "S1", job_title: "Care Manager", department: "Care", operational_role: "Manager", employment_status: "ACTIVE", start_date: "2024-01-01", end_date: null },
    { id: "2", staff_identifier: "S2", job_title: "Care Worker", department: "Care", operational_role: "Carer", employment_status: "ACTIVE", start_date: "2024-02-01", end_date: null },
    { id: "3", staff_identifier: "S3", job_title: "Cook", department: "Kitchen", operational_role: null, employment_status: "INACTIVE", start_date: "2024-03-01", end_date: "2025-01-01" },
  ];

  it("summarises staff across status, role and department dimensions", () => {
    const rows = staffSummaryRows(staff);
    expect(rows).toContainEqual({ dimension: "Status", value: "Active", count: 2 });
    expect(rows).toContainEqual({ dimension: "Role", value: "Unassigned", count: 1 });
    expect(rows).toContainEqual({ dimension: "Department", value: "Kitchen", count: 1 });
  });

  it("builds detail rows excluding sensitive personal/contact info", () => {
    const rows = staffDetailRows([
      {
        ...staff[0],
        email: "secret@example.com",
        phone: "0700-000-000",
        nin: "AB-12345",
        national_id: "X",
        emergency_contact_name: "Confidential",
      },
    ]);
    const keys = Object.keys(rows[0]);
    expect(rows[0].job_title).toBe("Care Manager");
    expect(rows[0].status).toBe("Active");
    for (const banned of ["email", "phone", "nin", "national_id", "emergency_contact_name"]) {
      expect(keys).not.toContain(banned);
    }
  });

  it("groups staff by role", () => {
    const rows = staffByRoleRows(staff);
    expect(rows).toEqual([
      { operational_role: "Manager", count: 1 },
      { operational_role: "Carer", count: 1 },
      { operational_role: "Unassigned", count: 1 },
    ]);
  });
});