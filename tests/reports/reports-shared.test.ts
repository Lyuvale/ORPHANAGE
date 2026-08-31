import { describe, it, expect } from "vitest";
import { buildExport, columnsFromRows, EXPORT_FORMATS } from "@/lib/reports/export";
import { ageYears, childrenByStatusRows, childrenDetailRows, childrenAgeGroupRows, admissionHistoryRows, statusHistoryRows } from "@/lib/reports/children";
import { makeAdmin, centreFilter } from "./mock-admin";

const CENTRE = "centre-1";

describe("Shared report/export helpers", () => {
  it("exposes the three supported export formats", () => {
    expect(EXPORT_FORMATS).toEqual(["csv", "excel", "pdf"]);
  });

  it("derives columns from the keys of the first row", () => {
    const cols = columnsFromRows([{ name: "A", count: 2 }]);
    expect(cols).toEqual([
      { key: "name", label: "name" },
      { key: "count", label: "count" },
    ]);
  });

  it("returns no columns for empty rows", () => {
    expect(columnsFromRows([])).toEqual([]);
  });

  it("builds a CSV export with the right content type and extension", () => {
    const out = buildExport("Title", [{ name: "A" }], "csv", "report");
    expect(out.contentType).toBe("text/csv; charset=utf-8");
    expect(out.filename).toBe("report.csv");
    expect(String(out.body)).toContain('"name"');
    expect(String(out.body)).toContain('"A"');
  });

  it("builds an Excel export as an HTML table", () => {
    const out = buildExport("Title", [{ name: "A" }], "excel", "report");
    expect(out.contentType).toBe("application/vnd.ms-excel");
    expect(out.filename).toBe("report.xls");
    expect(String(out.body)).toContain("<table>");
  });

  it("builds a PDF export with a valid PDF header", () => {
    const out = buildExport("Title", [{ name: "A" }], "pdf", "report");
    expect(out.contentType).toBe("application/pdf");
    expect(out.filename).toBe("report.pdf");
    const buf = Buffer.isBuffer(out.body) ? out.body : Buffer.from(String(out.body));
    expect(buf.subarray(0, 8).toString("latin1")).toBe("%PDF-1.4");
  });
});

describe("Children report row builders", () => {
  it("computes a person's age in years", () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 9);
    expect(ageYears(dob.toISOString())).toBe(9);
    expect(ageYears(null)).toBeNull();
  });

  it("groups children by status with display counts", () => {
    const rows = childrenByStatusRows([
      { reference_number: "1", first_name: "A", last_name: "B", gender: "female", status: "active", date_of_birth: null },
      { reference_number: "2", first_name: "C", last_name: "D", gender: "male", status: "active", date_of_birth: null },
      { reference_number: "3", first_name: "E", last_name: "F", gender: "female", status: "graduated", date_of_birth: null },
    ]);
    expect(rows).toEqual([
      { status: "active", count: 2 },
      { status: "graduated", count: 1 },
    ]);
  });

  it("builds detail rows with full names and safe fields only", () => {
    const rows = childrenDetailRows([
      {
        reference_number: "CH-1",
        first_name: "Jane",
        middle_name: "K",
        last_name: "Doe",
        gender: "female",
        date_of_birth: "2015-01-01",
        status: "active",
      },
    ]);
    expect(rows[0].reference).toBe("CH-1");
    expect(rows[0].name).toBe("Jane K Doe");
    expect(rows[0].status).toBe("active");
    // no sensitive / internal fields leak into the export
    expect(Object.keys(rows[0])).not.toContain("id");
    expect(rows.length).toBe(1);
  });

  it("buckets children into age groups", () => {
    const rows = childrenAgeGroupRows([
      { reference_number: "1", first_name: "A", last_name: "B", gender: "female", status: "active", date_of_birth: new Date(new Date().getFullYear() - 4, 0, 1).toISOString() },
      { reference_number: "2", first_name: "C", last_name: "D", gender: "male", status: "active", date_of_birth: new Date(new Date().getFullYear() - 19, 0, 1).toISOString() },
      { reference_number: "3", first_name: "E", last_name: "F", gender: "female", status: "active", date_of_birth: null },
    ]);
    const buckets = new Map(rows.map((r) => [r.age_group, r.children]));
    expect(buckets.delete("0–5")).toBe(true);
    expect(buckets.delete("18+")).toBe(true);
    expect(buckets.delete("Unknown")).toBe(true);
    expect(buckets.size).toBe(0);
  });

  it("builds admission history rows scoped to the centre", async () => {
    const { admin, calls } = makeAdmin({
      children: [
        { reference_number: "CH-1", first_name: "Jane", last_name: "Doe", admission_date: "2026-01-01", status: "active", created_at: "2025-12-01" },
      ],
    });
    const rows = await admissionHistoryRows(admin as never, CENTRE);
    expect(centreFilter(calls, "children")).toBe(CENTRE);
    expect(rows[0].reference).toBe("CH-1");
    expect(rows[0].admission_date).toBe("2026-01-01");
  });

  it("builds status history scoped to the centre and resolves child labels", async () => {
    const { admin, calls } = makeAdmin({
      child_status_history: [
        { child_id: "c1", changed_at: "2026-01-10", previous_status: "active", new_status: "graduated", reason: "Completed 18" },
      ],
      children: [{ id: "c1", reference_number: "CH-1", first_name: "Jane", last_name: "Doe" }],
    });
    const rows = await statusHistoryRows(admin as never, CENTRE);
    expect(centreFilter(calls, "child_status_history")).toBe(CENTRE);
    expect(centreFilter(calls, "children")).toBe(CENTRE);
    expect(rows[0].child).toBe("Jane Doe (CH-1)");
    expect(rows[0].from).toBe("active");
    expect(rows[0].to).toBe("graduated");
    expect(rows[0].reason).toBe("Completed 18");
  });

  it("rejects when a data query fails (surfaces the error)", async () => {
    const { admin } = makeAdmin({}, { errorTable: "children" });
    await expect(admissionHistoryRows(admin as never, CENTRE)).rejects.toThrow(/Failed to load admission history/);
  });
});
