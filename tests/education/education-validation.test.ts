import { describe, it, expect } from "vitest";
import {
  createEducationProfileSchema,
  updateEducationProfileSchema,
  createEducationSupportNeedSchema,
  updateEducationSupportNeedSchema,
  createEducationGoalSchema,
  updateEducationGoalSchema,
  createEducationProgressSchema,
  createEducationAchievementSchema,
  cleanEducationInput,
} from "@/lib/education/education.validation";

const UUID = "550e8400-e29b-41d4-a716-446655440000";
const UUID2 = "550e8400-e29b-41d4-a716-446655440001";
const UUID3 = "550e8400-e29b-41d4-a716-446655440002";

describe("Education Validation Schemas", () => {
  describe("createEducationProfileSchema", () => {
    it("accepts a valid profile", () => {
      const result = createEducationProfileSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        education_status: "ATTENDING",
        school_name: "Maple Primary",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing child_id", () => {
      const result = createEducationProfileSchema.safeParse({ centre_id: UUID });
      expect(result.success).toBe(false);
    });

    it("rejects an invalid education status", () => {
      const result = createEducationProfileSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        education_status: "UNKNOWN",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateEducationProfileSchema", () => {
    it("requires at least one field", () => {
      const result = updateEducationProfileSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("accepts a partial update", () => {
      const result = updateEducationProfileSchema.safeParse({ school_name: "River Hill" });
      expect(result.success).toBe(true);
    });
  });

  describe("createEducationSupportNeedSchema", () => {
    it("accepts a valid support need", () => {
      const result = createEducationSupportNeedSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        support_type: "BOOKS",
        priority: "HIGH",
      });
      expect(result.success).toBe(true);
    });

    it("rejects an invalid support type", () => {
      const result = createEducationSupportNeedSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        support_type: "TUITION_PAYMENT",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateEducationSupportNeedSchema", () => {
    it("accepts a status update", () => {
      const result = updateEducationSupportNeedSchema.safeParse({ status: "SUPPORTED" });
      expect(result.success).toBe(true);
    });

    it("requires at least one field", () => {
      const result = updateEducationSupportNeedSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("createEducationGoalSchema", () => {
    it("accepts a valid goal", () => {
      const result = createEducationGoalSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        title: "Learn to tie shoelaces",
      });
      expect(result.success).toBe(true);
    });

    it("rejects a missing title", () => {
      const result = createEducationGoalSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateEducationGoalSchema", () => {
    it("accepts a status update to COMPLETED", () => {
      const result = updateEducationGoalSchema.safeParse({ status: "COMPLETED" });
      expect(result.success).toBe(true);
    });

    it("rejects an invalid goal status", () => {
      const result = updateEducationGoalSchema.safeParse({ status: "DONE" });
      expect(result.success).toBe(false);
    });
  });

  describe("createEducationProgressSchema", () => {
    it("accepts a valid progress update with a goal", () => {
      const result = createEducationProgressSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        goal_id: UUID3,
        progress_status: "IN_PROGRESS",
        observation: "Making good progress",
      });
      expect(result.success).toBe(true);
    });

    it("rejects a missing goal_id", () => {
      const result = createEducationProgressSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
      });
      expect(result.success).toBe(false);
    });

    it("rejects an invalid progress status", () => {
      const result = createEducationProgressSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        goal_id: UUID3,
        progress_status: "BAD",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createEducationAchievementSchema", () => {
    it("accepts a valid achievement", () => {
      const result = createEducationAchievementSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        title: "First swimming badge",
        category: "CERTIFICATE",
      });
      expect(result.success).toBe(true);
    });

    it("rejects a missing title", () => {
      const result = createEducationAchievementSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
      });
      expect(result.success).toBe(false);
    });

    it("rejects an invalid category", () => {
      const result = createEducationAchievementSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        title: "Award",
        category: "NOT_A_CATEGORY",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("cleanEducationInput", () => {
    it("converts empty strings to null", () => {
      const result = cleanEducationInput({ school_name: "", education_level: "Primary" });
      expect(result.school_name).toBeNull();
      expect(result.education_level).toBe("Primary");
    });

    it("leaves non-empty values unchanged", () => {
      const result = cleanEducationInput({ notes: "Something", general_status: null });
      expect(result.notes).toBe("Something");
      expect(result.general_status).toBeNull();
    });
  });
});
