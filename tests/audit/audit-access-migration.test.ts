import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const migrationPath = resolve(
  __dirname,
  "../../supabase/migrations/20260909000000_create_audit_access.sql",
);
const migration = readFileSync(migrationPath, "utf-8");

describe("Audit Access Migration", () => {
  describe("Permission seeding", () => {
    it("defines audit.view permission", () => {
      expect(migration).toMatch(/audit.*\s*view/);
      expect(migration).toContain("'audit', 'view'");
    });

    it("defines audit.export permission", () => {
      expect(migration).toContain("'audit', 'export'");
    });

    it("uses ON CONFLICT DO NOTHING for idempotency", () => {
      expect(migration).toContain("ON CONFLICT (module, action) DO NOTHING");
    });
  });

  describe("Role grants", () => {
    it("grants audit permissions to CENTRE_MANAGER", () => {
      expect(migration).toMatch(/CENTRE_MANAGER/);
      expect(migration).toContain("('audit', 'view'), ('audit', 'export')");
      expect(migration).toMatch(/INSERT INTO role_permissions[\s\S]*?v_centre_manager/);
    });

    it("grants audit permissions to RECORDS_OFFICER", () => {
      expect(migration).toMatch(/RECORDS_OFFICER/);
      expect(migration).toMatch(/INSERT INTO role_permissions[\s\S]*?v_records_officer/);
    });

    it("uses ON CONFLICT DO NOTHING for role_permissions", () => {
      expect(migration).toMatch(/INSERT INTO role_permissions[\s\S]*?ON CONFLICT DO NOTHING/);
    });
  });

  describe("Security model", () => {
    it("does not weaken the append-only audit RLS (no new DDL on audit_logs)", () => {
      // This migration only adds permissions; it must not touch RLS policies.
      expect(migration).not.toMatch(/ALTER TABLE audit_logs/);
      expect(migration).not.toMatch(/CREATE POLICY/);
    });
  });
});
