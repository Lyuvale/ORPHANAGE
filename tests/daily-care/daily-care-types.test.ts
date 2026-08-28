import { describe, it, expect } from "vitest";
import {
  MEAL_TYPES,
  CARE_ACTIVITY_TYPES,
  DAILY_NOTE_TYPES,
  FOLLOWUP_STATUSES,
  getMealTypeDisplay,
  getCareActivityTypeDisplay,
  getDailyNoteTypeDisplay,
  getFollowupStatusDisplay,
} from "@/types/daily-care";
import type {
  DailyCareRecord,
  MealRecord,
  DailyNote,
  CareFollowup,
  MealType,
  CareActivityType,
  DailyNoteType,
  FollowupStatus,
} from "@/types/daily-care";

describe("Daily Care Types", () => {
  describe("Enum Constants", () => {
    it("defines meal types", () => {
      expect(MEAL_TYPES).toEqual(["breakfast", "lunch", "dinner", "snack"]);
    });

    it("defines care activity types", () => {
      expect(CARE_ACTIVITY_TYPES).toEqual([
        "meal", "hygiene", "clothing", "sleep", "recreation",
        "special_support", "general_wellbeing", "other",
      ]);
    });

    it("defines daily note types", () => {
      expect(DAILY_NOTE_TYPES).toEqual([
        "general", "observation", "incident", "concern", "follow_up", "other",
      ]);
    });

    it("defines follow-up statuses", () => {
      expect(FOLLOWUP_STATUSES).toEqual(["open", "in_progress", "completed", "cancelled"]);
    });
  });

  describe("Display Helpers", () => {
    it("displays meal type correctly", () => {
      expect(getMealTypeDisplay("breakfast")).toBe("Breakfast");
      expect(getMealTypeDisplay("lunch")).toBe("Lunch");
      expect(getMealTypeDisplay("dinner")).toBe("Dinner");
      expect(getMealTypeDisplay("snack")).toBe("Snack");
    });

    it("displays care activity type correctly", () => {
      expect(getCareActivityTypeDisplay("meal")).toBe("Meal");
      expect(getCareActivityTypeDisplay("hygiene")).toBe("Hygiene");
      expect(getCareActivityTypeDisplay("clothing")).toBe("Clothing");
      expect(getCareActivityTypeDisplay("sleep")).toBe("Sleep/Rest");
      expect(getCareActivityTypeDisplay("recreation")).toBe("Recreation");
      expect(getCareActivityTypeDisplay("special_support")).toBe("Special Support");
      expect(getCareActivityTypeDisplay("general_wellbeing")).toBe("General Wellbeing");
      expect(getCareActivityTypeDisplay("other")).toBe("Other");
    });

    it("displays daily note type correctly", () => {
      expect(getDailyNoteTypeDisplay("general")).toBe("General");
      expect(getDailyNoteTypeDisplay("observation")).toBe("Observation");
      expect(getDailyNoteTypeDisplay("incident")).toBe("Incident");
      expect(getDailyNoteTypeDisplay("concern")).toBe("Concern");
      expect(getDailyNoteTypeDisplay("follow_up")).toBe("Follow-Up");
      expect(getDailyNoteTypeDisplay("other")).toBe("Other");
    });

    it("displays follow-up status correctly", () => {
      expect(getFollowupStatusDisplay("open")).toBe("Open");
      expect(getFollowupStatusDisplay("in_progress")).toBe("In Progress");
      expect(getFollowupStatusDisplay("completed")).toBe("Completed");
      expect(getFollowupStatusDisplay("cancelled")).toBe("Cancelled");
    });
  });

  describe("TypeScript Type Compliance", () => {
    it("daily care record conforms to DailyCareRecord interface", () => {
      const mock: DailyCareRecord = {
        id: "test-id",
        centre_id: "centre-id",
        child_id: "child-id",
        care_date: "2026-09-01",
        activity_type: "hygiene",
        description: "Morning hygiene routine",
        time_of_day: "08:00",
        staff_member_id: "user-id",
        status: "completed",
        notes: null,
        metadata: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      expect(mock.id).toBe("test-id");
      expect(mock.activity_type).toBe("hygiene");
    });

    it("meal record conforms to MealRecord interface", () => {
      const mock: MealRecord = {
        id: "test-id",
        centre_id: "centre-id",
        child_id: "child-id",
        meal_date: "2026-09-01",
        meal_type: "lunch",
        provided: true,
        time_of_day: "12:00",
        notes: null,
        recorded_by: "user-id",
        metadata: null,
        created_at: new Date().toISOString(),
      };
      expect(mock.id).toBe("test-id");
      expect(mock.meal_type).toBe("lunch");
      expect(mock.provided).toBe(true);
    });

    it("daily note conforms to DailyNote interface", () => {
      const mock: DailyNote = {
        id: "test-id",
        centre_id: "centre-id",
        child_id: "child-id",
        note_date: "2026-09-01",
        note_type: "general",
        content: "Note content",
        author_id: "user-id",
        author_name: "Jane Smith",
        is_pinned: false,
        version: 1,
        parent_note_id: null,
        is_amended: false,
        amended_by: null,
        amended_at: null,
        amendment_reason: null,
        metadata: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      expect(mock.id).toBe("test-id");
      expect(mock.content).toBe("Note content");
      expect(mock.version).toBe(1);
    });

    it("care follow-up conforms to CareFollowup interface", () => {
      const mock: CareFollowup = {
        id: "test-id",
        centre_id: "centre-id",
        child_id: "child-id",
        source_note_id: null,
        source_care_id: null,
        title: "Follow up on behaviour",
        description: null,
        status: "open",
        responsible_user_id: null,
        due_date: null,
        resolved_at: null,
        resolution_notes: null,
        created_by: "user-id",
        metadata: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      expect(mock.id).toBe("test-id");
      expect(mock.title).toBe("Follow up on behaviour");
      expect(mock.status).toBe("open");
    });

    it("all enum values are valid TypeScript types", () => {
      const meal: MealType = "breakfast";
      const activity: CareActivityType = "hygiene";
      const note: DailyNoteType = "general";
      const status: FollowupStatus = "open";
      expect(meal).toBe("breakfast");
      expect(activity).toBe("hygiene");
      expect(note).toBe("general");
      expect(status).toBe("open");
    });
  });
});
