import { describe, it, expect } from "vitest";
import { PERMISSIONS, ROLE_PERMISSIONS } from "@/types/role";

describe("Staff Management Permissions", () => {
  describe("Permission Constants", () => {
    it("defines the base staff permissions", () => {
      expect(PERMISSIONS.STAFF_VIEW).toBe("staff.view");
      expect(PERMISSIONS.STAFF_CREATE).toBe("staff.create");
      expect(PERMISSIONS.STAFF_UPDATE).toBe("staff.update");
      expect(PERMISSIONS.STAFF_ASSIGN_ROLES).toBe("staff.assign_roles");
    });

    it("defines all nine granular staff permissions", () => {
      expect(PERMISSIONS.STAFF_STATUS_MANAGE).toBe("staff.status.manage");
      expect(PERMISSIONS.STAFF_ASSIGNMENTS_MANAGE).toBe("staff.assignments.manage");
      expect(PERMISSIONS.STAFF_TRAINING_VIEW).toBe("staff.training.view");
      expect(PERMISSIONS.STAFF_TRAINING_MANAGE).toBe("staff.training.manage");
      expect(PERMISSIONS.STAFF_QUALIFICATIONS_VIEW).toBe("staff.qualifications.view");
      expect(PERMISSIONS.STAFF_QUALIFICATIONS_MANAGE).toBe("staff.qualifications.manage");
      expect(PERMISSIONS.STAFF_DOCUMENTS_VIEW).toBe("staff.documents.view");
      expect(PERMISSIONS.STAFF_DOCUMENTS_MANAGE).toBe("staff.documents.manage");
      expect(PERMISSIONS.STAFF_EMERGENCY_VIEW).toBe("staff.emergency.view");
    });
  });

  describe("Role-Permission Mappings", () => {
    it("CENTRE_MANAGER has all thirteen staff permissions", () => {
      const perms = ROLE_PERMISSIONS.CENTRE_MANAGER;
      for (const p of [
        "staff.view",
        "staff.create",
        "staff.update",
        "staff.assign_roles",
        "staff.status.manage",
        "staff.assignments.manage",
        "staff.training.view",
        "staff.training.manage",
        "staff.qualifications.view",
        "staff.qualifications.manage",
        "staff.documents.view",
        "staff.documents.manage",
        "staff.emergency.view",
      ]) {
        expect(perms).toContain(p);
      }
    });

    it("SOCIAL_WORKER is view-only for staff", () => {
      const perms = ROLE_PERMISSIONS.SOCIAL_WORKER;
      expect(perms).toContain("staff.view");
      expect(perms).not.toContain("staff.create");
      expect(perms).not.toContain("staff.update");
      expect(perms).not.toContain("staff.status.manage");
      expect(perms).not.toContain("staff.emergency.view");
    });

    it("CAREGIVER is view-only for staff", () => {
      const perms = ROLE_PERMISSIONS.CAREGIVER;
      expect(perms).toContain("staff.view");
      expect(perms).not.toContain("staff.create");
      expect(perms).not.toContain("staff.update");
      expect(perms).not.toContain("staff.assignments.manage");
    });

    it("RECORDS_OFFICER manages records but not status, assignments or emergency", () => {
      const perms = ROLE_PERMISSIONS.RECORDS_OFFICER;
      for (const p of [
        "staff.view",
        "staff.create",
        "staff.update",
        "staff.training.view",
        "staff.training.manage",
        "staff.qualifications.view",
        "staff.qualifications.manage",
        "staff.documents.view",
        "staff.documents.manage",
      ]) {
        expect(perms).toContain(p);
      }
      expect(perms).not.toContain("staff.status.manage");
      expect(perms).not.toContain("staff.assignments.manage");
      expect(perms).not.toContain("staff.emergency.view");
    });

    it("ACCOUNTANT_BURSAR is view-only for staff", () => {
      const perms = ROLE_PERMISSIONS.ACCOUNTANT_BURSAR;
      expect(perms).toContain("staff.view");
      expect(perms).not.toContain("staff.documents.manage");
      expect(perms).not.toContain("staff.emergency.view");
      expect(perms).not.toContain("staff.training.manage");
    });
  });

  describe("Permission Count", () => {
    it("has thirteen staff permissions", () => {
      const staffPerms = Object.values(PERMISSIONS).filter((p) =>
        p.startsWith("staff."),
      );
      expect(staffPerms).toHaveLength(13);
    });
  });
});