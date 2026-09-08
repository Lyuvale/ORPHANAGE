import { describe, it, expect } from "vitest";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
} from "@/types/role";

describe("Guardians Permissions", () => {
  describe("new permissions exist", () => {
    it("has guardians.view permission", () => {
      expect(PERMISSIONS.GUARDIANS_VIEW).toBe("guardians.view");
    });

    it("has guardians.create permission", () => {
      expect(PERMISSIONS.GUARDIANS_CREATE).toBe("guardians.create");
    });

    it("has guardians.update permission", () => {
      expect(PERMISSIONS.GUARDIANS_UPDATE).toBe("guardians.update");
    });

    it("has guardians.deactivate permission", () => {
      expect(PERMISSIONS.GUARDIANS_DEACTIVATE).toBe("guardians.deactivate");
    });

    it("has guardians.relationship.manage permission", () => {
      expect(PERMISSIONS.GUARDIANS_RELATIONSHIP_MANAGE).toBe("guardians.relationship.manage");
    });

    it("has guardians.documents.view permission", () => {
      expect(PERMISSIONS.GUARDIANS_DOCUMENTS_VIEW).toBe("guardians.documents.view");
    });

    it("has guardians.documents.upload permission", () => {
      expect(PERMISSIONS.GUARDIANS_DOCUMENTS_UPLOAD).toBe("guardians.documents.upload");
    });

    it("has guardians.documents.download permission", () => {
      expect(PERMISSIONS.GUARDIANS_DOCUMENTS_DOWNLOAD).toBe("guardians.documents.download");
    });
  });

  describe("role permission assignments", () => {
    it("CENTRE_MANAGER oversees guardians but does NOT register them", () => {
      const perms = ROLE_PERMISSIONS.CENTRE_MANAGER;
      expect(perms).toContain("guardians.view");
      expect(perms).not.toContain("guardians.create");
      expect(perms).toContain("guardians.update");
      expect(perms).toContain("guardians.deactivate");
      expect(perms).toContain("guardians.relationship.manage");
      expect(perms).toContain("guardians.documents.view");
      expect(perms).toContain("guardians.documents.upload");
      expect(perms).toContain("guardians.documents.download");
    });

    it("SOCIAL_WORKER has core guardian permissions", () => {
      const perms = ROLE_PERMISSIONS.SOCIAL_WORKER;
      expect(perms).toContain("guardians.view");
      expect(perms).toContain("guardians.create");
      expect(perms).toContain("guardians.update");
      expect(perms).toContain("guardians.relationship.manage");
      expect(perms).toContain("guardians.documents.view");
      expect(perms).toContain("guardians.documents.upload");
    });

    it("SOCIAL_WORKER does not have deactivate permission", () => {
      const perms = ROLE_PERMISSIONS.SOCIAL_WORKER;
      expect(perms).not.toContain("guardians.deactivate");
    });

    it("SOCIAL_WORKER does not have documents.download", () => {
      const perms = ROLE_PERMISSIONS.SOCIAL_WORKER;
      expect(perms).not.toContain("guardians.documents.download");
    });

    it("CAREGIVER has view only", () => {
      const perms = ROLE_PERMISSIONS.CAREGIVER;
      expect(perms).toContain("guardians.view");
      expect(perms).not.toContain("guardians.create");
      expect(perms).not.toContain("guardians.update");
      expect(perms).not.toContain("guardians.deactivate");
      expect(perms).not.toContain("guardians.relationship.manage");
      expect(perms).not.toContain("guardians.documents.view");
      expect(perms).not.toContain("guardians.documents.upload");
      expect(perms).not.toContain("guardians.documents.download");
    });

    it("RECORDS_OFFICER has view, create, update, and document permissions", () => {
      const perms = ROLE_PERMISSIONS.RECORDS_OFFICER;
      expect(perms).toContain("guardians.view");
      expect(perms).toContain("guardians.create");
      expect(perms).toContain("guardians.update");
      expect(perms).toContain("guardians.documents.view");
      expect(perms).toContain("guardians.documents.upload");
      expect(perms).toContain("guardians.documents.download");
    });

    it("RECORDS_OFFICER links guardians during official registration", () => {
      const perms = ROLE_PERMISSIONS.RECORDS_OFFICER;
      expect(perms).toContain("guardians.relationship.manage");
    });

    it("RECORDS_OFFICER does not have deactivate", () => {
      const perms = ROLE_PERMISSIONS.RECORDS_OFFICER;
      expect(perms).not.toContain("guardians.deactivate");
    });

    it("ACCOUNTANT_BURSAR has view only", () => {
      const perms = ROLE_PERMISSIONS.ACCOUNTANT_BURSAR;
      expect(perms).toContain("guardians.view");
      expect(perms).not.toContain("guardians.create");
      expect(perms).not.toContain("guardians.update");
      expect(perms).not.toContain("guardians.deactivate");
      expect(perms).not.toContain("guardians.relationship.manage");
      expect(perms).not.toContain("guardians.documents.view");
      expect(perms).not.toContain("guardians.documents.upload");
      expect(perms).not.toContain("guardians.documents.download");
    });
  });

  describe("ALL_PERMISSIONS includes new permissions", () => {
    it("includes all guardian permissions in ALL_PERMISSIONS array", () => {
      expect(ALL_PERMISSIONS).toContain("guardians.view");
      expect(ALL_PERMISSIONS).toContain("guardians.create");
      expect(ALL_PERMISSIONS).toContain("guardians.update");
      expect(ALL_PERMISSIONS).toContain("guardians.deactivate");
      expect(ALL_PERMISSIONS).toContain("guardians.relationship.manage");
      expect(ALL_PERMISSIONS).toContain("guardians.documents.view");
      expect(ALL_PERMISSIONS).toContain("guardians.documents.upload");
      expect(ALL_PERMISSIONS).toContain("guardians.documents.download");
    });
  });
});
