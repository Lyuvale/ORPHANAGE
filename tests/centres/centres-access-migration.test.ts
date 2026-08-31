import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const migrationPath = resolve(
  __dirname,
  "../../supabase/migrations/20260910000000_create_centres_access.sql",
);
const migration = readFileSync(migrationPath, "utf-8");

describe("Centres Access Migration (platform management)", () => {
  describe("Permission seeding", () => {
    it("defines centres.view permission", () => {
      expect(migration).toContain("'centres', 'view'");
    });

    it("defines centres.manage permission", () => {
      expect(migration).toContain("'centres', 'manage'");
    });

    it("uses ON CONFLICT DO NOTHING for idempotency", () => {
      expect(migration).toContain("ON CONFLICT (module, action) DO NOTHING");
    });
  });

  describe("Role grants", () => {
    it("grants centres permissions to CENTRE_MANAGER only", () => {
      expect(migration).toMatch(/CENTRE_MANAGER/);
      expect(migration).toContain("('centres', 'view'), ('centres', 'manage')");
      expect(migration).toMatch(/INSERT INTO role_permissions[\s\S]*?v_centre_manager/);
    });

    it("does not grant centres permissions to ordinary staff roles", () => {
      // The migration must only reference CENTRE_MANAGER for the grant.
      for (const role of ["SOCIAL_WORKER", "CAREGIVER", "RECORDS_OFFICER", "ACCOUNTANT_BURSAR"]) {
        expect(migration).not.toMatch(new RegExp(`v_${role.replace(/_/g, "_")}`));
      }
      expect(migration).not.toContain("RECORDS_OFFICER");
      expect(migration).not.toContain("ACCOUNTANT_BURSAR");
    });

    it("uses ON CONFLICT DO NOTHING for role_permissions", () => {
      expect(migration).toMatch(/INSERT INTO role_permissions[\s\S]*?ON CONFLICT DO NOTHING/);
    });
  });

  describe("Security model", () => {
    it("does not weaken existing RLS on centres", () => {
      // This migration only adds permissions/grants; no RLS weakening.
      expect(migration).not.toMatch(/CREATE POLICY/);
    });
  });
});
