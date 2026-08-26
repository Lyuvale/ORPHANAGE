import { describe, it, expect } from "vitest";
import {
  createSafeguardingConcernSchema,
  updateSafeguardingConcernSchema,
  updateSafeguardingStatusSchema,
  createSafeguardingActionSchema,
  createEscalationSchema,
  updateEscalationStatusSchema,
  safeguardingSearchSchema,
  cleanSafeguardingInput,
} from "@/lib/safeguarding/safeguarding.validation";

describe("Safeguarding Validation Schemas", () => {
  describe("createSafeguardingConcernSchema", () => {
    it("accepts valid concern input", () => {
      const result = createSafeguardingConcernSchema.safeParse({
        centre_id: "00000000-0000-0000-0000-000000000001",
        child_id: "00000000-0000-0000-0000-000000000002",
        concern_type: "abuse",
        title: "Concern Title",
        description: "Description of concern",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.severity).toBe("medium");
        expect(result.data.external_referral).toBe(false);
      }
    });

    it("rejects missing required fields", () => {
      const result = createSafeguardingConcernSchema.safeParse({
        centre_id: "00000000-0000-0000-0000-000000000001",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid concern_type", () => {
      const result = createSafeguardingConcernSchema.safeParse({
        centre_id: "00000000-0000-0000-0000-000000000001",
        child_id: "00000000-0000-0000-0000-000000000002",
        concern_type: "invalid_type",
        title: "Title",
        description: "Description",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid severity", () => {
      const result = createSafeguardingConcernSchema.safeParse({
        centre_id: "00000000-0000-0000-0000-000000000001",
        child_id: "00000000-0000-0000-0000-000000000002",
        concern_type: "abuse",
        title: "Title",
        description: "Description",
        severity: "invalid_severity",
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid severity values", () => {
      const severities = ["low", "medium", "high", "critical"];
      for (const severity of severities) {
        const result = createSafeguardingConcernSchema.safeParse({
          centre_id: "00000000-0000-0000-0000-000000000001",
          child_id: "00000000-0000-0000-0000-000000000002",
          concern_type: "abuse",
          title: "Title",
          description: "Description",
          severity,
        });
        expect(result.success).toBe(true);
      }
    });

    it("accepts optional fields", () => {
      const result = createSafeguardingConcernSchema.safeParse({
        centre_id: "00000000-0000-0000-0000-000000000001",
        child_id: "00000000-0000-0000-0000-000000000002",
        concern_type: "abuse",
        title: "Title",
        description: "Description",
        location: "School playground",
        witnesses: "Teacher and students",
        external_referral: true,
        external_agency: "Child Protection Services",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateSafeguardingConcernSchema", () => {
    it("accepts valid update", () => {
      const result = updateSafeguardingConcernSchema.safeParse({
        severity: "high",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty update", () => {
      const result = updateSafeguardingConcernSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("accepts null values for optional fields", () => {
      const result = updateSafeguardingConcernSchema.safeParse({
        location: null,
        witnesses: null,
        assigned_to: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateSafeguardingStatusSchema", () => {
    it("accepts valid status", () => {
      const result = updateSafeguardingStatusSchema.safeParse({
        new_status: "initial_review",
      });
      expect(result.success).toBe(true);
    });

    it("accepts status with reason", () => {
      const result = updateSafeguardingStatusSchema.safeParse({
        new_status: "resolved",
        reason: "Concern resolved",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", () => {
      const result = updateSafeguardingStatusSchema.safeParse({
        new_status: "invalid_status",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createSafeguardingActionSchema", () => {
    it("accepts valid action", () => {
      const result = createSafeguardingActionSchema.safeParse({
        concern_id: "00000000-0000-0000-0000-000000000001",
        centre_id: "00000000-0000-0000-0000-000000000002",
        action_type: "investigation",
        description: "Investigate the concern thoroughly",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing required fields", () => {
      const result = createSafeguardingActionSchema.safeParse({
        concern_id: "00000000-0000-0000-0000-000000000001",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createEscalationSchema", () => {
    it("accepts valid escalation", () => {
      const result = createEscalationSchema.safeParse({
        concern_id: "00000000-0000-0000-0000-000000000001",
        centre_id: "00000000-0000-0000-0000-000000000002",
        title: "Urgent Escalation",
        description: "This requires immediate attention",
        reason: "Severity increased",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing reason", () => {
      const result = createEscalationSchema.safeParse({
        concern_id: "00000000-0000-0000-0000-000000000001",
        centre_id: "00000000-0000-0000-0000-000000000002",
        title: "Escalation",
        description: "Description",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateEscalationStatusSchema", () => {
    it("accepts valid status", () => {
      const result = updateEscalationStatusSchema.safeParse({
        new_status: "acknowledged",
      });
      expect(result.success).toBe(true);
    });

    it("accepts completed with resolution_notes", () => {
      const result = updateEscalationStatusSchema.safeParse({
        new_status: "completed",
        resolution_notes: "Issue resolved",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", () => {
      const result = updateEscalationStatusSchema.safeParse({
        new_status: "invalid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("safeguardingSearchSchema", () => {
    it("parses search params with defaults", () => {
      const result = safeguardingSearchSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
        expect(result.data.offset).toBe(0);
      }
    });

    it("parses all filter params", () => {
      const result = safeguardingSearchSchema.safeParse({
        status: "reported",
        severity: "high",
        concern_type: "abuse",
        child_id: "00000000-0000-0000-0000-000000000001",
        search: "abuse",
        limit: "25",
        offset: "5",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("reported");
        expect(result.data.severity).toBe("high");
        expect(result.data.concern_type).toBe("abuse");
        expect(result.data.limit).toBe(25);
        expect(result.data.offset).toBe(5);
      }
    });
  });

  describe("cleanSafeguardingInput", () => {
    it("converts empty strings to null", () => {
      const input = {
        title: "Test",
        location: "",
        witnesses: "",
      };
      const cleaned = cleanSafeguardingInput(input);
      expect(cleaned.title).toBe("Test");
      expect(cleaned.location).toBeNull();
      expect(cleaned.witnesses).toBeNull();
    });

    it("preserves non-empty values", () => {
      const input = {
        title: "Test",
        location: "School",
      };
      const cleaned = cleanSafeguardingInput(input);
      expect(cleaned.title).toBe("Test");
      expect(cleaned.location).toBe("School");
    });
  });
});
