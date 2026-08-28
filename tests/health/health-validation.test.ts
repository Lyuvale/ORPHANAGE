import { describe, it, expect } from "vitest";
import {
  createHealthProfileSchema,
  createMedicalRecordSchema,
  amendMedicalRecordSchema,
  createMedicationSchema,
  createMedicationAdministrationSchema,
  createAppointmentSchema,
  updateAppointmentStatusSchema,
  createScreeningSchema,
  createImmunizationSchema,
  createHealthAlertSchema,
  createHealthFollowupSchema,
  updateHealthFollowupSchema,
} from "@/lib/health/health.validation";

const UUID = "550e8400-e29b-41d4-a716-446655440000";
const UUID2 = "550e8400-e29b-41d4-a716-446655440001";
const UUID3 = "550e8400-e29b-41d4-a716-446655440002";

describe("Health Validation Schemas", () => {
  describe("createHealthProfileSchema", () => {
    it("accepts a valid profile", () => {
      const result = createHealthProfileSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing child_id", () => {
      const result = createHealthProfileSchema.safeParse({ centre_id: UUID });
      expect(result.success).toBe(false);
    });
  });

  describe("createMedicalRecordSchema", () => {
    it("accepts a valid record", () => {
      const result = createMedicalRecordSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        record_date: "2026-09-01",
        record_type: "diagnosis",
      });
      expect(result.success).toBe(true);
    });

    it("rejects an invalid record type", () => {
      const result = createMedicalRecordSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        record_date: "2026-09-01",
        record_type: "not_a_type",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("amendMedicalRecordSchema", () => {
    it("requires an amendment reason", () => {
      const result = amendMedicalRecordSchema.safeParse({
        findings: "Updated findings",
      });
      expect(result.success).toBe(false);
    });

    it("accepts a valid amendment", () => {
      const result = amendMedicalRecordSchema.safeParse({
        findings: "Updated findings",
        amendment_reason: "Correction",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("createMedicationSchema", () => {
    it("accepts a valid medication", () => {
      const result = createMedicationSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        medication_name: "Paracetamol",
        start_date: "2026-09-01",
      });
      expect(result.success).toBe(true);
    });

    it("rejects a missing medication name", () => {
      const result = createMedicationSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        start_date: "2026-09-01",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createMedicationAdministrationSchema", () => {
    it("accepts a valid administration", () => {
      const result = createMedicationAdministrationSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        medication_id: UUID3,
        scheduled_time: "2026-09-01",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid administration status", () => {
      const result = createMedicationAdministrationSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        medication_id: UUID3,
        scheduled_time: "2026-09-01",
        status: "NOT_A_STATUS",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createAppointmentSchema", () => {
    it("accepts a valid appointment", () => {
      const result = createAppointmentSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        appointment_type: "clinic",
        appointment_date: "2026-09-01",
      });
      expect(result.success).toBe(true);
    });

    it("rejects an invalid appointment type", () => {
      const result = createAppointmentSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        appointment_type: "invalid",
        appointment_date: "2026-09-01",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateAppointmentStatusSchema", () => {
    it("requires a status", () => {
      const result = updateAppointmentStatusSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("accepts a valid status", () => {
      const result = updateAppointmentStatusSchema.safeParse({
        status: "COMPLETED",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("createScreeningSchema", () => {
    it("accepts a valid screening", () => {
      const result = createScreeningSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        screening_type: "vision",
        screening_date: "2026-09-01",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("createImmunizationSchema", () => {
    it("accepts a valid immunization", () => {
      const result = createImmunizationSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        vaccine: "BCG",
        administered_date: "2026-09-01",
      });
      expect(result.success).toBe(true);
    });

    it("rejects a missing vaccine", () => {
      const result = createImmunizationSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        administered_date: "2026-09-01",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createHealthAlertSchema", () => {
    it("accepts a valid alert", () => {
      const result = createHealthAlertSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        alert_type: "allergy",
        title: "Peanut allergy",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("createHealthFollowupSchema", () => {
    it("accepts a valid follow-up", () => {
      const result = createHealthFollowupSchema.safeParse({
        centre_id: UUID,
        child_id: UUID2,
        followup_type: "appointment",
        title: "Review appointment",
        due_date: "2026-09-10",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateHealthFollowupSchema", () => {
    it("accepts a status update", () => {
      const result = updateHealthFollowupSchema.safeParse({ status: "completed" });
      expect(result.success).toBe(true);
    });
  });
});
