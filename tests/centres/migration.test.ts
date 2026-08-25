import { describe, it, expect } from "vitest";

describe("Migration SQL Validity", () => {
  it("migration file contains CREATE TABLE for centres", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const migrationPath = path.resolve(
      __dirname,
      "../../supabase/migrations/20260825000000_create_centres_table.sql",
    );
    const sql = fs.readFileSync(migrationPath, "utf-8");

    expect(sql).toContain("CREATE TABLE centres");
    expect(sql).toContain("UUID PRIMARY KEY DEFAULT gen_random_uuid()");
    expect(sql).toContain("name          TEXT NOT NULL");
    expect(sql).toContain("code          TEXT NOT NULL");
    expect(sql).toContain("contact_email TEXT");
    expect(sql).toContain("contact_phone TEXT");
    expect(sql).toContain("address_line1 TEXT");
    expect(sql).toContain("city          TEXT");
    expect(sql).toContain("state         TEXT");
    expect(sql).toContain("postal_code   TEXT");
    expect(sql).toContain("country       TEXT NOT NULL DEFAULT");
    expect(sql).toContain("status        centre_status NOT NULL DEFAULT");
    expect(sql).toContain("created_at    TIMESTAMPTZ NOT NULL DEFAULT");
    expect(sql).toContain("updated_at    TIMESTAMPTZ NOT NULL DEFAULT");
  });

  it("migration enables Row Level Security", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const migrationPath = path.resolve(
      __dirname,
      "../../supabase/migrations/20260825000000_create_centres_table.sql",
    );
    const sql = fs.readFileSync(migrationPath, "utf-8");

    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
  });

  it("migration creates centre_status enum", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const migrationPath = path.resolve(
      __dirname,
      "../../supabase/migrations/20260825000000_create_centres_table.sql",
    );
    const sql = fs.readFileSync(migrationPath, "utf-8");

    expect(sql).toContain("CREATE TYPE centre_status");
    expect(sql).toContain("'active'");
    expect(sql).toContain("'suspended'");
    expect(sql).toContain("'deactivated'");
  });

  it("migration creates unique index on code", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const migrationPath = path.resolve(
      __dirname,
      "../../supabase/migrations/20260825000000_create_centres_table.sql",
    );
    const sql = fs.readFileSync(migrationPath, "utf-8");

    expect(sql).toContain("UNIQUE INDEX");
    expect(sql).toContain("idx_centres_code_lower");
  });

  it("migration creates RLS policies for tenant isolation", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const migrationPath = path.resolve(
      __dirname,
      "../../supabase/migrations/20260825000000_create_centres_table.sql",
    );
    const sql = fs.readFileSync(migrationPath, "utf-8");

    expect(sql).toContain("CREATE POLICY");
    expect(sql).toContain("centres_select_own");
    expect(sql).toContain("centres_insert_admin");
    expect(sql).toContain("centres_update_admin");
    expect(sql).toContain("centres_delete_admin");
  });

  it("migration creates the updated_at trigger", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const migrationPath = path.resolve(
      __dirname,
      "../../supabase/migrations/20260825000000_create_centres_table.sql",
    );
    const sql = fs.readFileSync(migrationPath, "utf-8");

    expect(sql).toContain("CREATE TRIGGER set_centres_updated_at");
    expect(sql).toContain("BEFORE UPDATE ON centres");
  });

  it("migration creates auth.current_centre_id function", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const migrationPath = path.resolve(
      __dirname,
      "../../supabase/migrations/20260825000000_create_centres_table.sql",
    );
    const sql = fs.readFileSync(migrationPath, "utf-8");

    expect(sql).toContain("CREATE OR REPLACE FUNCTION auth.current_centre_id()");
    expect(sql).toContain("request.jwt.claims");
  });
});
