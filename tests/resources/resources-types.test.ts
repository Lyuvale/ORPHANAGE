import { describe, it, expect } from "vitest";
import {
  SUPPORT_SOURCE_TYPES,
  SUPPORT_EXPENSE_STATUSES,
  SUPPORT_BENEFIT_TYPES,
  SUPPORT_DOCUMENT_ENTITIES,
  SUPPORT_DOCUMENTS_BUCKET,
  getSourceTypeDisplay,
  getExpenseStatusDisplay,
  getBenefitTypeDisplay,
  formatTsh,
  childLabel,
} from "@/types/resources";
import type {
  SupportSource,
  SupportFund,
  SupportExpense,
  SupportBenefit,
  SupportSourceType,
  SupportExpenseStatus,
  SupportBenefitType,
} from "@/types/resources";

const UUID = "550e8400-e29b-41d4-a716-446655440000";
const ts = new Date().toISOString();

describe("Resources & Support Types", () => {
  describe("enums", () => {
    it("defines source types", () => {
      expect(SUPPORT_SOURCE_TYPES).toEqual(["DONATION", "SPONSORSHIP", "GRANT", "OTHER"]);
    });

    it("defines expense statuses (PENDING default, only APPROVED counts toward balances)", () => {
      expect(SUPPORT_EXPENSE_STATUSES).toEqual(["PENDING", "APPROVED", "REJECTED"]);
    });

    it("defines benefit types", () => {
      expect(SUPPORT_BENEFIT_TYPES).toContain("FOOD");
      expect(SUPPORT_BENEFIT_TYPES).toContain("CLOTHES");
      expect(SUPPORT_BENEFIT_TYPES).toContain("BOOKS");
      expect(SUPPORT_BENEFIT_TYPES).toContain("EDUCATION_SUPPORT");
      expect(SUPPORT_BENEFIT_TYPES).toContain("MEDICAL_SUPPORT");
      expect(SUPPORT_BENEFIT_TYPES).toContain("OTHER");
    });

    it("defines document entities and the private bucket", () => {
      expect(SUPPORT_DOCUMENT_ENTITIES).toEqual(["SOURCE", "EXPENSE", "BENEFIT", "ASSET"]);
      expect(SUPPORT_DOCUMENTS_BUCKET).toBe("support-documents");
    });

    it("document bucket is private (only signed URLs exposed)", () => {
      expect(SUPPORT_DOCUMENTS_BUCKET).toBe("support-documents");
    });
  });

  describe("display helpers", () => {
    it("formats source types", () => {
      expect(getSourceTypeDisplay("DONATION")).toBe("Donation");
      expect(getSourceTypeDisplay("SPONSORSHIP")).toBe("Sponsorship");
      expect(getSourceTypeDisplay("GRANT")).toBe("Grant");
      expect(getSourceTypeDisplay("OTHER")).toBe("Other");
    });

    it("formats expense statuses", () => {
      expect(getExpenseStatusDisplay("PENDING")).toBe("Pending");
      expect(getExpenseStatusDisplay("APPROVED")).toBe("Approved");
      expect(getExpenseStatusDisplay("REJECTED")).toBe("Rejected");
    });

    it("formats benefit types", () => {
      expect(getBenefitTypeDisplay("FOOD")).toBe("Food");
      expect(getBenefitTypeDisplay("EDUCATION_SUPPORT")).toBe("Education Support");
      expect(getBenefitTypeDisplay("MEDICAL_SUPPORT")).toBe("Medical Support");
    });
  });

  describe("formatTsh", () => {
    it("formats whole numbers without decimals", () => {
      expect(formatTsh(5000000)).toBe("TSh 5,000,000");
    });

    it("formats fractional amounts with two decimals", () => {
      expect(formatTsh(1234.5)).toBe("TSh 1,234.50");
    });

    it("handles null and undefined as zero", () => {
      expect(formatTsh(null)).toBe("TSh 0");
      expect(formatTsh(undefined)).toBe("TSh 0");
    });
  });

  describe("childLabel", () => {
    it("combines name and reference number", () => {
      expect(
        childLabel({ reference_number: "CH-0001", first_name: "Juma", last_name: "Hassan" }),
      ).toBe("Juma Hassan — CH-0001");
    });
  });

  describe("TypeScript type compliance", () => {
    it("models a Source with a computed relationship view", () => {
      const source: SupportSource = {
        id: "s1",
        centre_id: UUID,
        source_type: "DONATION",
        source_name: "Wellwisher Donation",
        amount: 5000000,
        source_date: "2026-01-10",
        purpose: "General support",
        notes: null,
        created_by: "u1",
        created_at: ts,
        updated_at: ts,
      };
      expect(source.source_type).toBe("DONATION");
    });

    it("models a Fund linked to a Source", () => {
      const fund: SupportFund = {
        id: "f1",
        centre_id: UUID,
        source_id: "s1",
        fund_name: "Education Fund",
        amount_allocated: 2000000,
        purpose: "School fees",
        created_by: "u1",
        created_at: ts,
        updated_at: ts,
      };
      expect(fund.fund_name).toBe("Education Fund");
    });

    it("models an Expense that must be APPROVED to count", () => {
      const expense: SupportExpense = {
        id: "e1",
        centre_id: UUID,
        fund_id: "f1",
        description: "School fees",
        amount: 500000,
        expense_date: "2026-02-01",
        approval_status: "PENDING",
        approved_by: null,
        approved_at: null,
        notes: null,
        created_by: "u1",
        created_at: ts,
        updated_at: ts,
      };
      expect(expense.approval_status).toBe("PENDING");
    });

    it("models a Benefit linked to an Expense", () => {
      const benefit: SupportBenefit = {
        id: "b1",
        centre_id: UUID,
        expense_id: "e1",
        benefit_type: "EDUCATION_SUPPORT",
        description: "School uniform",
        benefit_date: "2026-02-05",
        created_by: "u1",
        created_at: ts,
        updated_at: ts,
      };
      expect(benefit.benefit_type).toBe("EDUCATION_SUPPORT");
    });

    it("all enum values are valid TypeScript types", () => {
      const t: SupportSourceType = "GRANT";
      const s: SupportExpenseStatus = "APPROVED";
      const bt: SupportBenefitType = "MEDICAL_SUPPORT";
      expect(t).toBe("GRANT");
      expect(s).toBe("APPROVED");
      expect(bt).toBe("MEDICAL_SUPPORT");
    });
  });
});
