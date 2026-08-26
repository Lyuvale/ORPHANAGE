import { describe, it, expect } from "vitest";
import {
  createPlacementSchema,
  updatePlacementSchema,
  updatePlacementStatusSchema,
  placementSearchSchema,
  cleanPlacementInput,
} from "@/lib/placements/placement.validation";

describe("Placement Validation", () => {
  describe("createPlacementSchema", () => {
    const validInput = {
      centre_id: "550e8400-e29b-41d4-a716-446655440000",
      child_id: "550e8400-e29b-41d4-a716-446655440001",
      start_date: "2024-01-15",
    };

    it("accepts valid minimal input", () => {
      const result = createPlacementSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("accepts all optional fields", () => {
      const result = createPlacementSchema.safeParse({
        ...validInput,
        admission_id: "550e8400-e29b-41d4-a716-446655440002",
        bed_reference: "B12",
        room_number: "R101",
        placement_type: "foster",
        notes: "Special notes",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing centre_id", () => {
      const result = createPlacementSchema.safeParse({
        child_id: validInput.child_id,
        start_date: validInput.start_date,
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid centre_id", () => {
      const result = createPlacementSchema.safeParse({
        ...validInput,
        centre_id: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing child_id", () => {
      const result = createPlacementSchema.safeParse({
        centre_id: validInput.centre_id,
        start_date: validInput.start_date,
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid child_id", () => {
      const result = createPlacementSchema.safeParse({
        ...validInput,
        child_id: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing start_date", () => {
      const result = createPlacementSchema.safeParse({
        centre_id: validInput.centre_id,
        child_id: validInput.child_id,
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid start_date", () => {
      const result = createPlacementSchema.safeParse({
        ...validInput,
        start_date: "not-a-date",
      });
      expect(result.success).toBe(false);
    });

    it("rejects future start_date", () => {
      const result = createPlacementSchema.safeParse({
        ...validInput,
        start_date: "2030-01-01",
      });
      expect(result.success).toBe(false);
    });

    it("accepts today's start_date", () => {
      const today = new Date().toISOString().split("T")[0];
      const result = createPlacementSchema.safeParse({
        ...validInput,
        start_date: today,
      });
      expect(result.success).toBe(true);
    });

    it("accepts past start_date", () => {
      const result = createPlacementSchema.safeParse({
        ...validInput,
        start_date: "2024-01-01",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid placement_type", () => {
      const result = createPlacementSchema.safeParse({
        ...validInput,
        placement_type: "invalid_type",
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid placement_type", () => {
      const result = createPlacementSchema.safeParse({
        ...validInput,
        placement_type: "foster",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updatePlacementSchema", () => {
    it("accepts valid partial update", () => {
      const result = updatePlacementSchema.safeParse({
        bed_reference: "B15",
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty string fields (converted to null)", () => {
      const result = updatePlacementSchema.safeParse({
        bed_reference: "",
        room_number: "",
        notes: "",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty object", () => {
      const result = updatePlacementSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("updatePlacementStatusSchema", () => {
    it("accepts valid status", () => {
      const result = updatePlacementStatusSchema.safeParse({
        new_status: "completed",
      });
      expect(result.success).toBe(true);
    });

    it("accepts status with reason and end_date", () => {
      const result = updatePlacementStatusSchema.safeParse({
        new_status: "discharged",
        reason: "Program completed",
        end_date: "2026-08-29",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", () => {
      const result = updatePlacementStatusSchema.safeParse({
        new_status: "invalid_status",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("placementSearchSchema", () => {
    it("accepts empty search params", () => {
      const result = placementSearchSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("defaults limit to 50", () => {
      const result = placementSearchSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it("defaults offset to 0", () => {
      const result = placementSearchSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.offset).toBe(0);
      }
    });
  });

  describe("cleanPlacementInput", () => {
    it("converts empty strings to null", () => {
      const input = { name: "", other: "value" };
      const cleaned = cleanPlacementInput(input);
      expect(cleaned.name).toBeNull();
      expect(cleaned.other).toBe("value");
    });
  });
});
