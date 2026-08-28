import { describe, it, expect } from "vitest";
import { PERMISSIONS, ROLE_PERMISSIONS } from "@/types/role";

describe("Health & Medical Permissions", () => {
  describe("Permission Constants", () => {
    it("defines core health permissions", () => {
      expect(PERMISSIONS.HEALTH_VIEW).toBe("health.view");
      expect(PERMISSIONS.HEALTH_CREATE).toBe("health.create");
      expect(PERMISSIONS.HEALTH_UPDATE).toBe("health.update");
    });

    it("defines medical record permissions", () => {
      expect(PERMISSIONS.HEALTH_MEDICAL_RECORDS_VIEW).toBe("health.medical_records.view");
      expect(PERMISSIONS.HEALTH_MEDICAL_RECORDS_CREATE).toBe("health.medical_records.create");
      expect(PERMISSIONS.HEALTH_MEDICAL_RECORDS_UPDATE).toBe("health.medical_records.update");
    });

    it("defines medication permissions", () => {
      expect(PERMISSIONS.HEALTH_MEDICATIONS_VIEW).toBe("health.medications.view");
      expect(PERMISSIONS.HEALTH_MEDICATIONS_MANAGE).toBe("health.medications.manage");
      expect(PERMISSIONS.HEALTH_MEDICATIONS_ADMINISTER).toBe("health.medications.administer");
    });

    it("defines appointment permissions", () => {
      expect(PERMISSIONS.HEALTH_APPOINTMENTS_VIEW).toBe("health.appointments.view");
      expect(PERMISSIONS.HEALTH_APPOINTMENTS_MANAGE).toBe("health.appointments.manage");
    });

    it("defines screening permissions", () => {
      expect(PERMISSIONS.HEALTH_SCREENINGS_VIEW).toBe("health.screenings.view");
      expect(PERMISSIONS.HEALTH_SCREENINGS_MANAGE).toBe("health.screenings.manage");
    });

    it("defines immunization permissions", () => {
      expect(PERMISSIONS.HEALTH_IMMUNIZATIONS_VIEW).toBe("health.immunizations.view");
      expect(PERMISSIONS.HEALTH_IMMUNIZATIONS_MANAGE).toBe("health.immunizations.manage");
    });

    it("defines document permissions", () => {
      expect(PERMISSIONS.HEALTH_DOCUMENTS_VIEW).toBe("health.documents.view");
      expect(PERMISSIONS.HEALTH_DOCUMENTS_UPLOAD).toBe("health.documents.upload");
      expect(PERMISSIONS.HEALTH_DOCUMENTS_DOWNLOAD).toBe("health.documents.download");
    });

    it("defines emergency view permission", () => {
      expect(PERMISSIONS.HEALTH_EMERGENCY_VIEW).toBe("health.emergency.view");
    });
  });

  describe("Role-Permission Mappings", () => {
    it("CENTRE_MANAGER has all health permissions", () => {
      const perms = ROLE_PERMISSIONS.CENTRE_MANAGER;
      expect(perms).toContain("health.view");
      expect(perms).toContain("health.create");
      expect(perms).toContain("health.update");
      expect(perms).toContain("health.medical_records.view");
      expect(perms).toContain("health.medical_records.create");
      expect(perms).toContain("health.medical_records.update");
      expect(perms).toContain("health.medications.view");
      expect(perms).toContain("health.medications.manage");
      expect(perms).toContain("health.medications.administer");
      expect(perms).toContain("health.appointments.view");
      expect(perms).toContain("health.appointments.manage");
      expect(perms).toContain("health.screenings.view");
      expect(perms).toContain("health.screenings.manage");
      expect(perms).toContain("health.immunizations.view");
      expect(perms).toContain("health.immunizations.manage");
      expect(perms).toContain("health.documents.view");
      expect(perms).toContain("health.documents.upload");
      expect(perms).toContain("health.documents.download");
      expect(perms).toContain("health.emergency.view");
    });

    it("SOCIAL_WORKER has all health permissions", () => {
      const perms = ROLE_PERMISSIONS.SOCIAL_WORKER;
      expect(perms).toContain("health.view");
      expect(perms).toContain("health.medical_records.create");
      expect(perms).toContain("health.medications.manage");
      expect(perms).toContain("health.appointments.manage");
      expect(perms).toContain("health.screenings.manage");
      expect(perms).toContain("health.immunizations.manage");
      expect(perms).toContain("health.documents.upload");
      expect(perms).toContain("health.documents.download");
      expect(perms).toContain("health.emergency.view");
    });

    it("CAREGIVER has restricted emergency/medication permissions only", () => {
      const perms = ROLE_PERMISSIONS.CAREGIVER;
      expect(perms).toContain("health.emergency.view");
      expect(perms).toContain("health.medications.view");
      expect(perms).toContain("health.medications.administer");
      expect(perms).not.toContain("health.medical_records.view");
      expect(perms).not.toContain("health.medical_records.create");
      expect(perms).not.toContain("health.medications.manage");
      expect(perms).not.toContain("health.documents.view");
      expect(perms).not.toContain("health.emergency");
    });

    it("RECORDS_OFFICER has broad health access but cannot administer medications", () => {
      const perms = ROLE_PERMISSIONS.RECORDS_OFFICER;
      expect(perms).toContain("health.view");
      expect(perms).toContain("health.medical_records.create");
      expect(perms).toContain("health.medications.manage");
      expect(perms).toContain("health.documents.upload");
      expect(perms).toContain("health.emergency.view");
      expect(perms).not.toContain("health.medications.administer");
    });

    it("ACCOUNTANT_BURSAR has no health permissions", () => {
      const perms = ROLE_PERMISSIONS.ACCOUNTANT_BURSAR;
      expect(perms.some((p) => p.startsWith("health."))).toBe(false);
    });
  });

  describe("Permission Count", () => {
    it("has 19 health permissions", () => {
      const healthPerms = Object.values(PERMISSIONS).filter((p) => p.startsWith("health."));
      expect(healthPerms).toHaveLength(19);
    });
  });
});
