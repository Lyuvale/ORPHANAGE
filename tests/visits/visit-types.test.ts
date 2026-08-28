import { describe, it, expect } from "vitest";
import {
  VISIT_TYPES,
  VISIT_STATUSES,
  VISIT_OUTCOMES,
  RESTRICTION_TYPES,
  CONTACT_ATTEMPT_TYPES,
  CONTACT_ATTEMPT_RESULTS,
  VISIT_STATUS_TRANSITIONS,
  getVisitTypeDisplay,
  getVisitStatusDisplay,
  getVisitOutcomeDisplay,
  getRestrictionTypeDisplay,
  getContactAttemptTypeDisplay,
  getContactAttemptResultDisplay,
  isValidVisitStatusTransition,
  canCheckIn,
  canCheckOut,
  isVisitTerminal,
} from "@/types/visit";
import type {
  Visit,
  VisitType,
  VisitStatus,
  VisitOutcome,
  RestrictionType,
  ContactAttemptType,
  ContactAttemptResult,
} from "@/types/visit";

describe("Visit Types", () => {
  describe("Enum Constants", () => {
    it("defines visit types", () => {
      expect(VISIT_TYPES).toEqual([
        "in_person", "phone", "video", "off_site", "other_approved",
      ]);
    });

    it("defines visit statuses", () => {
      expect(VISIT_STATUSES).toEqual([
        "requested", "pending_approval", "approved", "scheduled",
        "checked_in", "completed", "cancelled", "rejected", "no_show",
      ]);
    });

    it("defines visit outcomes", () => {
      expect(VISIT_OUTCOMES).toEqual([
        "positive", "neutral", "negative", "concern_noted",
        "incident_reported", "pending_review", "none",
      ]);
    });

    it("defines restriction types", () => {
      expect(RESTRICTION_TYPES).toEqual([
        "no_visits", "supervised_only", "limited_frequency",
        "limited_duration", "phone_only", "temporary_ban", "other",
      ]);
    });

    it("defines contact attempt types", () => {
      expect(CONTACT_ATTEMPT_TYPES).toEqual([
        "phone_call", "message", "visit_attempt", "video_call", "email", "other",
      ]);
    });

    it("defines contact attempt results", () => {
      expect(CONTACT_ATTEMPT_RESULTS).toEqual([
        "successful", "unsuccessful", "no_answer", "wrong_number",
        "voicemail_left", "cancelled", "other",
      ]);
    });
  });

  describe("Status Transitions", () => {
    it("requested can transition to pending_approval", () => {
      expect(VISIT_STATUS_TRANSITIONS.requested).toContain("pending_approval");
    });

    it("requested can transition to approved, cancelled, rejected", () => {
      expect(VISIT_STATUS_TRANSITIONS.requested).toContain("approved");
      expect(VISIT_STATUS_TRANSITIONS.requested).toContain("cancelled");
      expect(VISIT_STATUS_TRANSITIONS.requested).toContain("rejected");
    });

    it("approved can transition to scheduled, cancelled, no_show", () => {
      expect(VISIT_STATUS_TRANSITIONS.approved).toContain("scheduled");
      expect(VISIT_STATUS_TRANSITIONS.approved).toContain("cancelled");
      expect(VISIT_STATUS_TRANSITIONS.approved).toContain("no_show");
    });

    it("scheduled can transition to checked_in, cancelled, no_show", () => {
      expect(VISIT_STATUS_TRANSITIONS.scheduled).toContain("checked_in");
      expect(VISIT_STATUS_TRANSITIONS.scheduled).toContain("cancelled");
      expect(VISIT_STATUS_TRANSITIONS.scheduled).toContain("no_show");
    });

    it("checked_in can only transition to completed", () => {
      expect(VISIT_STATUS_TRANSITIONS.checked_in).toEqual(["completed"]);
    });

    it("completed is terminal", () => {
      expect(VISIT_STATUS_TRANSITIONS.completed).toEqual([]);
    });

    it("cancelled is terminal", () => {
      expect(VISIT_STATUS_TRANSITIONS.cancelled).toEqual([]);
    });

    it("rejected is terminal", () => {
      expect(VISIT_STATUS_TRANSITIONS.rejected).toEqual([]);
    });

    it("no_show can transition back to requested", () => {
      expect(VISIT_STATUS_TRANSITIONS.no_show).toContain("requested");
    });

    it("isValidVisitStatusTransition validates correctly", () => {
      expect(isValidVisitStatusTransition("requested", "pending_approval")).toBe(true);
      expect(isValidVisitStatusTransition("requested", "completed")).toBe(false);
      expect(isValidVisitStatusTransition("approved", "scheduled")).toBe(true);
      expect(isValidVisitStatusTransition("checked_in", "completed")).toBe(true);
      expect(isValidVisitStatusTransition("completed", "requested")).toBe(false);
    });
  });

  describe("Display Helpers", () => {
    it("displays visit type correctly", () => {
      expect(getVisitTypeDisplay("in_person")).toBe("In Person");
      expect(getVisitTypeDisplay("phone")).toBe("Phone");
      expect(getVisitTypeDisplay("video")).toBe("Video");
      expect(getVisitTypeDisplay("off_site")).toBe("Off Site");
      expect(getVisitTypeDisplay("other_approved")).toBe("Other Approved");
    });

    it("displays visit status correctly", () => {
      expect(getVisitStatusDisplay("requested")).toBe("Requested");
      expect(getVisitStatusDisplay("pending_approval")).toBe("Pending Approval");
      expect(getVisitStatusDisplay("approved")).toBe("Approved");
      expect(getVisitStatusDisplay("scheduled")).toBe("Scheduled");
      expect(getVisitStatusDisplay("checked_in")).toBe("Checked In");
      expect(getVisitStatusDisplay("completed")).toBe("Completed");
      expect(getVisitStatusDisplay("cancelled")).toBe("Cancelled");
      expect(getVisitStatusDisplay("rejected")).toBe("Rejected");
      expect(getVisitStatusDisplay("no_show")).toBe("No Show");
    });

    it("displays visit outcome correctly", () => {
      expect(getVisitOutcomeDisplay("positive")).toBe("Positive");
      expect(getVisitOutcomeDisplay("negative")).toBe("Negative");
      expect(getVisitOutcomeDisplay("concern_noted")).toBe("Concern Noted");
    });

    it("displays restriction type correctly", () => {
      expect(getRestrictionTypeDisplay("no_visits")).toBe("No Visits");
      expect(getRestrictionTypeDisplay("supervised_only")).toBe("Supervised Only");
      expect(getRestrictionTypeDisplay("phone_only")).toBe("Phone Only");
    });

    it("displays contact attempt type correctly", () => {
      expect(getContactAttemptTypeDisplay("phone_call")).toBe("Phone Call");
      expect(getContactAttemptTypeDisplay("message")).toBe("Message");
      expect(getContactAttemptTypeDisplay("video_call")).toBe("Video Call");
    });

    it("displays contact attempt result correctly", () => {
      expect(getContactAttemptResultDisplay("successful")).toBe("Successful");
      expect(getContactAttemptResultDisplay("no_answer")).toBe("No Answer");
      expect(getContactAttemptResultDisplay("voicemail_left")).toBe("Voicemail Left");
    });
  });

  describe("Helper Functions", () => {
    it("canCheckIn returns true for approved/scheduled", () => {
      expect(canCheckIn("approved")).toBe(true);
      expect(canCheckIn("scheduled")).toBe(true);
      expect(canCheckIn("checked_in")).toBe(false);
      expect(canCheckIn("completed")).toBe(false);
    });

    it("canCheckOut returns true only for checked_in", () => {
      expect(canCheckOut("checked_in")).toBe(true);
      expect(canCheckOut("approved")).toBe(false);
      expect(canCheckOut("completed")).toBe(false);
    });

    it("isVisitTerminal returns true for completed/cancelled/rejected", () => {
      expect(isVisitTerminal("completed")).toBe(true);
      expect(isVisitTerminal("cancelled")).toBe(true);
      expect(isVisitTerminal("rejected")).toBe(true);
      expect(isVisitTerminal("requested")).toBe(false);
      expect(isVisitTerminal("checked_in")).toBe(false);
    });
  });

  describe("TypeScript Type Compliance", () => {
    it("visit type conforms to Visit interface", () => {
      const mockVisit: Visit = {
        id: "test-id",
        centre_id: "centre-id",
        reference_number: "ABC-VISIT-00001",
        child_id: "child-id",
        guardian_id: "guardian-id",
        visit_type: "in_person",
        status: "requested",
        scheduled_date: "2026-09-15",
        scheduled_start_time: "10:00",
        scheduled_end_time: "11:00",
        actual_check_in_time: null,
        actual_check_out_time: null,
        location: "Main office",
        purpose: "Family visit",
        notes: null,
        outcome: null,
        outcome_notes: null,
        child_response: null,
        family_response: null,
        follow_up_required: false,
        follow_up_date: null,
        follow_up_staff_id: null,
        supervised: false,
        supervisor_id: null,
        supervision_notes: null,
        supervisor_notes: null,
        cancellation_reason: null,
        cancelled_by: null,
        cancelled_at: null,
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
        approved_by: null,
        approved_at: null,
        checked_in_by: null,
        checked_out_by: null,
        created_by: "user-id",
        metadata: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      expect(mockVisit.id).toBe("test-id");
      expect(mockVisit.visit_type).toBe("in_person");
      expect(mockVisit.status).toBe("requested");
    });

    it("all enum values are valid TypeScript types", () => {
      const type: VisitType = "in_person";
      const status: VisitStatus = "requested";
      const outcome: VisitOutcome = "positive";
      const restriction: RestrictionType = "no_visits";
      const contactType: ContactAttemptType = "phone_call";
      const contactResult: ContactAttemptResult = "successful";

      expect(type).toBe("in_person");
      expect(status).toBe("requested");
      expect(outcome).toBe("positive");
      expect(restriction).toBe("no_visits");
      expect(contactType).toBe("phone_call");
      expect(contactResult).toBe("successful");
    });
  });
});
