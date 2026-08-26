import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const migrationPath = resolve(
  __dirname,
  "../../supabase/migrations/20260827000000_create_roles_permissions.sql",
);
const migration = readFileSync(migrationPath, "utf-8");

describe("Roles & Permissions Migration", () => {
  describe("Tables created", () => {
    it("creates the roles table", () => {
      expect(migration).toContain("CREATE TABLE roles");
    });

    it("creates the permissions table", () => {
      expect(migration).toContain("CREATE TABLE permissions");
    });

    it("creates the role_permissions table", () => {
      expect(migration).toContain("CREATE TABLE role_permissions");
    });

    it("creates the user_roles table", () => {
      expect(migration).toContain("CREATE TABLE user_roles");
    });

    it("creates the role_history table", () => {
      expect(migration).toContain("CREATE TABLE role_history");
    });
  });

  describe("Constraints", () => {
    it("roles.name has UNIQUE constraint", () => {
      expect(migration).toMatch(/CREATE TABLE roles[\s\S]*?name\s+TEXT NOT NULL UNIQUE/);
    });

    it("permissions has UNIQUE constraint on (module, action)", () => {
      expect(migration).toContain("UNIQUE (module, action)");
    });

    it("role_permissions has composite primary key", () => {
      expect(migration).toContain("PRIMARY KEY (role_id, permission_id)");
    });

    it("user_roles has UNIQUE constraint on (user_id, role_id, centre_id)", () => {
      expect(migration).toContain("UNIQUE (user_id, role_id, centre_id)");
    });

    it("user_roles enforces status CHECK constraint", () => {
      expect(migration).toContain("CHECK (status IN ('active', 'revoked'))");
    });
  });

  describe("Foreign keys", () => {
    it("user_roles.user_id references user_profiles", () => {
      expect(migration).toMatch(/user_id\s+UUID NOT NULL REFERENCES user_profiles\(id\)/);
    });

    it("user_roles.role_id references roles", () => {
      expect(migration).toMatch(/role_id\s+UUID NOT NULL REFERENCES roles\(id\)/);
    });

    it("user_roles.centre_id references centres", () => {
      expect(migration).toMatch(/centre_id\s+UUID NOT NULL REFERENCES centres\(id\)/);
    });

    it("role_permissions.role_id references roles", () => {
      expect(migration).toMatch(/role_id\s+UUID NOT NULL REFERENCES roles\(id\) ON DELETE CASCADE/);
    });

    it("role_permissions.permission_id references permissions", () => {
      expect(migration).toMatch(/permission_id\s+UUID NOT NULL REFERENCES permissions\(id\) ON DELETE CASCADE/);
    });
  });

  describe("RLS enabled", () => {
    it("enables RLS on roles", () => {
      expect(migration).toContain("ALTER TABLE roles ENABLE ROW LEVEL SECURITY");
    });

    it("enables RLS on permissions", () => {
      expect(migration).toContain(
        "ALTER TABLE permissions ENABLE ROW LEVEL SECURITY",
      );
    });

    it("enables RLS on role_permissions", () => {
      expect(migration).toContain(
        "ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY",
      );
    });

    it("enables RLS on user_roles", () => {
      expect(migration).toContain(
        "ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY",
      );
    });

    it("enables RLS on role_history", () => {
      expect(migration).toContain(
        "ALTER TABLE role_history ENABLE ROW LEVEL SECURITY",
      );
    });
  });

  describe("Seeds", () => {
    it("seeds 5 official centre roles", () => {
      expect(migration).toContain("'CENTRE_MANAGER'");
      expect(migration).toContain("'SOCIAL_WORKER'");
      expect(migration).toContain("'CAREGIVER'");
      expect(migration).toContain("'RECORDS_OFFICER'");
      expect(migration).toContain("'ACCOUNTANT_BURSAR'");
    });

    it("uses ON CONFLICT for idempotent role seeding", () => {
      expect(migration).toContain("ON CONFLICT (name) DO NOTHING");
    });

    it("seeds permissions for children module", () => {
      expect(migration).toContain("'children', 'view'");
      expect(migration).toContain("'children', 'create'");
      expect(migration).toContain("'children', 'update'");
      expect(migration).toContain("'children', 'archive'");
    });

    it("seeds permissions for finance module", () => {
      expect(migration).toContain("'finance', 'view'");
      expect(migration).toContain("'finance', 'create'");
      expect(migration).toContain("'finance', 'approve'");
    });

    it("uses ON CONFLICT for idempotent permission seeding", () => {
      expect(migration).toContain("ON CONFLICT (module, action) DO NOTHING");
    });

    it("maps role_permissions with ON CONFLICT DO NOTHING", () => {
      expect(migration).toContain("ON CONFLICT DO NOTHING");
    });
  });

  describe("Indexes", () => {
    it("creates index on roles.name", () => {
      expect(migration).toContain("CREATE INDEX idx_roles_name");
    });

    it("creates index on permissions.module", () => {
      expect(migration).toContain("CREATE INDEX idx_permissions_module");
    });

    it("creates index on user_roles.user_id", () => {
      expect(migration).toContain("CREATE INDEX idx_user_roles_user_id");
    });

    it("creates index on user_roles.centre_id", () => {
      expect(migration).toContain("CREATE INDEX idx_user_roles_centre_id");
    });

    it("creates index on role_history.user_id", () => {
      expect(migration).toContain("CREATE INDEX idx_role_history_user_id");
    });
  });
});
