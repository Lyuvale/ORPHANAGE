import { describe, it, expect } from "vitest";
import {
  PRESENCE_STATUSES,
  ABSENCE_REASONS,
  getPresenceStatusDisplay,
  getAbsenceReasonDisplay,
} from "@/types/presence";
import type {
  ChildPresence,
  PresenceStatus,
  AbsenceReason,
} from "@/types/presence";

describe("Presence Types", () => {
  describe("Enum Constants", () => {
    it("defines presence statuses", () => {
      expect(PRESENCE_STATUSES).toEqual([
        "present", "absent", "on_leave", "off_site", "transferred", "other_approved",
      ]);
    });

    it("defines absence reasons", () => {
      expect(ABSENCE_REASONS).toEqual([
        "illness", "family_leave", "unknown", "external_programme", "approved_absence", "other",
      ]);
    });
  });

  describe("Display Helpers", () => {
    it("displays presence status correctly", () => {
      expect(getPresenceStatusDisplay("present")).toBe("Present");
      expect(getPresenceStatusDisplay("absent")).toBe("Absent");
      expect(getPresenceStatusDisplay("on_leave")).toBe("On Leave");
      expect(getPresenceStatusDisplay("off_site")).toBe("Off Site");
      expect(getPresenceStatusDisplay("transferred")).toBe("Transferred");
      expect(getPresenceStatusDisplay("other_approved")).toBe("Other Approved");
    });

    it("displays absence reason correctly", () => {
      expect(getAbsenceReasonDisplay("illness")).toBe("Illness");
      expect(getAbsenceReasonDisplay("family_leave")).toBe("Family Leave");
      expect(getAbsenceReasonDisplay("unknown")).toBe("Unknown");
      expect(getAbsenceReasonDisplay("external_programme")).toBe("External Programme");
      expect(getAbsenceReasonDisplay("approved_absence")).toBe("Approved Absence");
      expect(getAbsenceReasonDisplay("other")).toBe("Other");
    });
  });

  describe("TypeScript Type Compliance", () => {
    it("child presence conforms to ChildPresence interface", () => {
      const mock: ChildPresence = {
        id: "test-id",
        centre_id: "centre-id",
        child_id: "child-id",
        presence_date: "2026-09-01",
        status: "present",
        check_in_time: new Date().toISOString(),
        check_out_time: null,
        check_in_by: "user-id",
        check_out_by: null,
        absence_reason: null,
        off_site_reason: null,
        off_site_destination: null,
        off_site_expected_return: null,
        off_site_actual_return: null,
        authorised_by: null,
        visit_id: null,
        notes: null,
        metadata: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      expect(mock.id).toBe("test-id");
      expect(mock.status).toBe("present");
      expect(mock.centre_id).toBe("centre-id");
    });

    it("all enum values are valid TypeScript types", () => {
      const status: PresenceStatus = "present";
      const reason: AbsenceReason = "illness";
      expect(status).toBe("present");
      expect(reason).toBe("illness");
    });
  });
});
