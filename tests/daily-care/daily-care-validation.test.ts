import { describe, it, expect } from "vitest";
import {
  createPresenceSchema,
  updatePresenceSchema,
  presenceCheckInSchema,
  presenceCheckOutSchema,
  offSiteSchema,
  createDailyCareSchema,
  createMealSchema,
  createDailyNoteSchema,
  amendDailyNoteSchema,
  createFollowupSchema,
  updateFollowupSchema,
  presenceSearchSchema,
  dailyCareSearchSchema,
  mealSearchSchema,
  dailyNoteSearchSchema,
  followupSearchSchema,
} from "@/lib/daily-care/daily-care.validation";

const UUID = "550e8400-e29b-41d4-a716-446655440000";
const UUID2 = "550e8400-e29b-41d4-a716-446655440001";

describe("Daily Care Validation Schemas", () => {
  describe("createPresenceSchema", () => {
    it("accepts valid presence record", () => {
      const result = createPresenceSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        presence_date: "2026-09-01",
      });
      expect(result.success).toBe(true);
    });

    it("applies default status of present", () => {
      const result = createPresenceSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        presence_date: "2026-09-01",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("present");
      }
    });

    it("rejects missing centre_id", () => {
      const result = createPresenceSchema.safeParse({
        child_id: UUID2,
        presence_date: "2026-09-01",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing child_id", () => {
      const result = createPresenceSchema.safeParse({
        centre_id: UUID,
        presence_date: "2026-09-01",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing presence_date", () => {
      const result = createPresenceSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid status", () => {
      const result = createPresenceSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        presence_date: "2026-09-01",
        status: "invalid",
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid status", () => {
      const result = createPresenceSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        presence_date: "2026-09-01",
        status: "absent",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updatePresenceSchema", () => {
    it("accepts valid partial update", () => {
      const result = updatePresenceSchema.safeParse({ status: "absent" });
      expect(result.success).toBe(true);
    });

    it("rejects empty update", () => {
      const result = updatePresenceSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("accepts absence_reason", () => {
      const result = updatePresenceSchema.safeParse({ absence_reason: "illness" });
      expect(result.success).toBe(true);
    });
  });

  describe("presenceCheckInSchema", () => {
    it("accepts empty input", () => {
      const result = presenceCheckInSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts notes", () => {
      const result = presenceCheckInSchema.safeParse({ notes: "Checked in" });
      expect(result.success).toBe(true);
    });
  });

  describe("presenceCheckOutSchema", () => {
    it("accepts empty input", () => {
      const result = presenceCheckOutSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("offSiteSchema", () => {
    it("accepts valid off-site record", () => {
      const result = offSiteSchema.safeParse({
        off_site_reason: "Medical appointment",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing off_site_reason", () => {
      const result = offSiteSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("createDailyCareSchema", () => {
    it("accepts valid daily care record", () => {
      const result = createDailyCareSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        care_date: "2026-09-01",
        activity_type: "hygiene",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing activity_type", () => {
      const result = createDailyCareSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        care_date: "2026-09-01",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid activity_type", () => {
      const result = createDailyCareSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        care_date: "2026-09-01",
        activity_type: "invalid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createMealSchema", () => {
    it("accepts valid meal record", () => {
      const result = createMealSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        meal_date: "2026-09-01",
        meal_type: "lunch",
      });
      expect(result.success).toBe(true);
    });

    it("applies default provided of true", () => {
      const result = createMealSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        meal_date: "2026-09-01",
        meal_type: "lunch",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.provided).toBe(true);
      }
    });

    it("rejects invalid meal_type", () => {
      const result = createMealSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        meal_date: "2026-09-01",
        meal_type: "invalid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createDailyNoteSchema", () => {
    it("accepts valid note", () => {
      const result = createDailyNoteSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        note_date: "2026-09-01",
        content: "Note content",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing content", () => {
      const result = createDailyNoteSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        note_date: "2026-09-01",
      });
      expect(result.success).toBe(false);
    });

    it("applies default note_type of general", () => {
      const result = createDailyNoteSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        note_date: "2026-09-01",
        content: "Note content",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.note_type).toBe("general");
      }
    });
  });

  describe("amendDailyNoteSchema", () => {
    it("accepts valid amendment", () => {
      const result = amendDailyNoteSchema.safeParse({
        content: "Amended content",
        amendment_reason: "Correction needed",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing amendment_reason", () => {
      const result = amendDailyNoteSchema.safeParse({
        content: "Amended content",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createFollowupSchema", () => {
    it("accepts valid follow-up", () => {
      const result = createFollowupSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        title: "Follow up on behaviour",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing title", () => {
      const result = createFollowupSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateFollowupSchema", () => {
    it("accepts valid partial update", () => {
      const result = updateFollowupSchema.safeParse({ status: "completed" });
      expect(result.success).toBe(true);
    });

    it("rejects empty update", () => {
      const result = updateFollowupSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("accepts resolution_notes", () => {
      const result = updateFollowupSchema.safeParse({
        status: "completed",
        resolution_notes: "Resolved",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("Search Schemas", () => {
    it("presenceSearchSchema parses empty params", () => {
      const result = presenceSearchSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("dailyCareSearchSchema parses limit/offset", () => {
      const result = dailyCareSearchSchema.safeParse({ limit: "10", offset: "20" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(10);
        expect(result.data.offset).toBe(20);
      }
    });

    it("mealSearchSchema parses empty params", () => {
      const result = mealSearchSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("dailyNoteSearchSchema parses empty params", () => {
      const result = dailyNoteSearchSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("followupSearchSchema parses empty params", () => {
      const result = followupSearchSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});
