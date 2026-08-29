import { describe, it, expect } from "vitest";
import {
  createSourceSchema,
  updateSourceSchema,
  createFundSchema,
  updateFundSchema,
  createExpenseSchema,
  updateExpenseSchema,
  expenseApprovalSchema,
  createBenefitSchema,
  updateBenefitSchema,
  benefitChildrenSchema,
  coerceCreate,
} from "@/lib/resources/resources.validation";

const CENTRE = "550e8400-e29b-41d4-a716-446655440000";
const A = "550e8400-e29b-41d4-a716-446655440001";
const B = "550e8400-e29b-41d4-a716-446655440002";
const C = "550e8400-e29b-41d4-a716-446655440003";

describe("Resources Validation", () => {
  describe("createSourceSchema", () => {
    it("accepts a valid source", () => {
      const r = createSourceSchema.safeParse({
        centre_id: CENTRE,
        source_type: "DONATION",
        source_name: "Local Charity",
        amount: 5000000,
      });
      expect(r.success).toBe(true);
    });

    it("rejects missing source_name and negative amount", () => {
      const missing = createSourceSchema.safeParse({
        centre_id: CENTRE,
        source_type: "DONATION",
        amount: 100,
      });
      expect(missing.success).toBe(false);

      const neg = createSourceSchema.safeParse({
        centre_id: CENTRE,
        source_type: "DONATION",
        source_name: "X",
        amount: -5,
      });
      expect(neg.success).toBe(false);
    });

    it("rejects invalid source_type", () => {
      const r = createSourceSchema.safeParse({
        centre_id: CENTRE,
        source_type: "CASH",
        source_name: "X",
        amount: 100,
      });
      expect(r.success).toBe(false);
    });

    it("accepts string amounts (form input)", () => {
      const r = createSourceSchema.safeParse({
        centre_id: CENTRE,
        source_type: "GRANT",
        source_name: "Foundation",
        amount: "2500000",
      });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.amount).toBe(2500000);
    });
  });

  describe("updateSourceSchema", () => {
    it("accepts a partial update", () => {
      const r = updateSourceSchema.safeParse({ source_name: "Renamed" });
      expect(r.success).toBe(true);
    });

    it("rejects an empty update", () => {
      const r = updateSourceSchema.safeParse({});
      expect(r.success).toBe(false);
    });

    it("allows clearing optional fields via null", () => {
      const r = updateSourceSchema.safeParse({ purpose: null });
      expect(r.success).toBe(true);
    });
  });

  describe("createFundSchema", () => {
    it("accepts a valid fund", () => {
      const r = createFundSchema.safeParse({
        centre_id: CENTRE,
        source_id: A,
        fund_name: "Education Fund",
        amount_allocated: 2000000,
      });
      expect(r.success).toBe(true);
    });

    it("rejects missing source_id or amount", () => {
      const noSource = createFundSchema.safeParse({
        centre_id: CENTRE,
        fund_name: "X",
        amount_allocated: 100,
      });
      expect(noSource.success).toBe(false);

      const noAmount = createFundSchema.safeParse({
        centre_id: CENTRE,
        source_id: A,
        fund_name: "X",
      });
      expect(noAmount.success).toBe(false);
    });
  });

  describe("updateFundSchema", () => {
    it("accepts a partial update", () => {
      const r = updateFundSchema.safeParse({ amount_allocated: 3000000 });
      expect(r.success).toBe(true);
    });

    it("rejects an empty update", () => {
      expect(updateFundSchema.safeParse({}).success).toBe(false);
    });
  });

  describe("createExpenseSchema", () => {
    it("accepts a valid expense, defaulting to PENDING", () => {
      const r = createExpenseSchema.safeParse({
        centre_id: CENTRE,
        fund_id: A,
        description: "School fees",
        amount: 500000,
      });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.approval_status).toBeUndefined();
    });

    it("rejects negative amount and missing fund/description", () => {
      expect(
        createExpenseSchema.safeParse({
          centre_id: CENTRE,
          fund_id: A,
          description: "X",
          amount: -1,
        }).success,
      ).toBe(false);
      expect(
        createExpenseSchema.safeParse({ centre_id: CENTRE, fund_id: A, amount: 10 }).success,
      ).toBe(false);
    });
  });

  describe("updateExpenseSchema", () => {
    it("accepts a partial update", () => {
      const r = updateExpenseSchema.safeParse({ amount: 600000 });
      expect(r.success).toBe(true);
    });

    it("rejects empty update", () => {
      expect(updateExpenseSchema.safeParse({}).success).toBe(false);
    });
  });

  describe("expenseApprovalSchema", () => {
    it("accepts APPROVED / REJECTED / PENDING only", () => {
      expect(expenseApprovalSchema.safeParse({ status: "APPROVED" }).success).toBe(true);
      expect(expenseApprovalSchema.safeParse({ status: "REJECTED" }).success).toBe(true);
      expect(expenseApprovalSchema.safeParse({ status: "PENDING" }).success).toBe(true);
      expect(expenseApprovalSchema.safeParse({ status: "CONFIRMED" }).success).toBe(false);
    });
  });

  describe("createBenefitSchema", () => {
    it("accepts a valid benefit with optional children", () => {
      const r = createBenefitSchema.safeParse({
        centre_id: CENTRE,
        expense_id: A,
        benefit_type: "FOOD",
        child_ids: [B, C],
      });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.child_ids).toEqual([B, C]);
    });

    it("defaults child_ids to empty array", () => {
      const r = createBenefitSchema.safeParse({
        centre_id: CENTRE,
        expense_id: A,
        benefit_type: "FOOD",
      });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.child_ids).toEqual([]);
    });

    it("rejects invalid benefit_type or child id", () => {
      expect(
        createBenefitSchema.safeParse({
          centre_id: CENTRE,
          expense_id: A,
          benefit_type: "TOYS",
        }).success,
      ).toBe(false);
      expect(
        createBenefitSchema.safeParse({
          centre_id: CENTRE,
          expense_id: A,
          benefit_type: "FOOD",
          child_ids: ["not-a-uuid"],
        }).success,
      ).toBe(false);
    });
  });

  describe("updateBenefitSchema", () => {
    it("accepts replacing child_ids", () => {
      const r = updateBenefitSchema.safeParse({ child_ids: [B] });
      expect(r.success).toBe(true);
    });

    it("rejects empty update", () => {
      expect(updateBenefitSchema.safeParse({}).success).toBe(false);
    });
  });

  describe("benefitChildrenSchema", () => {
    it("accepts a list of child ids", () => {
      expect(benefitChildrenSchema.safeParse({ child_ids: [B, C] }).success).toBe(true);
    });
  });

  describe("coerceCreate", () => {
    it("removes empty amount strings and turns empty strings into null", () => {
      const out = coerceCreate({
        amount: "",
        amount_allocated: "",
        source_date: "",
        purpose: "",
        source_name: "Real",
      });
      expect(out.amount).toBeUndefined();
      expect(out.amount_allocated).toBeUndefined();
      expect(out.source_date).toBeNull();
      expect(out.purpose).toBeNull();
      expect(out.source_name).toBe("Real");
    });

    it("filters falsy child ids", () => {
      const out = coerceCreate({ child_ids: [B, "", null] });
      expect(out.child_ids).toEqual([B]);
    });
  });
});
