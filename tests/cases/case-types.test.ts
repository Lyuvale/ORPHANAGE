import { describe, it, expect } from "vitest";
import {
  CASE_STATUSES,
  CASE_TYPES,
  CASE_PRIORITIES,
  CASE_CLASSIFICATIONS,
  ASSESSMENT_TYPES,
  CASE_PLAN_STATUSES,
  CASE_PLAN_ITEM_STATUSES,
  CASE_NOTE_TYPES,
  CASE_STATUS_TRANSITIONS,
  CASE_PLAN_STATUS_TRANSITIONS,
  getCaseStatusDisplay,
  getCaseTypeDisplay,
  getCasePriorityDisplay,
  getCaseClassificationDisplay,
  getAssessmentTypeDisplay,
  getCasePlanStatusDisplay,
  getCasePlanItemStatusDisplay,
  getCaseNoteTypeDisplay,
  isValidCaseStatusTransition,
  isValidCasePlanStatusTransition,
} from "@/types/case";
import type {
  Case,
  CaseStatus,
  CaseType,
  CasePriority,
  CaseClassification,
  AssessmentType,
  CasePlanStatus,
  CasePlanItemStatus,
  CaseNoteType,
} from "@/types/case";

describe("Case Types", () => {
  describe("Enum Constants", () => {
    it("defines case statuses", () => {
      expect(CASE_STATUSES).toEqual([
        "open", "under_assessment", "active_plan", "on_hold", "resolved", "closed",
      ]);
    });

    it("defines case types", () => {
      expect(CASE_TYPES).toEqual([
        "protection", "family_reunification", "behavioural", "education",
        "health", "placement", "legal", "psychosocial", "other",
      ]);
    });

    it("defines case priorities", () => {
      expect(CASE_PRIORITIES).toEqual(["low", "medium", "high", "critical"]);
    });

    it("defines case classifications", () => {
      expect(CASE_CLASSIFICATIONS).toEqual(["standard", "confidential", "highly_confidential"]);
    });

    it("defines assessment types", () => {
      expect(ASSESSMENT_TYPES).toEqual(["initial", "periodic", "specialized", "other"]);
    });

    it("defines case plan statuses", () => {
      expect(CASE_PLAN_STATUSES).toEqual(["draft", "active", "completed", "archived"]);
    });

    it("defines case plan item statuses", () => {
      expect(CASE_PLAN_ITEM_STATUSES).toEqual(["pending", "in_progress", "completed", "cancelled"]);
    });

    it("defines case note types", () => {
      expect(CASE_NOTE_TYPES).toEqual([
        "general", "assessment", "plan_review", "incident",
        "progress", "communication", "safeguarding", "other",
      ]);
    });
  });

  describe("Status Transitions", () => {
    it("defines valid case status transitions", () => {
      expect(CASE_STATUS_TRANSITIONS.open).toContain("under_assessment");
      expect(CASE_STATUS_TRANSITIONS.open).toContain("on_hold");
      expect(CASE_STATUS_TRANSITIONS.open).toContain("closed");
      expect(CASE_STATUS_TRANSITIONS.open).not.toContain("resolved");
      expect(CASE_STATUS_TRANSITIONS.open).not.toContain("active_plan");
    });

    it("defines valid case plan status transitions", () => {
      expect(CASE_PLAN_STATUS_TRANSITIONS.draft).toContain("active");
      expect(CASE_PLAN_STATUS_TRANSITIONS.draft).toContain("archived");
      expect(CASE_PLAN_STATUS_TRANSITIONS.draft).not.toContain("completed");
    });

    it("isValidCaseStatusTransition validates correctly", () => {
      expect(isValidCaseStatusTransition("open", "under_assessment")).toBe(true);
      expect(isValidCaseStatusTransition("open", "closed")).toBe(true);
      expect(isValidCaseStatusTransition("open", "active_plan")).toBe(false);
      expect(isValidCaseStatusTransition("closed", "open")).toBe(true);
      expect(isValidCaseStatusTransition("resolved", "closed")).toBe(true);
      expect(isValidCaseStatusTransition("resolved", "open")).toBe(true);
    });

    it("isValidCasePlanStatusTransition validates correctly", () => {
      expect(isValidCasePlanStatusTransition("draft", "active")).toBe(true);
      expect(isValidCasePlanStatusTransition("draft", "archived")).toBe(true);
      expect(isValidCasePlanStatusTransition("draft", "completed")).toBe(false);
      expect(isValidCasePlanStatusTransition("active", "completed")).toBe(true);
    });
  });

  describe("Display Helpers", () => {
    it("displays case status correctly", () => {
      expect(getCaseStatusDisplay("open")).toBe("Open");
      expect(getCaseStatusDisplay("under_assessment")).toBe("Under Assessment");
      expect(getCaseStatusDisplay("active_plan")).toBe("Active Plan");
      expect(getCaseStatusDisplay("on_hold")).toBe("On Hold");
      expect(getCaseStatusDisplay("resolved")).toBe("Resolved");
      expect(getCaseStatusDisplay("closed")).toBe("Closed");
    });

    it("displays case type correctly", () => {
      expect(getCaseTypeDisplay("protection")).toBe("Protection");
      expect(getCaseTypeDisplay("family_reunification")).toBe("Family Reunification");
      expect(getCaseTypeDisplay("psychosocial")).toBe("Psychosocial");
    });

    it("displays case priority correctly", () => {
      expect(getCasePriorityDisplay("low")).toBe("Low");
      expect(getCasePriorityDisplay("medium")).toBe("Medium");
      expect(getCasePriorityDisplay("high")).toBe("High");
      expect(getCasePriorityDisplay("critical")).toBe("Critical");
    });

    it("displays case classification correctly", () => {
      expect(getCaseClassificationDisplay("standard")).toBe("Standard");
      expect(getCaseClassificationDisplay("confidential")).toBe("Confidential");
      expect(getCaseClassificationDisplay("highly_confidential")).toBe("Highly Confidential");
    });

    it("displays assessment type correctly", () => {
      expect(getAssessmentTypeDisplay("initial")).toBe("Initial");
      expect(getAssessmentTypeDisplay("periodic")).toBe("Periodic");
      expect(getAssessmentTypeDisplay("specialized")).toBe("Specialized");
    });

    it("displays case plan status correctly", () => {
      expect(getCasePlanStatusDisplay("draft")).toBe("Draft");
      expect(getCasePlanStatusDisplay("active")).toBe("Active");
      expect(getCasePlanStatusDisplay("completed")).toBe("Completed");
      expect(getCasePlanStatusDisplay("archived")).toBe("Archived");
    });

    it("displays case plan item status correctly", () => {
      expect(getCasePlanItemStatusDisplay("pending")).toBe("Pending");
      expect(getCasePlanItemStatusDisplay("in_progress")).toBe("In Progress");
      expect(getCasePlanItemStatusDisplay("completed")).toBe("Completed");
      expect(getCasePlanItemStatusDisplay("cancelled")).toBe("Cancelled");
    });

    it("displays case note type correctly", () => {
      expect(getCaseNoteTypeDisplay("general")).toBe("General");
      expect(getCaseNoteTypeDisplay("assessment")).toBe("Assessment");
      expect(getCaseNoteTypeDisplay("incident")).toBe("Incident");
      expect(getCaseNoteTypeDisplay("safeguarding")).toBe("Safeguarding");
    });
  });

  describe("TypeScript Type Compliance", () => {
    it("case type conforms to Case interface", () => {
      const mockCase: Case = {
        id: "test-id",
        centre_id: "centre-id",
        reference_number: "ABC-CASE-00001",
        child_id: "child-id",
        title: "Test Case",
        description: "Test description",
        case_type: "protection",
        status: "open",
        priority: "medium",
        classification: "standard",
        assigned_to: null,
        opened_by: "user-id",
        opened_at: new Date().toISOString(),
        closed_at: null,
        resolved_at: null,
        resolution_notes: null,
        metadata: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      expect(mockCase.id).toBe("test-id");
      expect(mockCase.case_type).toBe("protection");
      expect(mockCase.status).toBe("open");
    });

    it("all enum values are valid TypeScript types", () => {
      const status: CaseStatus = "open";
      const type: CaseType = "protection";
      const priority: CasePriority = "medium";
      const classification: CaseClassification = "standard";
      const assessment: AssessmentType = "initial";
      const planStatus: CasePlanStatus = "draft";
      const itemStatus: CasePlanItemStatus = "pending";
      const noteType: CaseNoteType = "general";

      expect(status).toBe("open");
      expect(type).toBe("protection");
      expect(priority).toBe("medium");
      expect(classification).toBe("standard");
      expect(assessment).toBe("initial");
      expect(planStatus).toBe("draft");
      expect(itemStatus).toBe("pending");
      expect(noteType).toBe("general");
    });
  });
});
