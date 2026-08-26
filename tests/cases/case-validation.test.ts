import { describe, it, expect } from "vitest";
import {
  createCaseSchema,
  updateCaseSchema,
  updateCaseStatusSchema,
  createAssessmentSchema,
  createCasePlanSchema,
  createCasePlanItemSchema,
  createCaseNoteSchema,
  createInterventionSchema,
  caseSearchSchema,
  cleanCaseInput,
} from "@/lib/cases/case.validation";

describe("Case Validation Schemas", () => {
  describe("createCaseSchema", () => {
    it("accepts valid case input", () => {
      const result = createCaseSchema.safeParse({
        centre_id: "00000000-0000-0000-0000-000000000001",
        child_id: "00000000-0000-0000-0000-000000000002",
        title: "Protection Case",
        case_type: "protection",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe("medium");
        expect(result.data.classification).toBe("standard");
      }
    });

    it("rejects missing required fields", () => {
      const result = createCaseSchema.safeParse({
        centre_id: "00000000-0000-0000-0000-000000000001",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid case_type", () => {
      const result = createCaseSchema.safeParse({
        centre_id: "00000000-0000-0000-0000-000000000001",
        child_id: "00000000-0000-0000-0000-000000000002",
        title: "Test",
        case_type: "invalid_type",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid centre_id", () => {
      const result = createCaseSchema.safeParse({
        centre_id: "not-a-uuid",
        child_id: "00000000-0000-0000-0000-000000000002",
        title: "Test",
        case_type: "protection",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty title", () => {
      const result = createCaseSchema.safeParse({
        centre_id: "00000000-0000-0000-0000-000000000001",
        child_id: "00000000-0000-0000-0000-000000000002",
        title: "",
        case_type: "protection",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateCaseSchema", () => {
    it("accepts valid update", () => {
      const result = updateCaseSchema.safeParse({
        title: "Updated Title",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty update", () => {
      const result = updateCaseSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("accepts null values for optional fields", () => {
      const result = updateCaseSchema.safeParse({
        description: null,
        assigned_to: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateCaseStatusSchema", () => {
    it("accepts valid status", () => {
      const result = updateCaseStatusSchema.safeParse({
        new_status: "under_assessment",
      });
      expect(result.success).toBe(true);
    });

    it("accepts status with reason", () => {
      const result = updateCaseStatusSchema.safeParse({
        new_status: "resolved",
        reason: "Case resolved successfully",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", () => {
      const result = updateCaseStatusSchema.safeParse({
        new_status: "invalid_status",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createAssessmentSchema", () => {
    it("accepts valid assessment", () => {
      const result = createAssessmentSchema.safeParse({
        case_id: "00000000-0000-0000-0000-000000000001",
        centre_id: "00000000-0000-0000-0000-000000000002",
        assessment_type: "initial",
        title: "Initial Assessment",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid assessment_type", () => {
      const result = createAssessmentSchema.safeParse({
        case_id: "00000000-0000-0000-0000-000000000001",
        centre_id: "00000000-0000-0000-0000-000000000002",
        assessment_type: "invalid",
        title: "Test",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createCasePlanSchema", () => {
    it("accepts valid plan", () => {
      const result = createCasePlanSchema.safeParse({
        case_id: "00000000-0000-0000-0000-000000000001",
        centre_id: "00000000-0000-0000-0000-000000000002",
        title: "Case Plan",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("createCasePlanItemSchema", () => {
    it("accepts valid plan item", () => {
      const result = createCasePlanItemSchema.safeParse({
        case_plan_id: "00000000-0000-0000-0000-000000000001",
        centre_id: "00000000-0000-0000-0000-000000000002",
        objective: "Regular contact with family",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sort_order).toBe(0);
      }
    });
  });

  describe("createCaseNoteSchema", () => {
    it("accepts valid note", () => {
      const result = createCaseNoteSchema.safeParse({
        case_id: "00000000-0000-0000-0000-000000000001",
        centre_id: "00000000-0000-0000-0000-000000000002",
        content: "Case note content",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.note_type).toBe("general");
        expect(result.data.is_pinned).toBe(false);
      }
    });

    it("rejects empty content", () => {
      const result = createCaseNoteSchema.safeParse({
        case_id: "00000000-0000-0000-0000-000000000001",
        centre_id: "00000000-0000-0000-0000-000000000002",
        content: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createInterventionSchema", () => {
    it("accepts valid intervention", () => {
      const result = createInterventionSchema.safeParse({
        case_id: "00000000-0000-0000-0000-000000000001",
        centre_id: "00000000-0000-0000-0000-000000000002",
        title: "Counselling session",
        intervention_type: "counselling",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("caseSearchSchema", () => {
    it("parses search params with defaults", () => {
      const result = caseSearchSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
        expect(result.data.offset).toBe(0);
      }
    });

    it("parses limit and offset from strings", () => {
      const result = caseSearchSchema.safeParse({
        limit: "25",
        offset: "10",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(25);
        expect(result.data.offset).toBe(10);
      }
    });

    it("clamps limit to max 100", () => {
      const result = caseSearchSchema.safeParse({
        limit: "200",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(100);
      }
    });
  });

  describe("cleanCaseInput", () => {
    it("converts empty strings to null", () => {
      const input = {
        title: "Test",
        description: "",
        assigned_to: "",
      };
      const cleaned = cleanCaseInput(input);
      expect(cleaned.title).toBe("Test");
      expect(cleaned.description).toBeNull();
      expect(cleaned.assigned_to).toBeNull();
    });

    it("preserves non-empty values", () => {
      const input = {
        title: "Test",
        description: "A description",
      };
      const cleaned = cleanCaseInput(input);
      expect(cleaned.title).toBe("Test");
      expect(cleaned.description).toBe("A description");
    });
  });
});
