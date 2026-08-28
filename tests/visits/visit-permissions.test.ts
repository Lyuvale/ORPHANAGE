import { describe, it, expect } from "vitest";
import { PERMISSIONS, ROLE_PERMISSIONS } from "@/types/role";

describe("Visit Permissions", () => {
  describe("Permission Constants", () => {
    it("defines visits.view permission", () => {
      expect(PERMISSIONS.VISITS_VIEW).toBe("visits.view");
    });

    it("defines visits.create permission", () => {
      expect(PERMISSIONS.VISITS_CREATE).toBe("visits.create");
    });

    it("defines visits.update permission", () => {
      expect(PERMISSIONS.VISITS_UPDATE).toBe("visits.update");
    });

    it("defines visits.request permission", () => {
      expect(PERMISSIONS.VISITS_REQUEST).toBe("visits.request");
    });

    it("defines visits.approve permission", () => {
      expect(PERMISSIONS.VISITS_APPROVE).toBe("visits.approve");
    });

    it("defines visits.reject permission", () => {
      expect(PERMISSIONS.VISITS_REJECT).toBe("visits.reject");
    });

    it("defines visits.checkin permission", () => {
      expect(PERMISSIONS.VISITS_CHECKIN).toBe("visits.checkin");
    });

    it("defines visits.checkout permission", () => {
      expect(PERMISSIONS.VISITS_CHECKOUT).toBe("visits.checkout");
    });

    it("defines visits.complete permission", () => {
      expect(PERMISSIONS.VISITS_COMPLETE).toBe("visits.complete");
    });

    it("defines visits.cancel permission", () => {
      expect(PERMISSIONS.VISITS_CANCEL).toBe("visits.cancel");
    });

    it("defines visits.restrictions.view permission", () => {
      expect(PERMISSIONS.VISITS_RESTRICTIONS_VIEW).toBe("visits.restrictions.view");
    });

    it("defines visits.restrictions.manage permission", () => {
      expect(PERMISSIONS.VISITS_RESTRICTIONS_MANAGE).toBe("visits.restrictions.manage");
    });

    it("defines visits.contact_attempts.view permission", () => {
      expect(PERMISSIONS.VISITS_CONTACT_ATTEMPTS_VIEW).toBe("visits.contact_attempts.view");
    });

    it("defines visits.contact_attempts.create permission", () => {
      expect(PERMISSIONS.VISITS_CONTACT_ATTEMPTS_CREATE).toBe("visits.contact_attempts.create");
    });
  });

  describe("Role Permission Assignments", () => {
    it("CENTRE_MANAGER has all visit permissions", () => {
      const mgrPerms = ROLE_PERMISSIONS.CENTRE_MANAGER;
      expect(mgrPerms).toContain("visits.view");
      expect(mgrPerms).toContain("visits.create");
      expect(mgrPerms).toContain("visits.update");
      expect(mgrPerms).toContain("visits.request");
      expect(mgrPerms).toContain("visits.approve");
      expect(mgrPerms).toContain("visits.reject");
      expect(mgrPerms).toContain("visits.checkin");
      expect(mgrPerms).toContain("visits.checkout");
      expect(mgrPerms).toContain("visits.complete");
      expect(mgrPerms).toContain("visits.cancel");
      expect(mgrPerms).toContain("visits.restrictions.view");
      expect(mgrPerms).toContain("visits.restrictions.manage");
      expect(mgrPerms).toContain("visits.contact_attempts.view");
      expect(mgrPerms).toContain("visits.contact_attempts.create");
    });

    it("SOCIAL_WORKER has all visit permissions", () => {
      const swPerms = ROLE_PERMISSIONS.SOCIAL_WORKER;
      expect(swPerms).toContain("visits.view");
      expect(swPerms).toContain("visits.create");
      expect(swPerms).toContain("visits.update");
      expect(swPerms).toContain("visits.request");
      expect(swPerms).toContain("visits.approve");
      expect(swPerms).toContain("visits.reject");
      expect(swPerms).toContain("visits.checkin");
      expect(swPerms).toContain("visits.checkout");
      expect(swPerms).toContain("visits.complete");
      expect(swPerms).toContain("visits.cancel");
      expect(swPerms).toContain("visits.restrictions.view");
      expect(swPerms).toContain("visits.restrictions.manage");
      expect(swPerms).toContain("visits.contact_attempts.view");
      expect(swPerms).toContain("visits.contact_attempts.create");
    });

    it("CAREGIVER has limited visit permissions", () => {
      const cgPerms = ROLE_PERMISSIONS.CAREGIVER;
      expect(cgPerms).toContain("visits.view");
      expect(cgPerms).toContain("visits.checkin");
      expect(cgPerms).toContain("visits.checkout");
    });

    it("CAREGIVER does NOT have approve/manage permissions", () => {
      const cgPerms = ROLE_PERMISSIONS.CAREGIVER;
      expect(cgPerms).not.toContain("visits.approve");
      expect(cgPerms).not.toContain("visits.reject");
      expect(cgPerms).not.toContain("visits.restrictions.manage");
      expect(cgPerms).not.toContain("visits.cancel");
      expect(cgPerms).not.toContain("visits.create");
      expect(cgPerms).not.toContain("visits.update");
    });

    it("RECORDS_OFFICER has view and restrictions.view", () => {
      const roPerms = ROLE_PERMISSIONS.RECORDS_OFFICER;
      expect(roPerms).toContain("visits.view");
      expect(roPerms).toContain("visits.restrictions.view");
      expect(roPerms).toContain("visits.contact_attempts.view");
    });

    it("RECORDS_OFFICER does NOT have create/approve/checkin", () => {
      const roPerms = ROLE_PERMISSIONS.RECORDS_OFFICER;
      expect(roPerms).not.toContain("visits.create");
      expect(roPerms).not.toContain("visits.approve");
      expect(roPerms).not.toContain("visits.checkin");
      expect(roPerms).not.toContain("visits.checkout");
    });

    it("ACCOUNTANT_BURSAR has NO visit permissions", () => {
      const accPerms = ROLE_PERMISSIONS.ACCOUNTANT_BURSAR;
      const visitPerms = accPerms.filter((p) => p.startsWith("visits."));
      expect(visitPerms).toHaveLength(0);
    });
  });

  describe("Permission Count", () => {
    it("has exactly 14 visit permissions", () => {
      const visitPerms = Object.values(PERMISSIONS).filter(
        (p) => p.startsWith("visits."),
      );
      expect(visitPerms).toHaveLength(14);
    });
  });
});
