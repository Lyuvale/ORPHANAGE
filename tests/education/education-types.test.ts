import { describe, it, expect } from "vitest";
import {
  EDUCATION_STATUSES,
  EDUCATION_SUPPORT_TYPES,
  EDUCATION_SUPPORT_PRIORITIES,
  EDUCATION_SUPPORT_STATUSES,
  EDUCATION_GOAL_STATUSES,
  EDUCATION_PROGRESS_STATUSES,
  EDUCATION_ACHIEVEMENT_CATEGORIES,
  getEducationStatusDisplay,
  getEducationSupportTypeDisplay,
  getEducationSupportPriorityDisplay,
  getEducationSupportStatusDisplay,
  getEducationGoalStatusDisplay,
  getEducationProgressStatusDisplay,
  getEducationAchievementCategoryDisplay,
} from "@/types/education";

describe("Education & Development Types", () => {
  describe("Enum Constants", () => {
    it("defines education statuses", () => {
      expect(EDUCATION_STATUSES).toContain("ATTENDING");
      expect(EDUCATION_STATUSES).toContain("NOT_ATTENDING");
      expect(EDUCATION_STATUSES).toContain("COMPLETED");
      expect(EDUCATION_STATUSES).toContain("TEMPORARILY_NOT_ATTENDING");
    });

    it("defines education support types", () => {
      expect(EDUCATION_SUPPORT_TYPES).toContain("BOOKS");
      expect(EDUCATION_SUPPORT_TYPES).toContain("UNIFORM");
      expect(EDUCATION_SUPPORT_TYPES).toContain("STATIONERY");
      expect(EDUCATION_SUPPORT_TYPES).toContain("SCHOOL_BAG");
      expect(EDUCATION_SUPPORT_TYPES).toContain("TRANSPORT");
      expect(EDUCATION_SUPPORT_TYPES).toContain("SCHOOL_FEES");
      expect(EDUCATION_SUPPORT_TYPES).toContain("OTHER");
    });

    it("defines support priorities", () => {
      expect(EDUCATION_SUPPORT_PRIORITIES).toEqual(["HIGH", "MEDIUM", "LOW"]);
    });

    it("defines support statuses", () => {
      expect(EDUCATION_SUPPORT_STATUSES).toEqual([
        "IDENTIFIED",
        "IN_PROGRESS",
        "SUPPORTED",
        "CLOSED",
      ]);
    });

    it("defines goal and progress statuses", () => {
      expect(EDUCATION_GOAL_STATUSES).toEqual(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]);
      expect(EDUCATION_PROGRESS_STATUSES).toEqual(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]);
    });

    it("defines achievement categories", () => {
      expect(EDUCATION_ACHIEVEMENT_CATEGORIES).toContain("GOAL_COMPLETION");
      expect(EDUCATION_ACHIEVEMENT_CATEGORIES).toContain("SKILL");
      expect(EDUCATION_ACHIEVEMENT_CATEGORIES).toContain("TRAINING");
      expect(EDUCATION_ACHIEVEMENT_CATEGORIES).toContain("CERTIFICATE");
      expect(EDUCATION_ACHIEVEMENT_CATEGORIES).toContain("EDUCATIONAL");
      expect(EDUCATION_ACHIEVEMENT_CATEGORIES).toContain("PERSONAL");
      expect(EDUCATION_ACHIEVEMENT_CATEGORIES).toContain("OTHER");
    });
  });

  describe("Display Helpers", () => {
    it("formats education statuses", () => {
      expect(getEducationStatusDisplay("ATTENDING")).toBe("Attending");
      expect(getEducationStatusDisplay("NOT_ATTENDING")).toBe("Not Attending");
      expect(getEducationStatusDisplay("TEMPORARILY_NOT_ATTENDING")).toBe(
        "Temporarily Not Attending",
      );
    });

    it("formats support types", () => {
      expect(getEducationSupportTypeDisplay("BOOKS")).toBe("Books");
      expect(getEducationSupportTypeDisplay("SCHOOL_FEES")).toBe("School Fees");
      expect(getEducationSupportTypeDisplay("SCHOOL_BAG")).toBe("School Bag");
    });

    it("formats priorities", () => {
      expect(getEducationSupportPriorityDisplay("HIGH")).toBe("High");
      expect(getEducationSupportPriorityDisplay("MEDIUM")).toBe("Medium");
      expect(getEducationSupportPriorityDisplay("LOW")).toBe("Low");
    });

    it("formats support statuses", () => {
      expect(getEducationSupportStatusDisplay("IDENTIFIED")).toBe("Identified");
      expect(getEducationSupportStatusDisplay("IN_PROGRESS")).toBe("In Progress");
      expect(getEducationSupportStatusDisplay("SUPPORTED")).toBe("Supported");
      expect(getEducationSupportStatusDisplay("CLOSED")).toBe("Closed");
    });

    it("formats goal and progress statuses", () => {
      expect(getEducationGoalStatusDisplay("NOT_STARTED")).toBe("Not Started");
      expect(getEducationGoalStatusDisplay("COMPLETED")).toBe("Completed");
      expect(getEducationProgressStatusDisplay("IN_PROGRESS")).toBe("In Progress");
    });

    it("formats achievement categories", () => {
      expect(getEducationAchievementCategoryDisplay("GOAL_COMPLETION")).toBe("Goal Completion");
      expect(getEducationAchievementCategoryDisplay("CERTIFICATE")).toBe("Certificate");
      expect(getEducationAchievementCategoryDisplay("EDUCATIONAL")).toBe("Educational");
    });
  });
});
