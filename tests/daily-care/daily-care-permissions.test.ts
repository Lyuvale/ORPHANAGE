import { describe, it, expect } from "vitest";
import { PERMISSIONS, ROLE_PERMISSIONS } from "@/types/role";

describe("Daily Care Permissions", () => {
  describe("Daily Care Permission Constants", () => {
    it("defines daily_care.view permission", () => {
      expect(PERMISSIONS.DAILY_CARE_VIEW).toBe("daily_care.view");
    });

    it("defines daily_care.create permission", () => {
      expect(PERMISSIONS.DAILY_CARE_CREATE).toBe("daily_care.create");
    });

    it("defines daily_care.update permission", () => {
      expect(PERMISSIONS.DAILY_CARE_UPDATE).toBe("daily_care.update");
    });

    it("defines daily_care.check_in permission", () => {
      expect(PERMISSIONS.DAILY_CARE_CHECK_IN).toBe("daily_care.check_in");
    });

    it("defines daily_care.check_out permission", () => {
      expect(PERMISSIONS.DAILY_CARE_CHECK_OUT).toBe("daily_care.check_out");
    });

    it("defines daily_care.notes.create permission", () => {
      expect(PERMISSIONS.DAILY_CARE_NOTES_CREATE).toBe("daily_care.notes.create");
    });

    it("defines daily_care.notes.amend permission", () => {
      expect(PERMISSIONS.DAILY_CARE_NOTES_AMEND).toBe("daily_care.notes.amend");
    });

    it("defines daily_care.meals.create permission", () => {
      expect(PERMISSIONS.DAILY_CARE_MEALS_CREATE).toBe("daily_care.meals.create");
    });

    it("defines daily_care.followups.create permission", () => {
      expect(PERMISSIONS.DAILY_CARE_FOLLOWUPS_CREATE).toBe("daily_care.followups.create");
    });

    it("defines daily_care.followups.update permission", () => {
      expect(PERMISSIONS.DAILY_CARE_FOLLOWUPS_UPDATE).toBe("daily_care.followups.update");
    });
  });

  describe("Presence Permission Constants", () => {
    it("defines presence.view permission", () => {
      expect(PERMISSIONS.PRESENCE_VIEW).toBe("presence.view");
    });

    it("defines presence.create permission", () => {
      expect(PERMISSIONS.PRESENCE_CREATE).toBe("presence.create");
    });

    it("defines presence.update permission", () => {
      expect(PERMISSIONS.PRESENCE_UPDATE).toBe("presence.update");
    });

    it("defines presence.check_in permission", () => {
      expect(PERMISSIONS.PRESENCE_CHECK_IN).toBe("presence.check_in");
    });

    it("defines presence.check_out permission", () => {
      expect(PERMISSIONS.PRESENCE_CHECK_OUT).toBe("presence.check_out");
    });

    it("defines presence.off_site permission", () => {
      expect(PERMISSIONS.PRESENCE_OFF_SITE).toBe("presence.off_site");
    });

    it("defines presence.daily_summary permission", () => {
      expect(PERMISSIONS.PRESENCE_DAILY_SUMMARY).toBe("presence.daily_summary");
    });
  });

  describe("Role Permission Assignments", () => {
    it("CENTRE_MANAGER has all daily_care permissions", () => {
      const mgrPerms = ROLE_PERMISSIONS.CENTRE_MANAGER;
      expect(mgrPerms).toContain("daily_care.view");
      expect(mgrPerms).toContain("daily_care.create");
      expect(mgrPerms).toContain("daily_care.update");
      expect(mgrPerms).toContain("daily_care.check_in");
      expect(mgrPerms).toContain("daily_care.check_out");
      expect(mgrPerms).toContain("daily_care.notes.create");
      expect(mgrPerms).toContain("daily_care.notes.amend");
      expect(mgrPerms).toContain("daily_care.meals.create");
      expect(mgrPerms).toContain("daily_care.followups.create");
      expect(mgrPerms).toContain("daily_care.followups.update");
    });

    it("CENTRE_MANAGER has all presence permissions", () => {
      const mgrPerms = ROLE_PERMISSIONS.CENTRE_MANAGER;
      expect(mgrPerms).toContain("presence.view");
      expect(mgrPerms).toContain("presence.create");
      expect(mgrPerms).toContain("presence.update");
      expect(mgrPerms).toContain("presence.check_in");
      expect(mgrPerms).toContain("presence.check_out");
      expect(mgrPerms).toContain("presence.off_site");
      expect(mgrPerms).toContain("presence.daily_summary");
    });

    it("SOCIAL_WORKER has all daily_care and presence permissions", () => {
      const swPerms = ROLE_PERMISSIONS.SOCIAL_WORKER;
      expect(swPerms).toContain("daily_care.view");
      expect(swPerms).toContain("daily_care.create");
      expect(swPerms).toContain("daily_care.update");
      expect(swPerms).toContain("daily_care.check_in");
      expect(swPerms).toContain("daily_care.check_out");
      expect(swPerms).toContain("daily_care.notes.create");
      expect(swPerms).toContain("daily_care.notes.amend");
      expect(swPerms).toContain("daily_care.meals.create");
      expect(swPerms).toContain("daily_care.followups.create");
      expect(swPerms).toContain("daily_care.followups.update");
      expect(swPerms).toContain("presence.view");
      expect(swPerms).toContain("presence.create");
      expect(swPerms).toContain("presence.update");
      expect(swPerms).toContain("presence.check_in");
      expect(swPerms).toContain("presence.check_out");
      expect(swPerms).toContain("presence.off_site");
      expect(swPerms).toContain("presence.daily_summary");
    });

    it("CAREGIVER has limited daily_care permissions", () => {
      const cgPerms = ROLE_PERMISSIONS.CAREGIVER;
      expect(cgPerms).toContain("daily_care.view");
      expect(cgPerms).toContain("daily_care.update");
      expect(cgPerms).toContain("daily_care.check_in");
      expect(cgPerms).toContain("daily_care.check_out");
      expect(cgPerms).toContain("daily_care.notes.create");
      expect(cgPerms).toContain("daily_care.meals.create");
    });

    it("CAREGIVER has limited presence permissions", () => {
      const cgPerms = ROLE_PERMISSIONS.CAREGIVER;
      expect(cgPerms).toContain("presence.view");
      expect(cgPerms).toContain("presence.create");
      expect(cgPerms).toContain("presence.check_in");
      expect(cgPerms).toContain("presence.check_out");
    });

    it("CAREGIVER does NOT have followup or notes.amend permissions", () => {
      const cgPerms = ROLE_PERMISSIONS.CAREGIVER;
      expect(cgPerms).not.toContain("daily_care.notes.amend");
      expect(cgPerms).not.toContain("daily_care.followups.create");
      expect(cgPerms).not.toContain("daily_care.followups.update");
      expect(cgPerms).not.toContain("presence.off_site");
      expect(cgPerms).not.toContain("presence.daily_summary");
    });

    it("RECORDS_OFFICER has view-only daily_care and presence permissions", () => {
      const roPerms = ROLE_PERMISSIONS.RECORDS_OFFICER;
      expect(roPerms).toContain("daily_care.view");
      expect(roPerms).toContain("presence.view");
    });

    it("RECORDS_OFFICER does NOT have create/update/check permissions", () => {
      const roPerms = ROLE_PERMISSIONS.RECORDS_OFFICER;
      expect(roPerms).not.toContain("daily_care.create");
      expect(roPerms).not.toContain("daily_care.update");
      expect(roPerms).not.toContain("daily_care.check_in");
      expect(roPerms).not.toContain("daily_care.check_out");
      expect(roPerms).not.toContain("daily_care.notes.create");
      expect(roPerms).not.toContain("daily_care.notes.amend");
      expect(roPerms).not.toContain("daily_care.meals.create");
      expect(roPerms).not.toContain("daily_care.followups.create");
      expect(roPerms).not.toContain("daily_care.followups.update");
      expect(roPerms).not.toContain("presence.create");
      expect(roPerms).not.toContain("presence.update");
      expect(roPerms).not.toContain("presence.check_in");
      expect(roPerms).not.toContain("presence.check_out");
      expect(roPerms).not.toContain("presence.off_site");
      expect(roPerms).not.toContain("presence.daily_summary");
    });

    it("ACCOUNTANT_BURSAR has NO daily_care or presence permissions", () => {
      const accPerms = ROLE_PERMISSIONS.ACCOUNTANT_BURSAR;
      const dailyCarePerms = accPerms.filter((p) => p.startsWith("daily_care."));
      const presencePerms = accPerms.filter((p) => p.startsWith("presence."));
      expect(dailyCarePerms).toHaveLength(0);
      expect(presencePerms).toHaveLength(0);
    });
  });

  describe("Permission Count", () => {
    it("has exactly 17 daily_care and presence permissions combined", () => {
      const dailyCarePerms = Object.values(PERMISSIONS).filter(
        (p) => p.startsWith("daily_care.") || p.startsWith("presence."),
      );
      expect(dailyCarePerms).toHaveLength(17);
    });

    it("has exactly 10 daily_care permissions", () => {
      const dailyCarePerms = Object.values(PERMISSIONS).filter(
        (p) => p.startsWith("daily_care."),
      );
      expect(dailyCarePerms).toHaveLength(10);
    });

    it("has exactly 7 presence permissions", () => {
      const presencePerms = Object.values(PERMISSIONS).filter(
        (p) => p.startsWith("presence."),
      );
      expect(presencePerms).toHaveLength(7);
    });
  });
});
