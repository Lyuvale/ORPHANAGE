import { describe, it, expect } from "vitest";
import { PERMISSIONS, ROLE_PERMISSIONS } from "@/types/role";

describe("Education & Development Permissions", () => {
  describe("Permission Constants", () => {
    it("defines all six education permissions", () => {
      expect(PERMISSIONS.EDUCATION_VIEW).toBe("education_development.view");
      expect(PERMISSIONS.EDUCATION_EDUCATION_MANAGE).toBe(
        "education_development.education.manage",
      );
      expect(PERMISSIONS.EDUCATION_SUPPORT_NEEDS_MANAGE).toBe(
        "education_development.support_needs.manage",
      );
      expect(PERMISSIONS.EDUCATION_GOALS_MANAGE).toBe(
        "education_development.goals.manage",
      );
      expect(PERMISSIONS.EDUCATION_PROGRESS_MANAGE).toBe(
        "education_development.progress.manage",
      );
      expect(PERMISSIONS.EDUCATION_ACHIEVEMENTS_MANAGE).toBe(
        "education_development.achievements.manage",
      );
    });
  });

  describe("Role-Permission Mappings", () => {
    it("CENTRE_MANAGER has all six education permissions", () => {
      const perms = ROLE_PERMISSIONS.CENTRE_MANAGER;
      expect(perms).toContain("education_development.view");
      expect(perms).toContain("education_development.education.manage");
      expect(perms).toContain("education_development.support_needs.manage");
      expect(perms).toContain("education_development.goals.manage");
      expect(perms).toContain("education_development.progress.manage");
      expect(perms).toContain("education_development.achievements.manage");
    });

    it("SOCIAL_WORKER has all six education permissions", () => {
      const perms = ROLE_PERMISSIONS.SOCIAL_WORKER;
      expect(perms).toContain("education_development.view");
      expect(perms).toContain("education_development.education.manage");
      expect(perms).toContain("education_development.support_needs.manage");
      expect(perms).toContain("education_development.goals.manage");
      expect(perms).toContain("education_development.progress.manage");
      expect(perms).toContain("education_development.achievements.manage");
    });

    it("RECORDS_OFFICER has all six education permissions", () => {
      const perms = ROLE_PERMISSIONS.RECORDS_OFFICER;
      expect(perms).toContain("education_development.view");
      expect(perms).toContain("education_development.education.manage");
      expect(perms).toContain("education_development.support_needs.manage");
      expect(perms).toContain("education_development.goals.manage");
      expect(perms).toContain("education_development.progress.manage");
      expect(perms).toContain("education_development.achievements.manage");
    });

    it("CAREGIVER has view and progress.manage only", () => {
      const perms = ROLE_PERMISSIONS.CAREGIVER;
      expect(perms).toContain("education_development.view");
      expect(perms).toContain("education_development.progress.manage");
      expect(perms).not.toContain("education_development.education.manage");
      expect(perms).not.toContain("education_development.support_needs.manage");
      expect(perms).not.toContain("education_development.goals.manage");
      expect(perms).not.toContain("education_development.achievements.manage");
    });

    it("ACCOUNTANT_BURSAR has no education permissions", () => {
      const perms = ROLE_PERMISSIONS.ACCOUNTANT_BURSAR;
      expect(perms.some((p) => p.startsWith("education_development."))).toBe(false);
    });
  });

  describe("Permission Count", () => {
    it("has six education permissions", () => {
      const eduPerms = Object.values(PERMISSIONS).filter((p) =>
        p.startsWith("education_development."),
      );
      expect(eduPerms).toHaveLength(6);
    });
  });
});
