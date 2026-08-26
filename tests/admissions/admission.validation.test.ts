import { describe, it, expect } from "vitest";
import {
  createAdmissionSchema,
  updateAdmissionSchema,
  updateAdmissionStatusSchema,
  admissionSearchSchema,
  cleanAdmissionInput,
} from "@/lib/admissions/admission.validation";

describe("Admission Validation", () => {
  describe("createAdmissionSchema", () => {
    const validInput = {
      centre_id: "550e8400-e29b-41d4-a716-446655440000",
      referral_id: "550e8400-e29b-41d4-a716-446655440001",
    };

    it("accepts valid minimal input", () => {
      const result = createAdmissionSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("accepts all optional fields", () => {
      const result = createAdmissionSchema.safeParse({
        ...validInput,
        decision: "Approved",
        conditions: "Monthly review required",
        admitted_date: "2024-01-15",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing centre_id", () => {
      const result = createAdmissionSchema.safeParse({
        referral_id: validInput.referral_id,
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid centre_id", () => {
      const result = createAdmissionSchema.safeParse({
        ...validInput,
        centre_id: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing referral_id", () => {
      const result = createAdmissionSchema.safeParse({
        centre_id: validInput.centre_id,
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid referral_id", () => {
      const result = createAdmissionSchema.safeParse({
        ...validInput,
        referral_id: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects future admitted_date", () => {
      const result = createAdmissionSchema.safeParse({
        ...validInput,
        admitted_date: "2030-01-01",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateAdmissionSchema", () => {
    it("accepts valid partial update", () => {
      const result = updateAdmissionSchema.safeParse({
        decision: "Approved",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty object", () => {
      const result = updateAdmissionSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("updateAdmissionStatusSchema", () => {
    it("accepts valid status", () => {
      const result = updateAdmissionStatusSchema.safeParse({
        new_status: "approved",
      });
      expect(result.success).toBe(true);
    });

    it("accepts status with reason", () => {
      const result = updateAdmissionStatusSchema.safeParse({
        new_status: "denied",
        reason: "Does not meet criteria",
        denied_reason: "Insufficient documentation",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", () => {
      const result = updateAdmissionStatusSchema.safeParse({
        new_status: "invalid_status",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("admissionSearchSchema", () => {
    it("accepts empty search params", () => {
      const result = admissionSearchSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("defaults limit to 50", () => {
      const result = admissionSearchSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it("defaults offset to 0", () => {
      const result = admissionSearchSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.offset).toBe(0);
      }
    });
  });

  describe("cleanAdmissionInput", () => {
    it("converts empty strings to null", () => {
      const input = { name: "", other: "value" };
      const cleaned = cleanAdmissionInput(input);
      expect(cleaned.name).toBeNull();
      expect(cleaned.other).toBe("value");
    });
  });
});
