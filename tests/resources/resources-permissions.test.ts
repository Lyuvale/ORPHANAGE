import { describe, it, expect } from "vitest";
import { PERMISSIONS, ROLE_PERMISSIONS } from "@/types/role";

const RESOURCES_PERMS = [
  "resources.view",
  "resources.manage",
  "resources.approve",
  "resources.reports",
  "resources.documents.view",
  "resources.documents.upload",
  "resources.documents.download",
];

describe("Resources & Support Permissions", () => {
  describe("permission constants", () => {
    it("defines all seven granular resources permissions", () => {
      expect(PERMISSIONS.RESOURCES_VIEW).toBe("resources.view");
      expect(PERMISSIONS.RESOURCES_MANAGE).toBe("resources.manage");
      expect(PERMISSIONS.RESOURCES_APPROVE).toBe("resources.approve");
      expect(PERMISSIONS.RESOURCES_REPORTS).toBe("resources.reports");
      expect(PERMISSIONS.RESOURCES_DOCUMENTS_VIEW).toBe("resources.documents.view");
      expect(PERMISSIONS.RESOURCES_DOCUMENTS_UPLOAD).toBe("resources.documents.upload");
      expect(PERMISSIONS.RESOURCES_DOCUMENTS_DOWNLOAD).toBe("resources.documents.download");
    });
  });

  describe("role mappings", () => {
    it("CENTRE_MANAGER views/approves resources without routinely creating them", () => {
      const perms = ROLE_PERMISSIONS.CENTRE_MANAGER;
      expect(perms).toContain("resources.view");
      expect(perms).toContain("resources.approve");
      expect(perms).toContain("resources.reports");
      expect(perms).not.toContain("resources.manage");
    });

    it("ACCOUNTANT_BURSAR has full resources access (authorised records + approval)", () => {
      const perms = ROLE_PERMISSIONS.ACCOUNTANT_BURSAR;
      for (const p of RESOURCES_PERMS) expect(perms).toContain(p);
    });

    it("SOCIAL_WORKER is view-only (authorised child-benefit info)", () => {
      const perms = ROLE_PERMISSIONS.SOCIAL_WORKER;
      expect(perms).toContain("resources.view");
      expect(perms).not.toContain("resources.manage");
      expect(perms).not.toContain("resources.approve");
      expect(perms).not.toContain("resources.reports");
    });

    it("RECORDS_OFFICER is view-only (no financial management)", () => {
      const perms = ROLE_PERMISSIONS.RECORDS_OFFICER;
      expect(perms).toContain("resources.view");
      expect(perms).not.toContain("resources.manage");
      expect(perms).not.toContain("resources.approve");
      expect(perms).not.toContain("resources.documents.upload");
    });

    it("CAREGIVER has no general financial access to resources", () => {
      const perms = ROLE_PERMISSIONS.CAREGIVER;
      for (const p of RESOURCES_PERMS) expect(perms).not.toContain(p);
    });
  });
});
