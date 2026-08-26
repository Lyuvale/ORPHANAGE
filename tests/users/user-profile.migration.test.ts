import { describe, it, expect } from "vitest";

describe("Migration: user_profiles table", () => {
  async function readMigration() {
    const fs = await import("fs");
    const path = await import("path");
    const migrationPath = path.resolve(
      __dirname,
      "../../supabase/migrations/20260826000000_create_user_profiles_table.sql",
    );
    return fs.readFileSync(migrationPath, "utf-8");
  }

  it("creates user_profiles table with correct columns", async () => {
    const sql = await readMigration();

    expect(sql).toContain("CREATE TABLE user_profiles");
    expect(sql).toContain("id            UUID PRIMARY KEY DEFAULT gen_random_uuid()");
    expect(sql).toContain("auth_user_id  UUID NOT NULL UNIQUE REFERENCES auth.users(id)");
    expect(sql).toContain("centre_id     UUID NOT NULL REFERENCES centres(id)");
    expect(sql).toContain("first_name    TEXT NOT NULL");
    expect(sql).toContain("middle_name   TEXT");
    expect(sql).toContain("last_name     TEXT NOT NULL");
    expect(sql).toContain("phone         TEXT");
    expect(sql).toContain("email         TEXT");
    expect(sql).toContain("status        user_profile_status NOT NULL DEFAULT 'active'");
    expect(sql).toContain("created_at    TIMESTAMPTZ NOT NULL DEFAULT now()");
    expect(sql).toContain("updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()");
  });

  it("creates user_profile_status enum", async () => {
    const sql = await readMigration();

    expect(sql).toContain("CREATE TYPE user_profile_status AS ENUM");
    expect(sql).toContain("'active'");
    expect(sql).toContain("'deactivated'");
  });

  it("creates proper indexes", async () => {
    const sql = await readMigration();

    expect(sql).toContain("idx_user_profiles_centre_id");
    expect(sql).toContain("idx_user_profiles_status");
    expect(sql).toContain("idx_user_profiles_auth_user_id");
  });

  it("creates updated_at trigger", async () => {
    const sql = await readMigration();

    expect(sql).toContain("CREATE TRIGGER set_user_profiles_updated_at");
    expect(sql).toContain("BEFORE UPDATE ON user_profiles");
    expect(sql).toContain("EXECUTE FUNCTION update_updated_at_column()");
  });

  it("enables RLS on user_profiles", async () => {
    const sql = await readMigration();

    expect(sql).toContain("ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY");
  });

  it("creates RLS policies for tenant isolation", async () => {
    const sql = await readMigration();

    expect(sql).toContain('CREATE POLICY "user_profiles_select_own"');
    expect(sql).toContain('CREATE POLICY "user_profiles_select_centre"');
    expect(sql).toContain('CREATE POLICY "user_profiles_insert_admin"');
    expect(sql).toContain('CREATE POLICY "user_profiles_update_admin"');
    expect(sql).toContain('CREATE POLICY "user_profiles_delete_admin"');
  });

  it("rewrites auth.current_centre_id() to use user_profiles", async () => {
    const sql = await readMigration();

    expect(sql).toContain("CREATE OR REPLACE FUNCTION auth.current_centre_id()");
    expect(sql).toContain("SELECT centre_id FROM user_profiles");
    expect(sql).toContain("WHERE auth_user_id = auth.uid()");
    expect(sql).toContain("AND status = 'active'");
  });

  it("creates auth.has_active_profile() function", async () => {
    const sql = await readMigration();

    expect(sql).toContain("CREATE OR REPLACE FUNCTION auth.has_active_profile()");
    expect(sql).toContain("auth_user_id = auth.uid()");
    expect(sql).toContain("status = 'active'");
  });

  it("updates centres RLS to use user_profiles", async () => {
    const sql = await readMigration();

    expect(sql).toContain('DROP POLICY IF EXISTS "centres_select_own"');
    expect(sql).toContain("EXISTS");
    expect(sql).toContain("user_profiles.centre_id = centres.id");
    expect(sql).toContain("user_profiles.auth_user_id = auth.uid()");
  });

  it("uses ON DELETE RESTRICT for foreign keys", async () => {
    const sql = await readMigration();

    expect(sql).toContain("ON DELETE RESTRICT");
  });
});
