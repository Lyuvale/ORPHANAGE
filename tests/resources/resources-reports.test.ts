import { describe, it, expect } from "vitest";
import {
  toCsv,
  toExcelHtml,
  toMinimalPdf,
  sourceReportRows,
  fundReportRows,
  expenseReportRows,
  benefitReportRows,
  childReportRows,
  type ReportColumn,
  type ReportRows,
} from "@/lib/resources/reports";

const UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("Resources Reports", () => {
  describe("toCsv", () => {
    it("emits a header and quoted body rows", () => {
      const columns: ReportColumn[] = [
        { key: "name", label: "Name" },
        { key: "value", label: "Value" },
      ];
      const csv = toCsv(columns, [{ name: "A", value: 10 }]);
      expect(csv).toContain('"Name","Value"');
      expect(csv).toContain('"A","10"');
    });

    it("double-quotes embedded quotes in values", () => {
      const columns: ReportColumn[] = [{ key: "v", label: "V" }];
      const csv = toCsv(columns, [{ v: 'say "hi"' }]);
      expect(csv).toContain('"say ""hi"""');
    });
  });

  describe("toExcelHtml", () => {
    it("wraps rows in an HTML table", () => {
      const columns: ReportColumn[] = [{ key: "name", label: "Name" }];
      const html = toExcelHtml("Report", columns, [{ name: "<A>" }]);
      expect(html).toContain("<table>");
      expect(html).toContain("<th>Name</th>");
      expect(html).toContain("<td>&lt;A&gt;</td>");
    });
  });

  describe("toMinimalPdf", () => {
    it("returns a valid PDF buffer", () => {
      const columns: ReportColumn[] = [{ key: "name", label: "Name" }];
      const pdf = toMinimalPdf("Report", columns, [{ name: "X" }]);
      const head = pdf.subarray(0, 8).toString("latin1");
      expect(head).toBe("%PDF-1.4");
      expect(pdf.toString("latin1")).toContain("%%EOF");
    });
  });

  describe("row builders", () => {
    it("builds source rows with computed allocation", () => {
      const rows = sourceReportRows([
        {
          source_name: "Donation",
          source_type: "DONATION",
          amount: 5000000,
          funds: [{ fund_name: "F1", amount_allocated: 2000000 }],
        },
      ]);
      expect(rows[0].source_name).toBe("Donation");
      expect(rows[0].source_type).toBe("Donation");
      expect(rows[0].received).toBe("TSh 5,000,000");
      expect(rows[0].allocated).toBe("TSh 2,000,000");
    });

    it("builds fund rows with source and balance", () => {
      const rows = fundReportRows([
        {
          fund_name: "F1",
          amount_allocated: 1000000,
          used: 400000,
          source: { source_name: "Grant" },
        },
      ]);
      expect(rows[0].source).toBe("Grant");
      expect(rows[0].balance).toBe("TSh 600,000");
    });

    it("builds expense rows with status display", () => {
      const rows = expenseReportRows([
        {
          description: "Food",
          amount: 100000,
          approval_status: "APPROVED",
          fund: { fund_name: "F1" },
          benefits: [{ benefit_type: "FOOD" }],
        },
      ]);
      expect(rows[0].status).toBe("Approved");
      expect(rows[0].fund).toBe("F1");
      expect(rows[0].benefits).toContain("Food");
    });

    it("builds benefit rows linking through expense and children", () => {
      const rows = benefitReportRows([
        {
          benefit_type: "FOOD",
          description: "Rice",
          expense: { description: "Food run", fund: { fund_name: "F1" }, amount: 200000 },
          children: [{ reference_number: "CH-1", first_name: "A", last_name: "B" }],
        },
      ]);
      expect(rows[0].benefit).toBe("Food");
      expect(rows[0].fund).toBe("F1");
      expect(rows[0].children).toContain("A B (CH-1)");
    });

    it("builds child rows aggregating benefit sources through the full chain", () => {
      const rows = childReportRows([
        {
          reference_number: "CH-1",
          first_name: "A",
          last_name: "B",
          benefits: [
            {
              benefit_type: "FOOD",
              expense: { fund: { fund_name: "F1", source: { source_name: "Grant" } } },
            },
            {
              benefit_type: "CLOTHES",
              expense: { fund: { fund_name: "F2", source: { source_name: "Grant" } } },
            },
          ],
        },
      ]);
      expect(rows[0].child).toBe("A B (CH-1)");
      expect(rows[0].sources).toBe("Grant");
      const types = rows[0].benefits;
      expect(types).toContain("Food");
      expect(types).toContain("Clothes");
    });
  });
});
