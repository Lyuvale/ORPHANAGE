import { describe, it, expect } from "vitest";
import {
  SAFEGUARDING_STATUSES,
  SAFEGUARDING_SEVERITIES,
  SAFEGUARDING_CONCERN_TYPES,
  ESCALATION_STATUSES,
  SAFEGUARDING_STATUS_TRANSITIONS,
  ESCALATION_STATUS_TRANSITIONS,
  getSafeguardingStatusDisplay,
  getSafeguardingSeverityDisplay,
  getSafeguardingConcernTypeDisplay,
  getEscalationStatusDisplay,
  isValidSafeguardingStatusTransition,
  isValidEscalationStatusTransition,
} from "@/types/safeguarding";
import type {
  SafeguardingConcern,
  SafeguardingStatus,
  SafeguardingSeverity,
  SafeguardingConcernType,
  SafeguardingAction,
  SafeguardingEscalation,
  EscalationStatus,
} from "@/types/safeguarding";

describe("Safeguarding Types", () => {
  describe("Enum Constants", () => {
    it("defines safeguarding statuses", () => {
      expect(SAFEGUARDING_STATUSES).toEqual([
        "reported", "initial_review", "action_required",
        "under_investigation", "resolved", "closed",
      ]);
    });

    it("defines safeguarding severities", () => {
      expect(SAFEGUARDING_SEVERITIES).toEqual(["low", "medium", "high", "critical"]);
    });

    it("defines concern types", () => {
      expect(SAFEGUARDING_CONCERN_TYPES).toEqual([
        "abuse", "neglect", "exploitation", "violence",
        "missing_child", "self_harm", "unsafe_environment",
        "trafficking", "other",
      ]);
    });

    it("defines escalation statuses", () => {
      expect(ESCALATION_STATUSES).toEqual(["pending", "acknowledged", "in_progress", "completed"]);
    });
  });

  describe("Status Transitions", () => {
    it("defines valid safeguarding status transitions", () => {
      expect(SAFEGUARDING_STATUS_TRANSITIONS.reported).toContain("initial_review");
      expect(SAFEGUARDING_STATUS_TRANSITIONS.reported).toContain("closed");
      expect(SAFEGUARDING_STATUS_TRANSITIONS.reported).not.toContain("resolved");
    });

    it("defines valid escalation status transitions", () => {
      expect(ESCALATION_STATUS_TRANSITIONS.pending).toContain("acknowledged");
      expect(ESCALATION_STATUS_TRANSITIONS.pending).toContain("completed");
      expect(ESCALATION_STATUS_TRANSITIONS.pending).not.toContain("in_progress");
      expect(ESCALATION_STATUS_TRANSITIONS.completed).toHaveLength(0);
    });

    it("isValidSafeguardingStatusTransition validates correctly", () => {
      expect(isValidSafeguardingStatusTransition("reported", "initial_review")).toBe(true);
      expect(isValidSafeguardingStatusTransition("initial_review", "resolved")).toBe(true);
      expect(isValidSafeguardingStatusTransition("reported", "resolved")).toBe(false);
      expect(isValidSafeguardingStatusTransition("closed", "resolved")).toBe(false);
    });

    it("isValidEscalationStatusTransition validates correctly", () => {
      expect(isValidEscalationStatusTransition("pending", "acknowledged")).toBe(true);
      expect(isValidEscalationStatusTransition("acknowledged", "in_progress")).toBe(true);
      expect(isValidEscalationStatusTransition("in_progress", "completed")).toBe(true);
      expect(isValidEscalationStatusTransition("completed", "pending")).toBe(false);
      expect(isValidEscalationStatusTransition("pending", "in_progress")).toBe(false);
    });
  });

  describe("Display Helpers", () => {
    it("displays safeguarding status correctly", () => {
      expect(getSafeguardingStatusDisplay("reported")).toBe("Reported");
      expect(getSafeguardingStatusDisplay("initial_review")).toBe("Initial Review");
      expect(getSafeguardingStatusDisplay("action_required")).toBe("Action Required");
      expect(getSafeguardingStatusDisplay("under_investigation")).toBe("Under Investigation");
      expect(getSafeguardingStatusDisplay("resolved")).toBe("Resolved");
      expect(getSafeguardingStatusDisplay("closed")).toBe("Closed");
    });

    it("displays safeguarding severity correctly", () => {
      expect(getSafeguardingSeverityDisplay("low")).toBe("Low");
      expect(getSafeguardingSeverityDisplay("medium")).toBe("Medium");
      expect(getSafeguardingSeverityDisplay("high")).toBe("High");
      expect(getSafeguardingSeverityDisplay("critical")).toBe("Critical");
    });

    it("displays concern type correctly", () => {
      expect(getSafeguardingConcernTypeDisplay("abuse")).toBe("Abuse");
      expect(getSafeguardingConcernTypeDisplay("neglect")).toBe("Neglect");
      expect(getSafeguardingConcernTypeDisplay("missing_child")).toBe("Missing Child");
      expect(getSafeguardingConcernTypeDisplay("self_harm")).toBe("Self-Harm");
      expect(getSafeguardingConcernTypeDisplay("unsafe_environment")).toBe("Unsafe Environment");
      expect(getSafeguardingConcernTypeDisplay("trafficking")).toBe("Trafficking");
    });

    it("displays escalation status correctly", () => {
      expect(getEscalationStatusDisplay("pending")).toBe("Pending");
      expect(getEscalationStatusDisplay("acknowledged")).toBe("Acknowledged");
      expect(getEscalationStatusDisplay("in_progress")).toBe("In Progress");
      expect(getEscalationStatusDisplay("completed")).toBe("Completed");
    });
  });

  describe("TypeScript Type Compliance", () => {
    it("concern conforms to SafeguardingConcern interface", () => {
      const concern: SafeguardingConcern = {
        id: "test-id",
        centre_id: "centre-id",
        child_id: "child-id",
        case_id: null,
        concern_type: "abuse",
        title: "Test Concern",
        description: "Test description",
        severity: "high",
        status: "reported",
        reported_by: "user-id",
        reported_at: new Date().toISOString(),
        assigned_to: null,
        location: null,
        witnesses: null,
        evidence_summary: null,
        action_taken: null,
        external_referral: false,
        external_agency: null,
        external_reference: null,
        resolved_at: null,
        resolution_notes: null,
        metadata: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      expect(concern.id).toBe("test-id");
      expect(concern.concern_type).toBe("abuse");
      expect(concern.severity).toBe("high");
      expect(concern.status).toBe("reported");
    });

    it("action conforms to SafeguardingAction interface", () => {
      const action: SafeguardingAction = {
        id: "action-id",
        concern_id: "concern-id",
        centre_id: "centre-id",
        action_type: "investigation",
        description: "Investigate the concern",
        status: "pending",
        assigned_to: null,
        due_date: null,
        completed_date: null,
        outcome: null,
        notes: null,
        created_by: "user-id",
        metadata: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      expect(action.id).toBe("action-id");
      expect(action.action_type).toBe("investigation");
    });

    it("escalation conforms to SafeguardingEscalation interface", () => {
      const escalation: SafeguardingEscalation = {
        id: "esc-id",
        concern_id: "concern-id",
        centre_id: "centre-id",
        title: "Test Escalation",
        description: "Description",
        reason: "Reason",
        status: "pending",
        escalated_by: "user-id",
        escalated_to: null,
        escalated_at: new Date().toISOString(),
        acknowledged_at: null,
        resolved_at: null,
        resolution_notes: null,
        metadata: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      expect(escalation.id).toBe("esc-id");
      expect(escalation.status).toBe("pending");
    });

    it("all enum values are valid TypeScript types", () => {
      const status: SafeguardingStatus = "reported";
      const severity: SafeguardingSeverity = "medium";
      const type: SafeguardingConcernType = "abuse";
      const escStatus: EscalationStatus = "pending";

      expect(status).toBe("reported");
      expect(severity).toBe("medium");
      expect(type).toBe("abuse");
      expect(escStatus).toBe("pending");
    });
  });
});
