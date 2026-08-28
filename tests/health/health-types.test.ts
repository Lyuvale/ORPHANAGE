import { describe, it, expect } from "vitest";
import {
  MEDICAL_RECORD_TYPES,
  MEDICAL_VISIT_TYPES,
  MEDICATION_STATUSES,
  MEDICATION_ADMIN_STATUSES,
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUSES,
  SCREENING_TYPES,
  IMMUNIZATION_STATUSES,
  HEALTH_DOCUMENT_TYPES,
  getBloodGroupDisplay,
  getMedicalRecordTypeDisplay,
  getMedicalVisitTypeDisplay,
  getMedicationStatusDisplay,
  getMedicationAdminStatusDisplay,
  getAppointmentTypeDisplay,
  getAppointmentStatusDisplay,
  getScreeningTypeDisplay,
  getImmunizationStatusDisplay,
  getHealthDocumentTypeDisplay,
} from "@/types/health";

describe("Health & Medical Types", () => {
  describe("Enum Constants", () => {
    it("defines medical record types", () => {
      expect(MEDICAL_RECORD_TYPES).toContain("consultation");
      expect(MEDICAL_RECORD_TYPES).toContain("diagnosis");
      expect(MEDICAL_RECORD_TYPES).toContain("discharge");
      expect(MEDICAL_RECORD_TYPES).toContain("other");
    });

    it("defines medical visit types", () => {
      expect(MEDICAL_VISIT_TYPES).toContain("clinic");
      expect(MEDICAL_VISIT_TYPES).toContain("dental");
    });

    it("defines medication statuses", () => {
      expect(MEDICATION_STATUSES).toEqual(["ACTIVE", "COMPLETED", "DISCONTINUED"]);
    });

    it("defines medication administration statuses", () => {
      expect(MEDICATION_ADMIN_STATUSES).toContain("GIVEN");
      expect(MEDICATION_ADMIN_STATUSES).toContain("MISSED");
      expect(MEDICATION_ADMIN_STATUSES).toContain("REFUSED");
      expect(MEDICATION_ADMIN_STATUSES).toContain("NOT_AVAILABLE");
      expect(MEDICATION_ADMIN_STATUSES).toContain("OTHER_APPROVED");
    });

    it("defines appointment types and statuses", () => {
      expect(APPOINTMENT_TYPES).toContain("therapy");
      expect(APPOINTMENT_STATUSES).toContain("RESCHEDULED");
      expect(APPOINTMENT_STATUSES).toContain("MISSED");
    });

    it("defines screening types", () => {
      expect(SCREENING_TYPES).toContain("vision");
      expect(SCREENING_TYPES).toContain("hearing");
    });

    it("defines immunization statuses", () => {
      expect(IMMUNIZATION_STATUSES).toEqual(["COMPLETED", "DUE", "OVERDUE"]);
    });

    it("defines health document types", () => {
      expect(HEALTH_DOCUMENT_TYPES).toContain("discharge_summary");
    });
  });

  describe("Display Helpers", () => {
    it("formats blood groups", () => {
      expect(getBloodGroupDisplay("A_POSITIVE")).toBe("A+");
      expect(getBloodGroupDisplay("O_NEGATIVE")).toBe("O−");
      expect(getBloodGroupDisplay("UNKNOWN")).toBe("Unknown");
    });

    it("formats medical record types", () => {
      expect(getMedicalRecordTypeDisplay("lab_result")).toBe("Lab Result");
      expect(getMedicalRecordTypeDisplay("consultation")).toBe("Consultation");
    });

    it("formats medical visit types", () => {
      expect(getMedicalVisitTypeDisplay("doctor_consultation")).toBe("Doctor Consultation");
    });

    it("formats medication statuses", () => {
      expect(getMedicationStatusDisplay("ACTIVE")).toBe("Active");
      expect(getMedicationStatusDisplay("DISCONTINUED")).toBe("Discontinued");
    });

    it("formats administration statuses", () => {
      expect(getMedicationAdminStatusDisplay("GIVEN")).toBe("Given");
      expect(getMedicationAdminStatusDisplay("NOT_AVAILABLE")).toBe("Not Available");
    });

    it("formats appointment types and statuses", () => {
      expect(getAppointmentTypeDisplay("doctor_consultation")).toBe("Doctor Consultation");
      expect(getAppointmentStatusDisplay("SCHEDULED")).toBe("Scheduled");
      expect(getAppointmentStatusDisplay("RESCHEDULED")).toBe("Rescheduled");
    });

    it("formats screening types", () => {
      expect(getScreeningTypeDisplay("growth_monitoring")).toBe("Growth Monitoring");
    });

    it("formats immunization statuses", () => {
      expect(getImmunizationStatusDisplay("COMPLETED")).toBe("Completed");
      expect(getImmunizationStatusDisplay("OVERDUE")).toBe("Overdue");
    });

    it("formats health document types", () => {
      expect(getHealthDocumentTypeDisplay("discharge_summary")).toBe("Discharge Summary");
    });
  });
});
