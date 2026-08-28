import { describe, it, expect } from "vitest";
import {
  createVisitSchema,
  updateVisitSchema,
  updateVisitStatusSchema,
  checkInSchema,
  checkOutSchema,
  visitOutcomeSchema,
  createRestrictionSchema,
  updateRestrictionSchema,
  createContactAttemptSchema,
  visitSearchSchema,
  restrictionSearchSchema,
  contactAttemptSearchSchema,
} from "@/lib/visits/visit.validation";

describe("Visit Validation Schemas", () => {
  describe("createVisitSchema", () => {
    it("accepts valid visit request", () => {
      const result = createVisitSchema.safeParse({
        centre_id: "550e8400-e29b-41d4-a716-446655440000",
        child_id: "550e8400-e29b-41d4-a716-446655440001",
        guardian_id: "550e8400-e29b-41d4-a716-446655440002",
        scheduled_date: "2026-09-15",
        purpose: "Family visit",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing centre_id", () => {
      const result = createVisitSchema.safeParse({
        child_id: "550e8400-e29b-41d4-a716-446655440001",
        guardian_id: "550e8400-e29b-41d4-a716-446655440002",
        scheduled_date: "2026-09-15",
        purpose: "Family visit",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing purpose", () => {
      const result = createVisitSchema.safeParse({
        centre_id: "550e8400-e29b-41d4-a716-446655440000",
        child_id: "550e8400-e29b-41d4-a716-446655440001",
        guardian_id: "550e8400-e29b-41d4-a716-446655440002",
        scheduled_date: "2026-09-15",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing scheduled_date", () => {
      const result = createVisitSchema.safeParse({
        centre_id: "550e8400-e29b-41d4-a716-446655440000",
        child_id: "550e8400-e29b-41d4-a716-446655440001",
        guardian_id: "550e8400-e29b-41d4-a716-446655440002",
        purpose: "Family visit",
      });
      expect(result.success).toBe(false);
    });

    it("applies default visit_type", () => {
      const result = createVisitSchema.safeParse({
        centre_id: "550e8400-e29b-41d4-a716-446655440000",
        child_id: "550e8400-e29b-41d4-a716-446655440001",
        guardian_id: "550e8400-e29b-41d4-a716-446655440002",
        scheduled_date: "2026-09-15",
        purpose: "Family visit",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.visit_type).toBe("in_person");
      }
    });

    it("accepts optional fields", () => {
      const result = createVisitSchema.safeParse({
        centre_id: "550e8400-e29b-41d4-a716-446655440000",
        child_id: "550e8400-e29b-41d4-a716-446655440001",
        guardian_id: "550e8400-e29b-41d4-a716-446655440002",
        visit_type: "video",
        scheduled_date: "2026-09-15",
        scheduled_start_time: "10:00",
        scheduled_end_time: "11:00",
        location: "Room 5",
        purpose: "Family visit",
        notes: "Important visit",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid visit_type", () => {
      const result = createVisitSchema.safeParse({
        centre_id: "550e8400-e29b-41d4-a716-446655440000",
        child_id: "550e8400-e29b-41d4-a716-446655440001",
        guardian_id: "550e8400-e29b-41d4-a716-446655440002",
        scheduled_date: "2026-09-15",
        visit_type: "invalid_type",
        purpose: "Family visit",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateVisitSchema", () => {
    it("accepts valid partial update", () => {
      const result = updateVisitSchema.safeParse({ purpose: "Updated purpose" });
      expect(result.success).toBe(true);
    });

    it("rejects empty update", () => {
      const result = updateVisitSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("accepts multiple fields", () => {
      const result = updateVisitSchema.safeParse({
        visit_type: "phone",
        purpose: "Updated purpose",
        location: "New location",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateVisitStatusSchema", () => {
    it("accepts valid status transition", () => {
      const result = updateVisitStatusSchema.safeParse({
        new_status: "approved",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", () => {
      const result = updateVisitStatusSchema.safeParse({
        new_status: "invalid_status",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("checkInSchema", () => {
    it("accepts empty input", () => {
      const result = checkInSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts notes", () => {
      const result = checkInSchema.safeParse({ notes: "Checked in" });
      expect(result.success).toBe(true);
    });
  });

  describe("checkOutSchema", () => {
    it("accepts empty input", () => {
      const result = checkOutSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("visitOutcomeSchema", () => {
    it("accepts valid outcome", () => {
      const result = visitOutcomeSchema.safeParse({
        outcome: "positive",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid outcome", () => {
      const result = visitOutcomeSchema.safeParse({
        outcome: "invalid",
      });
      expect(result.success).toBe(false);
    });

    it("accepts full outcome with follow-up", () => {
      const result = visitOutcomeSchema.safeParse({
        outcome: "positive",
        outcome_notes: "Good visit",
        child_response: "Child was happy",
        follow_up_required: true,
        follow_up_date: "2026-10-01",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("createRestrictionSchema", () => {
    it("accepts valid restriction", () => {
      const result = createRestrictionSchema.safeParse({
        centre_id: "550e8400-e29b-41d4-a716-446655440000",
        child_id: "550e8400-e29b-41d4-a716-446655440001",
        guardian_id: "550e8400-e29b-41d4-a716-446655440002",
        restriction_type: "no_visits",
        reason: "Court order",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing reason", () => {
      const result = createRestrictionSchema.safeParse({
        centre_id: "550e8400-e29b-41d4-a716-446655440000",
        child_id: "550e8400-e29b-41d4-a716-446655440001",
        guardian_id: "550e8400-e29b-41d4-a716-446655440002",
        restriction_type: "no_visits",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateRestrictionSchema", () => {
    it("accepts valid partial update", () => {
      const result = updateRestrictionSchema.safeParse({ is_active: false });
      expect(result.success).toBe(true);
    });

    it("rejects empty update", () => {
      const result = updateRestrictionSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("createContactAttemptSchema", () => {
    it("accepts valid contact attempt", () => {
      const result = createContactAttemptSchema.safeParse({
        centre_id: "550e8400-e29b-41d4-a716-446655440000",
        child_id: "550e8400-e29b-41d4-a716-446655440001",
        guardian_id: "550e8400-e29b-41d4-a716-446655440002",
        contact_type: "phone_call",
        result: "successful",
        staff_member_id: "550e8400-e29b-41d4-a716-446655440003",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing contact_type", () => {
      const result = createContactAttemptSchema.safeParse({
        centre_id: "550e8400-e29b-41d4-a716-446655440000",
        child_id: "550e8400-e29b-41d4-a716-446655440001",
        guardian_id: "550e8400-e29b-41d4-a716-446655440002",
        result: "successful",
        staff_member_id: "550e8400-e29b-41d4-a716-446655440003",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("visitSearchSchema", () => {
    it("parses empty search params", () => {
      const result = visitSearchSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("parses upcoming as boolean", () => {
      const result = visitSearchSchema.safeParse({ upcoming: "true" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.upcoming).toBe(true);
      }
    });

    it("parses limit/offset as numbers", () => {
      const result = visitSearchSchema.safeParse({ limit: "10", offset: "20" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(10);
        expect(result.data.offset).toBe(20);
      }
    });
  });

  describe("restrictionSearchSchema", () => {
    it("parses empty search params", () => {
      const result = restrictionSearchSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("parses is_active as boolean", () => {
      const result = restrictionSearchSchema.safeParse({ is_active: "true" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_active).toBe(true);
      }
    });
  });

  describe("contactAttemptSearchSchema", () => {
    it("parses empty search params", () => {
      const result = contactAttemptSearchSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});
