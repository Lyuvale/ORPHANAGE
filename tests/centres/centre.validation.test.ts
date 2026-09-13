import { describe, it, expect } from "vitest";
import {
  createCentreSchema,
  updateCentreSchema,
  cleanCentreInput,
} from "@/lib/centres/centre.validation";

describe("Centre Validation", () => {
  describe("createCentreSchema", () => {
    const validCentre = {
      name: "Sunshine Children Centre",
      code: "SUN-001",
      contact_email: "info@sunshine.org",
      contact_phone: "+234-801-234-5678",
      address_line1: "123 Hope Street",
      city: "Lagos",
      state: "Lagos",
      country: "Nigeria",
    };

    it("accepts a valid centre", () => {
      const result = createCentreSchema.safeParse(validCentre);
      expect(result.success).toBe(true);
    });

    it("requires name", () => {
      const result = createCentreSchema.safeParse({
        code: "TEST-001",
      });
      expect(result.success).toBe(false);
    });

    it("requires code", () => {
      const result = createCentreSchema.safeParse({
        name: "Test Centre",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty name", () => {
      const result = createCentreSchema.safeParse({
        name: "",
        code: "TEST-001",
      });
      expect(result.success).toBe(false);
    });

    it("rejects code shorter than 2 characters", () => {
      const result = createCentreSchema.safeParse({
        name: "Test Centre",
        code: "A",
      });
      expect(result.success).toBe(false);
    });

    it("rejects code with invalid characters", () => {
      const result = createCentreSchema.safeParse({
        name: "Test Centre",
        code: "TEST CODE",
      });
      expect(result.success).toBe(false);
    });

    it("accepts code with hyphens and underscores", () => {
      const result = createCentreSchema.safeParse({
        name: "Test Centre",
        code: "TEST-CODE_01",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email format", () => {
      const result = createCentreSchema.safeParse({
        name: "Test Centre",
        code: "TEST-001",
        contact_email: "not-an-email",
      });
      expect(result.success).toBe(false);
    });

    it("accepts missing optional fields", () => {
      const result = createCentreSchema.safeParse({
        name: "Minimal Centre",
        code: "MIN-001",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.contact_email).toBeUndefined();
        expect(result.data.contact_phone).toBeUndefined();
      }
    });

    it("defaults country to Nigeria", () => {
      const result = createCentreSchema.safeParse({
        name: "Test Centre",
        code: "TEST-001",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.country).toBe("Nigeria");
      }
    });

    it("accepts valid status values", () => {
      for (const status of ["pending", "active", "suspended", "deactivated"]) {
        const result = createCentreSchema.safeParse({
          name: "Test Centre",
          code: "TEST-001",
          status,
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid status", () => {
      const result = createCentreSchema.safeParse({
        name: "Test Centre",
        code: "TEST-001",
        status: "deleted",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateCentreSchema", () => {
    it("accepts partial updates", () => {
      const result = updateCentreSchema.safeParse({ name: "Updated Name" });
      expect(result.success).toBe(true);
    });

    it("accepts empty update", () => {
      const result = updateCentreSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("rejects invalid status in update", () => {
      const result = updateCentreSchema.safeParse({ status: "invalid" });
      expect(result.success).toBe(false);
    });

    it("allows updating status", () => {
      const result = updateCentreSchema.safeParse({ status: "suspended" });
      expect(result.success).toBe(true);
    });

    it("rejects name that is too long", () => {
      const result = updateCentreSchema.safeParse({
        name: "A".repeat(201),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("cleanCentreInput", () => {
    it("converts empty strings to null", () => {
      const input = {
        name: "Test",
        code: "T-001",
        contact_email: "",
        city: "",
        contact_phone: "+123",
      };
      const cleaned = cleanCentreInput(input);
      expect(cleaned.contact_email).toBeNull();
      expect(cleaned.city).toBeNull();
      expect(cleaned.contact_phone).toBe("+123");
    });

    it("preserves non-empty values", () => {
      const input = { name: "Centre", code: "C-001" };
      const cleaned = cleanCentreInput(input);
      expect(cleaned.name).toBe("Centre");
      expect(cleaned.code).toBe("C-001");
    });
  });
});
