import { describe, it, expect } from "vitest";
import {
  createReferralSchema,
  updateReferralSchema,
  updateReferralStatusSchema,
  referralSearchSchema,
  cleanReferralInput,
} from "@/lib/referrals/referral.validation";

describe("Referral Validation", () => {
  describe("createReferralSchema", () => {
    const validInput = {
      centre_id: "550e8400-e29b-41d4-a716-446655440000",
      child_first_name: "Amina",
      child_last_name: "Okafor",
      source: "police" as const,
      reason: "Child found abandoned",
    };

    it("accepts valid minimal input", () => {
      const result = createReferralSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("accepts all optional fields", () => {
      const result = createReferralSchema.safeParse({
        ...validInput,
        child_middle_name: "Grace",
        child_date_of_birth: "2015-06-15",
        child_gender: "female",
        child_nationality: "Nigerian",
        priority: "high",
        referrer_name: "Officer Smith",
        referrer_org: "Police Station",
        referrer_contact: "555-0123",
        notes: "Additional notes",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing centre_id", () => {
      const result = createReferralSchema.safeParse({
        child_first_name: "Amina",
        child_last_name: "Okafor",
        source: "police",
        reason: "reason",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid centre_id", () => {
      const result = createReferralSchema.safeParse({
        ...validInput,
        centre_id: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing child_first_name", () => {
      const result = createReferralSchema.safeParse({
        centre_id: validInput.centre_id,
        child_last_name: "Okafor",
        source: "police",
        reason: "reason",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing child_last_name", () => {
      const result = createReferralSchema.safeParse({
        centre_id: validInput.centre_id,
        child_first_name: "Amina",
        source: "police",
        reason: "reason",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing source", () => {
      const result = createReferralSchema.safeParse({
        centre_id: validInput.centre_id,
        child_first_name: "Amina",
        child_last_name: "Okafor",
        reason: "reason",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid source", () => {
      const result = createReferralSchema.safeParse({
        ...validInput,
        source: "invalid_source",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing reason", () => {
      const result = createReferralSchema.safeParse({
        centre_id: validInput.centre_id,
        child_first_name: "Amina",
        child_last_name: "Okafor",
        source: "police",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid child_date_of_birth", () => {
      const result = createReferralSchema.safeParse({
        ...validInput,
        child_date_of_birth: "not-a-date",
      });
      expect(result.success).toBe(false);
    });

    it("rejects future child_date_of_birth", () => {
      const result = createReferralSchema.safeParse({
        ...validInput,
        child_date_of_birth: "2030-01-01",
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid child_date_of_birth in the past", () => {
      const result = createReferralSchema.safeParse({
        ...validInput,
        child_date_of_birth: "2015-06-15",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateReferralSchema", () => {
    it("accepts valid partial update", () => {
      const result = updateReferralSchema.safeParse({
        child_first_name: "Fatima",
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty string fields (converted to null)", () => {
      const result = updateReferralSchema.safeParse({
        child_middle_name: "",
        notes: "",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty object", () => {
      const result = updateReferralSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("updateReferralStatusSchema", () => {
    it("accepts valid status", () => {
      const result = updateReferralStatusSchema.safeParse({
        new_status: "under_review",
      });
      expect(result.success).toBe(true);
    });

    it("accepts status with reason", () => {
      const result = updateReferralStatusSchema.safeParse({
        new_status: "admitted",
        reason: "Meets admission criteria",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", () => {
      const result = updateReferralStatusSchema.safeParse({
        new_status: "invalid_status",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("referralSearchSchema", () => {
    it("accepts empty search params", () => {
      const result = referralSearchSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("parses limit to number", () => {
      const result = referralSearchSchema.safeParse({ limit: "25" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(25);
      }
    });

    it("caps limit at 100", () => {
      const result = referralSearchSchema.safeParse({ limit: "200" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(100);
      }
    });

    it("defaults limit to 50", () => {
      const result = referralSearchSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it("parses offset to number", () => {
      const result = referralSearchSchema.safeParse({ offset: "10" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.offset).toBe(10);
      }
    });

    it("defaults offset to 0", () => {
      const result = referralSearchSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.offset).toBe(0);
      }
    });
  });

  describe("cleanReferralInput", () => {
    it("converts empty strings to null", () => {
      const input = { name: "", other: "value" };
      const cleaned = cleanReferralInput(input);
      expect(cleaned.name).toBeNull();
      expect(cleaned.other).toBe("value");
    });

    it("preserves non-empty values", () => {
      const input = { name: "test", count: 42 };
      const cleaned = cleanReferralInput(input);
      expect(cleaned.name).toBe("test");
      expect(cleaned.count).toBe(42);
    });
  });
});
