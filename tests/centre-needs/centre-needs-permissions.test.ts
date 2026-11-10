import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PERMISSIONS, ROLE_PERMISSIONS } from "@/types/role";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20261109000000_create_centre_needs.sql"),
  "utf-8",
);

describe("Centre Needs Permissions", () => {
  describe("Permission constants", () => {
    it("defines site.needs.view", () => {
      expect(PERMISSIONS.SITE_NEEDS_VIEW).toBe("site.needs.view");
    });

    it("defines site.needs.manage", () => {
      expect(PERMISSIONS.SITE_NEEDS_MANAGE).toBe("site.needs.manage");
    });
  });

  describe("Role mappings", () => {
    it("CENTRE_MANAGER can view and manage needs", () => {
      expect(ROLE_PERMISSIONS.CENTRE_MANAGER).toContain("site.needs.view");
      expect(ROLE_PERMISSIONS.CENTRE_MANAGER).toContain("site.needs.manage");
    });

    it("CENTRE_IT can view and manage needs", () => {
      expect(ROLE_PERMISSIONS.CENTRE_IT).toContain("site.needs.view");
      expect(ROLE_PERMISSIONS.CENTRE_IT).toContain("site.needs.manage");
    });

    it("ACCOUNTANT_BURSAR can view needs and reach /centre-site", () => {
      expect(ROLE_PERMISSIONS.ACCOUNTANT_BURSAR).toContain("site.view");
      expect(ROLE_PERMISSIONS.ACCOUNTANT_BURSAR).toContain("site.needs.view");
      expect(ROLE_PERMISSIONS.ACCOUNTANT_BURSAR).not.toContain(
        "site.needs.manage",
      );
    });

    it("other centre roles do not manage needs", () => {
      for (const role of [
        "SOCIAL_WORKER",
        "CAREGIVER",
        "RECORDS_OFFICER",
      ] as const) {
        expect(ROLE_PERMISSIONS[role]).not.toContain("site.needs.manage");
      }
    });
  });

  describe("Migration seed", () => {
    it("only references the confirmed role codes", () => {
      expect(migration).toContain("CENTRE_MANAGER");
      expect(migration).toContain("CENTRE_IT");
      expect(migration).toContain("ACCOUNTANT_BURSAR");
    });

    it("does not grant manage to ACCOUNTANT_BURSAR", () => {
      const accountantBlock = migration
        .split("ACCOUNTANT_BURSAR")[1]
        ?.split("ON CONFLICT DO NOTHING;")[0];
      expect(accountantBlock).toBeDefined();
      expect(accountantBlock).not.toContain("'needs.manage'");
    });
  });
});
