import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260828000000_create_children_table.sql"),
  "utf-8",
);

const migrationLower = migration.toLowerCase();

describe("Children Migration", () => {
  describe("child_status enum", () => {
    it("creates child_status enum", () => {
      expect(migration).toContain("child_status");
    });

    it("includes all required statuses", () => {
      expect(migrationLower).toContain("'active'");
      expect(migrationLower).toContain("'transferred'");
      expect(migrationLower).toContain("'graduated'");
      expect(migrationLower).toContain("'alumni'");
      expect(migrationLower).toContain("'deactivated'");
    });
  });

  describe("children table", () => {
    it("creates the children table", () => {
      expect(migrationLower).toContain("create table children");
    });

    it("has centre_id column referencing centres", () => {
      expect(migration).toMatch(/centre_id\s+UUID\s+NOT NULL\s+REFERENCES centres/i);
    });

    it("has reference_number column", () => {
      expect(migration).toMatch(/reference_number\s+TEXT\s+NOT NULL/i);
    });

    it("has first_name column", () => {
      expect(migration).toMatch(/first_name\s+TEXT\s+NOT NULL/i);
    });

    it("has middle_name column", () => {
      expect(migration).toMatch(/middle_name\s+TEXT/i);
    });

    it("has last_name column", () => {
      expect(migration).toMatch(/last_name\s+TEXT\s+NOT NULL/i);
    });

    it("has preferred_name column", () => {
      expect(migration).toMatch(/preferred_name\s+TEXT/i);
    });

    it("has date_of_birth column", () => {
      expect(migration).toMatch(/date_of_birth\s+DATE\s+NOT NULL/i);
    });

    it("has gender column", () => {
      expect(migration).toMatch(/gender\s+TEXT\s+NOT NULL/i);
    });

    it("has nationality column", () => {
      expect(migration).toMatch(/nationality\s+TEXT/i);
    });

    it("has photo_url column", () => {
      expect(migration).toMatch(/photo_url\s+TEXT/i);
    });

    it("has status column with default active", () => {
      expect(migration).toMatch(/status\s+child_status\s+NOT NULL\s+DEFAULT\s+'active'/i);
    });

    it("has admission_date column", () => {
      expect(migration).toMatch(/admission_date\s+DATE\s+NOT NULL/i);
    });

    it("has metadata JSONB column", () => {
      expect(migration).toMatch(/metadata\s+JSONB/i);
    });

    it("has created_at with DEFAULT now()", () => {
      expect(migration).toMatch(/created_at\s+TIMESTAMPTZ\s+NOT NULL\s+DEFAULT now\(\)/i);
    });

    it("has updated_at with DEFAULT now()", () => {
      expect(migration).toMatch(/updated_at\s+TIMESTAMPTZ\s+NOT NULL\s+DEFAULT now\(\)/i);
    });
  });

  describe("constraints", () => {
    it("enforces unique reference number per centre", () => {
      expect(migrationLower).toContain("children_centre_reference_unique");
    });

    it("validates gender values", () => {
      expect(migrationLower).toContain("children_gender_check");
      expect(migrationLower).toContain("'male'");
      expect(migrationLower).toContain("'female'");
      expect(migrationLower).toContain("'other'");
      expect(migrationLower).toContain("'undisclosed'");
    });

    it("validates date of birth is in the past", () => {
      expect(migrationLower).toContain("children_dob_check");
    });

    it("validates admission date is not in the future", () => {
      expect(migrationLower).toContain("children_admission_date_check");
    });

    it("validates admission date is not before date of birth", () => {
      expect(migrationLower).toContain("children_admission_dob_check");
    });
  });

  describe("child reference number generation", () => {
    it("creates generate_child_reference function", () => {
      expect(migrationLower).toContain("create or replace function generate_child_reference");
    });

    it("function takes centre_id parameter", () => {
      expect(migration).toMatch(/p_centre_id\s+UUID/i);
    });

    it("function returns text", () => {
      expect(migration).toMatch(/returns\s+text/i);
    });
  });

  describe("indexes", () => {
    it("indexes centre_id", () => {
      expect(migrationLower).toContain("idx_children_centre_id");
    });

    it("indexes reference_number", () => {
      expect(migrationLower).toContain("idx_children_reference_number");
    });

    it("indexes status", () => {
      expect(migrationLower).toContain("idx_children_status");
    });

    it("indexes centre_id + status composite", () => {
      expect(migrationLower).toContain("idx_children_centre_status");
    });

    it("indexes date_of_birth", () => {
      expect(migrationLower).toContain("idx_children_date_of_birth");
    });

    it("indexes centre_id + name composite", () => {
      expect(migrationLower).toContain("idx_children_centre_name");
    });
  });

  describe("updated_at trigger", () => {
    it("creates trigger for updated_at", () => {
      expect(migrationLower).toContain("set_children_updated_at");
      expect(migrationLower).toContain("before update on children");
    });
  });

  describe("RLS", () => {
    it("enables RLS on children", () => {
      expect(migrationLower).toContain("alter table children enable row level security");
    });

    it("allows centre-scoped SELECT for authenticated", () => {
      expect(migrationLower).toContain("children_select_centre");
      expect(migrationLower).toContain("auth.current_centre_id()");
    });

    it("allows inserts only via service_role", () => {
      expect(migrationLower).toContain("children_insert_admin");
      expect(migrationLower).toContain("to service_role");
    });

    it("allows updates only via service_role", () => {
      expect(migrationLower).toContain("children_update_admin");
    });

    it("denies deletes (no physical delete)", () => {
      expect(migrationLower).toContain("children_delete_admin");
      expect(migration).toMatch(/children_delete_admin[\s\S]*using\s+\(false\)/i);
    });

    it("denies authenticated INSERT", () => {
      expect(migrationLower).toContain("children_deny_authenticated_insert");
    });

    it("denies authenticated UPDATE", () => {
      expect(migrationLower).toContain("children_deny_authenticated_update");
    });

    it("denies authenticated DELETE", () => {
      expect(migrationLower).toContain("children_deny_authenticated_delete");
    });
  });

  describe("child_status_history table", () => {
    it("creates child_status_history table", () => {
      expect(migrationLower).toContain("create table child_status_history");
    });

    it("has child_id referencing children", () => {
      expect(migration).toMatch(/child_id\s+UUID\s+NOT NULL\s+REFERENCES children/i);
    });

    it("has centre_id referencing centres", () => {
      expect(migration).toMatch(/centre_id\s+UUID\s+NOT NULL\s+REFERENCES centres/i);
    });

    it("has previous_status column", () => {
      expect(migration).toMatch(/previous_status\s+child_status/i);
    });

    it("has new_status column", () => {
      expect(migration).toMatch(/new_status\s+child_status\s+NOT NULL/i);
    });

    it("has changed_by referencing auth.users", () => {
      expect(migration).toMatch(/changed_by\s+UUID\s+REFERENCES auth\.users/i);
    });

    it("has changed_at with DEFAULT now()", () => {
      expect(migration).toMatch(/changed_at\s+TIMESTAMPTZ\s+NOT NULL\s+DEFAULT now\(\)/i);
    });

    it("has reason column", () => {
      expect(migration).toMatch(/reason\s+TEXT/i);
    });

    it("enables RLS on child_status_history", () => {
      expect(migrationLower).toContain("alter table child_status_history enable row level security");
    });

    it("allows centre-scoped SELECT on status history", () => {
      expect(migrationLower).toContain("child_status_history_select_centre");
    });

    it("allows inserts only via service_role on status history", () => {
      expect(migrationLower).toContain("child_status_history_insert_admin");
    });
  });
});
