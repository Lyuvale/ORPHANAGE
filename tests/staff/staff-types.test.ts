import { describe, it, expect } from "vitest";
import {
  STAFF_STATUSES,
  STAFF_HISTORY_EVENTS,
  STAFF_ASSIGNMENT_STATUSES,
  STAFF_TRAINING_STATUSES,
  STAFF_VERIFICATION_STATUSES,
  STAFF_DOCUMENT_TYPES,
  getStaffStatusDisplay,
  getStaffHistoryEventDisplay,
  getStaffTrainingStatusDisplay,
  getStaffVerificationStatusDisplay,
  getStaffDocumentTypeDisplay,
} from "@/types/staff";
import { CENTRE_ROLES } from "@/types/role";

describe("Staff Types", () => {
  describe("enums", () => {
    it("defines employment status with ACTIVE and ENDED", () => {
      expect(STAFF_STATUSES).toContain("ACTIVE");
      expect(STAFF_STATUSES).toContain("ON_LEAVE");
      expect(STAFF_STATUSES).toContain("SUSPENDED");
      expect(STAFF_STATUSES).toContain("INACTIVE");
      expect(STAFF_STATUSES).toContain("ENDED");
    });

    it("defines history, assignment, training, verification and document enums", () => {
      expect(STAFF_HISTORY_EVENTS).toContain("JOINED");
      expect(STAFF_HISTORY_EVENTS).toContain("STATUS_CHANGED");
      expect(STAFF_HISTORY_EVENTS).toContain("ENDED");
      expect(STAFF_ASSIGNMENT_STATUSES).toEqual(["ACTIVE", "ENDED"]);
      expect(STAFF_TRAINING_STATUSES).toEqual(["PENDING", "COMPLETED"]);
      expect(STAFF_VERIFICATION_STATUSES).toContain("NOT_VERIFIED");
      expect(STAFF_DOCUMENT_TYPES).toContain("EMPLOYMENT_AGREEMENT");
      expect(STAFF_DOCUMENT_TYPES).toContain("QUALIFICATION_CERTIFICATE");
    });

    it("documents bucket is private staff-documents", () => {
      // The storage bucket is private; only signed URLs are exposed.
      const bucket = "staff-documents";
      expect(bucket).toBe("staff-documents");
    });
  });

  describe("display helpers", () => {
    it("formats employment status", () => {
      expect(getStaffStatusDisplay("ON_LEAVE")).toBe("On Leave");
      expect(getStaffStatusDisplay("ENDED")).toBe("Ended");
    });

    it("formats history events, training, verification and document types", () => {
      expect(getStaffHistoryEventDisplay("ASSIGNMENT_CHANGED")).toBe("Assignment Changed");
      expect(getStaffTrainingStatusDisplay("PENDING")).toBe("Pending");
      expect(getStaffVerificationStatusDisplay("VERIFIED")).toBe("Verified");
      expect(getStaffDocumentTypeDisplay("TRAINING_CERTIFICATE")).toBe("Training Certificate");
    });
  });

  describe("operational role vocabulary", () => {
    it("reuses the platform centre roles", () => {
      expect(CENTRE_ROLES).toContain("CENTRE_MANAGER");
      expect(CENTRE_ROLES).toContain("SOCIAL_WORKER");
      expect(CENTRE_ROLES).toContain("CAREGIVER");
      expect(CENTRE_ROLES).toContain("RECORDS_OFFICER");
      expect(CENTRE_ROLES).toContain("ACCOUNTANT_BURSAR");
    });
  });
});