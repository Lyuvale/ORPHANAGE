import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const migrationPath = resolve(
  __dirname,
  "../../supabase/migrations/20260827000001_create_audit_log.sql",
);
const migration = readFileSync(migrationPath, "utf-8");

describe("Audit Log Migration", () => {
  describe("Table structure", () => {
    it("creates the audit_logs table", () => {
      expect(migration).toContain("CREATE TABLE audit_logs");
    });

    it("has centre_id column referencing centres", () => {
      expect(migration).toMatch(/centre_id\s+UUID NOT NULL REFERENCES centres\(id\)/);
    });

    it("has actor_user_id column referencing auth.users", () => {
      expect(migration).toMatch(/actor_user_id\s+UUID REFERENCES auth\.users\(id\)/);
    });

    it("has actor_email column", () => {
      expect(migration).toContain("actor_email");
    });

    it("has action column", () => {
      expect(migration).toMatch(/action\s+TEXT NOT NULL/);
    });

    it("has entity_type column", () => {
      expect(migration).toMatch(/entity_type\s+TEXT NOT NULL/);
    });

    it("has entity_id column", () => {
      expect(migration).toContain("entity_id");
    });

    it("has previous_values as JSONB", () => {
      expect(migration).toContain("previous_values JSONB");
    });

    it("has new_values as JSONB", () => {
      expect(migration).toMatch(/new_values\s+JSONB/);
    });

    it("has metadata as JSONB", () => {
      expect(migration).toMatch(/metadata\s+JSONB/);
    });

    it("has created_at with DEFAULT now()", () => {
      expect(migration).toMatch(/created_at\s+TIMESTAMPTZ NOT NULL DEFAULT now\(\)/);
    });
  });

  describe("Indexes", () => {
    it("indexes centre_id", () => {
      expect(migration).toContain("CREATE INDEX idx_audit_logs_centre_id");
    });

    it("indexes actor_user_id", () => {
      expect(migration).toContain("CREATE INDEX idx_audit_logs_actor_user_id");
    });

    it("indexes entity_type", () => {
      expect(migration).toContain("CREATE INDEX idx_audit_logs_entity_type");
    });

    it("indexes entity_id", () => {
      expect(migration).toContain("CREATE INDEX idx_audit_logs_entity_id");
    });

    it("indexes action", () => {
      expect(migration).toContain("CREATE INDEX idx_audit_logs_action");
    });

    it("indexes created_at", () => {
      expect(migration).toContain("CREATE INDEX idx_audit_logs_created_at");
    });
  });

  describe("RLS", () => {
    it("enables RLS on audit_logs", () => {
      expect(migration).toContain("ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY");
    });

    it("allows centre-scoped SELECT for authenticated", () => {
      expect(migration).toContain("audit_logs_select_centre");
      expect(migration).toContain("TO authenticated");
    });

    it("uses auth.current_centre_id() for SELECT policy", () => {
      expect(migration).toMatch(/centre_id = auth\.current_centre_id\(\)/);
    });

    it("allows inserts only via service_role", () => {
      expect(migration).toContain("audit_logs_insert_admin");
      expect(migration).toContain("TO service_role");
    });

    it("denies updates even via service_role (append-only)", () => {
      expect(migration).toMatch(/audit_logs_update_admin[\s\S]*?WITH CHECK \(false\)/);
    });

    it("denies deletes even via service_role", () => {
      expect(migration).toMatch(/audit_logs_delete_admin[\s\S]*?USING \(false\)/);
    });

    it("explicitly denies authenticated INSERT as defense in depth", () => {
      expect(migration).toContain("audit_logs_deny_authenticated_insert");
    });

    it("explicitly denies authenticated UPDATE as defense in depth", () => {
      expect(migration).toContain("audit_logs_deny_authenticated_update");
    });

    it("explicitly denies authenticated DELETE as defense in depth", () => {
      expect(migration).toContain("audit_logs_deny_authenticated_delete");
    });
  });

  describe("Security properties", () => {
    it("does not store passwords or tokens", () => {
      expect(migration.toLowerCase()).not.toContain("password");
      expect(migration.toLowerCase()).not.toContain("token");
      expect(migration.toLowerCase()).not.toContain("secret");
    });

    it("uses server-controlled timestamps (DEFAULT now())", () => {
      expect(migration).toMatch(/DEFAULT now\(\)/);
    });

    it("centre_id is NOT NULL (mandatory for tenant isolation)", () => {
      expect(migration).toMatch(/centre_id\s+UUID NOT NULL/);
    });
  });
});
