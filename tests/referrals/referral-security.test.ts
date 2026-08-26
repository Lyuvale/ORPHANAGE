import { describe, it, expect } from "vitest";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
} from "@/types/role";

describe("Referrals, Admissions & Placements Permissions", () => {
  describe("new permissions exist", () => {
    it("has referrals.review permission", () => {
      expect(PERMISSIONS.REFERRALS_REVIEW).toBe("referrals.review");
    });

    it("has referrals.approve permission", () => {
      expect(PERMISSIONS.REFERRALS_APPROVE).toBe("referrals.approve");
    });

    it("has referrals.reject permission", () => {
      expect(PERMISSIONS.REFERRALS_REJECT).toBe("referrals.reject");
    });

    it("has admissions.view permission", () => {
      expect(PERMISSIONS.ADMISSIONS_VIEW).toBe("admissions.view");
    });

    it("has admissions.create permission", () => {
      expect(PERMISSIONS.ADMISSIONS_CREATE).toBe("admissions.create");
    });

    it("has admissions.review permission", () => {
      expect(PERMISSIONS.ADMISSIONS_REVIEW).toBe("admissions.review");
    });

    it("has placements.view permission", () => {
      expect(PERMISSIONS.PLACEMENTS_VIEW).toBe("placements.view");
    });

    it("has placements.create permission", () => {
      expect(PERMISSIONS.PLACEMENTS_CREATE).toBe("placements.create");
    });

    it("has placements.update permission", () => {
      expect(PERMISSIONS.PLACEMENTS_UPDATE).toBe("placements.update");
    });
  });

  describe("role permission assignments", () => {
    it("CENTRE_MANAGER has all referral permissions", () => {
      const perms = ROLE_PERMISSIONS.CENTRE_MANAGER;
      expect(perms).toContain("referrals.view");
      expect(perms).toContain("referrals.create");
      expect(perms).toContain("referrals.update");
      expect(perms).toContain("referrals.review");
      expect(perms).toContain("referrals.approve");
      expect(perms).toContain("referrals.reject");
    });

    it("CENTRE_MANAGER has all admission permissions", () => {
      const perms = ROLE_PERMISSIONS.CENTRE_MANAGER;
      expect(perms).toContain("admissions.view");
      expect(perms).toContain("admissions.create");
      expect(perms).toContain("admissions.review");
    });

    it("CENTRE_MANAGER has all placement permissions", () => {
      const perms = ROLE_PERMISSIONS.CENTRE_MANAGER;
      expect(perms).toContain("placements.view");
      expect(perms).toContain("placements.create");
      expect(perms).toContain("placements.update");
    });

    it("SOCIAL_WORKER has referral review permissions", () => {
      const perms = ROLE_PERMISSIONS.SOCIAL_WORKER;
      expect(perms).toContain("referrals.view");
      expect(perms).toContain("referrals.create");
      expect(perms).toContain("referrals.update");
      expect(perms).toContain("referrals.review");
      expect(perms).toContain("referrals.approve");
      expect(perms).toContain("referrals.reject");
    });

    it("SOCIAL_WORKER has admission permissions", () => {
      const perms = ROLE_PERMISSIONS.SOCIAL_WORKER;
      expect(perms).toContain("admissions.view");
      expect(perms).toContain("admissions.create");
      expect(perms).toContain("admissions.review");
    });

    it("SOCIAL_WORKER has placement permissions", () => {
      const perms = ROLE_PERMISSIONS.SOCIAL_WORKER;
      expect(perms).toContain("placements.view");
      expect(perms).toContain("placements.create");
      expect(perms).toContain("placements.update");
    });

    it("CAREGIVER has placements.view only", () => {
      const perms = ROLE_PERMISSIONS.CAREGIVER;
      expect(perms).toContain("placements.view");
      expect(perms).not.toContain("placements.create");
      expect(perms).not.toContain("placements.update");
    });

    it("RECORDS_OFFICER has admission and placement view permissions", () => {
      const perms = ROLE_PERMISSIONS.RECORDS_OFFICER;
      expect(perms).toContain("admissions.view");
      expect(perms).toContain("placements.view");
      expect(perms).toContain("placements.create");
      expect(perms).toContain("placements.update");
    });

    it("ACCOUNTANT_BURSAR has no referral/admission/placement permissions", () => {
      const perms = ROLE_PERMISSIONS.ACCOUNTANT_BURSAR;
      expect(perms).not.toContain("referrals.view");
      expect(perms).not.toContain("admissions.view");
      expect(perms).not.toContain("placements.view");
    });
  });

  describe("ALL_PERMISSIONS includes new permissions", () => {
    it("includes all new permissions in ALL_PERMISSIONS array", () => {
      expect(ALL_PERMISSIONS).toContain("referrals.review");
      expect(ALL_PERMISSIONS).toContain("referrals.approve");
      expect(ALL_PERMISSIONS).toContain("referrals.reject");
      expect(ALL_PERMISSIONS).toContain("admissions.view");
      expect(ALL_PERMISSIONS).toContain("admissions.create");
      expect(ALL_PERMISSIONS).toContain("admissions.review");
      expect(ALL_PERMISSIONS).toContain("placements.view");
      expect(ALL_PERMISSIONS).toContain("placements.create");
      expect(ALL_PERMISSIONS).toContain("placements.update");
    });
  });
});
