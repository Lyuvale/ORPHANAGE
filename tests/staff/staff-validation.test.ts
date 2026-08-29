import { describe, it, expect } from "vitest";
import {
  createStaffSchema,
  updateStaffSchema,
  staffStatusSchema,
  createStaffAssignmentSchema,
  createStaffTrainingSchema,
  updateStaffTrainingSchema,
  createStaffQualificationSchema,
  createStaffEmergencyContactSchema,
  staffSearchSchema,
  cleanStaffInput,
} from "@/lib/staff/staff.validation";

describe("Staff Validation", () => {
  const centreId = "00000000-0000-0000-0000-000000000001";
  const staffId = "00000000-0000-0000-0000-000000000002";

  describe("createStaffSchema", () => {
    it("accepts a valid staff profile", () => {
      const result = createStaffSchema.safeParse({
        centre_id: centreId,
        job_title: "Senior Caregiver",
      });
      expect(result.success).toBe(true);
    });

    it("rejects a missing job title", () => {
      const result = createStaffSchema.safeParse({ centre_id: centreId });
      expect(result.success).toBe(false);
    });

    it("rejects a bad employment status", () => {
      const result = createStaffSchema.safeParse({
        centre_id: centreId,
        job_title: "Caregiver",
        employment_status: "BANNED",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a bad operational role", () => {
      const result = createStaffSchema.safeParse({
        centre_id: centreId,
        job_title: "Caregiver",
        operational_role: "SUPERVISOR",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateStaffSchema", () => {
    it("requires at least one field", () => {
      expect(updateStaffSchema.safeParse({}).success).toBe(false);
    });

    it("accepts partial updates", () => {
      expect(updateStaffSchema.safeParse({ department: "Care" }).success).toBe(true);
    });
  });

  describe("staffStatusSchema", () => {
    it("accepts valid statuses and rejects unknown ones", () => {
      expect(staffStatusSchema.safeParse({ status: "ON_LEAVE" }).success).toBe(true);
      expect(staffStatusSchema.safeParse({ status: "BANNED" }).success).toBe(false);
    });
  });

  describe("createStaffAssignmentSchema", () => {
    it("requires centre, staff and responsibility", () => {
      expect(
        createStaffAssignmentSchema.safeParse({
          centre_id: centreId,
          staff_id: staffId,
          responsibility_type: "House Parent",
        }).success,
      ).toBe(true);
      expect(
        createStaffAssignmentSchema.safeParse({
          centre_id: centreId,
          staff_id: staffId,
        }).success,
      ).toBe(false);
    });
  });

  describe("createStaffTrainingSchema", () => {
    it("accepts a valid training record", () => {
      expect(
        createStaffTrainingSchema.safeParse({
          centre_id: centreId,
          staff_id: staffId,
          training_title: "First Aid",
        }).success,
      ).toBe(true);
    });

    it("rejects an unknown completion status", () => {
      expect(
        createStaffTrainingSchema.safeParse({
          centre_id: centreId,
          staff_id: staffId,
          training_title: "First Aid",
          completion_status: "ARCHIVED",
        }).success,
      ).toBe(false);
    });
  });

  describe("updateStaffTrainingSchema", () => {
    it("requires at least one field", () => {
      expect(updateStaffTrainingSchema.safeParse({}).success).toBe(false);
      expect(
        updateStaffTrainingSchema.safeParse({ completion_status: "COMPLETED" }).success,
      ).toBe(true);
    });
  });

  describe("createStaffQualificationSchema", () => {
    it("rejects an invalid year", () => {
      expect(
        createStaffQualificationSchema.safeParse({
          centre_id: centreId,
          staff_id: staffId,
          qualification: "Diploma",
          qualification_year: "20",
        }).success,
      ).toBe(false);
      expect(
        createStaffQualificationSchema.safeParse({
          centre_id: centreId,
          staff_id: staffId,
          qualification: "Diploma",
          qualification_year: "2019",
        }).success,
      ).toBe(true);
    });
  });

  describe("createStaffEmergencyContactSchema", () => {
    it("requires a contact name", () => {
      expect(
        createStaffEmergencyContactSchema.safeParse({
          centre_id: centreId,
          staff_id: staffId,
          contact_name: "Jane Doe",
        }).success,
      ).toBe(true);
      expect(
        createStaffEmergencyContactSchema.safeParse({
          centre_id: centreId,
          staff_id: staffId,
        }).success,
      ).toBe(false);
    });
  });

  describe("staffSearchSchema", () => {
    it("parses and clamps limit/offset", () => {
      const result = staffSearchSchema.safeParse({
        search: "care",
        limit: "999",
        offset: "0",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(200);
      }
    });
  });

  describe("cleanStaffInput", () => {
    it("converts empty strings to null", () => {
      const cleaned = cleanStaffInput({ department: "", job_title: "Caregiver" });
      expect(cleaned.department).toBeNull();
      expect(cleaned.job_title).toBe("Caregiver");
    });
  });
});