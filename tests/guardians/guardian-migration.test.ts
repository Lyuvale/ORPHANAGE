import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260830000000_create_guardians_family.sql"),
  "utf-8",
);

const migrationLower = migration.toLowerCase();

describe("Family & Guardian Migration", () => {
  describe("guardian_status enum", () => {
    it("creates guardian_status enum", () => {
      expect(migration).toContain("guardian_status");
    });

    it("includes all required statuses", () => {
      expect(migrationLower).toContain("'active'");
      expect(migrationLower).toContain("'inactive'");
      expect(migrationLower).toContain("'deceased'");
      expect(migrationLower).toContain("'unknown'");
    });
  });

  describe("relationship_type enum", () => {
    it("creates relationship_type enum", () => {
      expect(migration).toContain("relationship_type");
    });

    it("includes all required types", () => {
      expect(migrationLower).toContain("'mother'");
      expect(migrationLower).toContain("'father'");
      expect(migrationLower).toContain("'grandparent'");
      expect(migrationLower).toContain("'sibling'");
      expect(migrationLower).toContain("'aunt'");
      expect(migrationLower).toContain("'uncle'");
      expect(migrationLower).toContain("'legal_guardian'");
      expect(migrationLower).toContain("'foster_caregiver'");
      expect(migrationLower).toContain("'other_relative'");
      expect(migrationLower).toContain("'other_authorised'");
    });
  });

  describe("legal_authority_type enum", () => {
    it("creates legal_authority_type enum", () => {
      expect(migration).toContain("legal_authority_type");
    });

    it("includes all required types", () => {
      expect(migrationLower).toContain("'parent'");
      expect(migrationLower).toContain("'legal_guardian'");
      expect(migrationLower).toContain("'court_authorised'");
      expect(migrationLower).toContain("'other_authorised'");
      expect(migrationLower).toContain("'none'");
    });
  });

  describe("guardians table", () => {
    it("creates the guardians table", () => {
      expect(migrationLower).toContain("create table guardians");
    });

    it("has centre_id column referencing centres", () => {
      expect(migration).toMatch(/centre_id\s+UUID\s+NOT NULL\s+REFERENCES centres/i);
    });

    it("has first_name column", () => {
      expect(migration).toMatch(/first_name\s+TEXT\s+NOT NULL/i);
    });

    it("has last_name column", () => {
      expect(migration).toMatch(/last_name\s+TEXT\s+NOT NULL/i);
    });

    it("has phone column", () => {
      expect(migration).toMatch(/phone\s+TEXT/i);
    });

    it("has email column", () => {
      expect(migration).toMatch(/email\s+TEXT/i);
    });

    it("has status column with default active", () => {
      expect(migration).toMatch(/status\s+guardian_status\s+NOT NULL\s+DEFAULT\s+'active'/i);
    });

    it("has preferred_name column", () => {
      expect(migration).toMatch(/preferred_name\s+TEXT/i);
    });

    it("has date_of_birth column", () => {
      expect(migration).toMatch(/date_of_birth\s+DATE/i);
    });

    it("has address column", () => {
      expect(migration).toMatch(/address\s+TEXT/i);
    });

    it("has occupation column", () => {
      expect(migration).toMatch(/occupation\s+TEXT/i);
    });

    it("has id_reference column", () => {
      expect(migration).toMatch(/id_reference\s+TEXT/i);
    });
  });

  describe("child_guardians table", () => {
    it("creates the child_guardians table", () => {
      expect(migrationLower).toContain("create table child_guardians");
    });

    it("has child_id referencing children", () => {
      expect(migration).toMatch(/child_id\s+UUID\s+NOT NULL\s+REFERENCES children/i);
    });

    it("has guardian_id referencing guardians", () => {
      expect(migration).toMatch(/guardian_id\s+UUID\s+NOT NULL\s+REFERENCES guardians/i);
    });

    it("has relationship_type column", () => {
      expect(migration).toMatch(/relationship_type\s+relationship_type\s+NOT NULL/i);
    });

    it("has is_primary column with default false", () => {
      expect(migration).toMatch(/is_primary\s+BOOLEAN\s+NOT NULL\s+DEFAULT\s+false/i);
    });

    it("has is_active column with default true", () => {
      expect(migration).toMatch(/is_active\s+BOOLEAN\s+NOT NULL\s+DEFAULT\s+true/i);
    });

    it("has start_date column", () => {
      expect(migration).toMatch(/start_date\s+DATE\s+NOT NULL/i);
    });

    it("has end_date column", () => {
      expect(migration).toMatch(/end_date\s+DATE/i);
    });

    it("has legal_authority column", () => {
      expect(migration).toMatch(/legal_authority\s+legal_authority_type\s+NOT NULL/i);
    });

    it("has contact_permitted column", () => {
      expect(migration).toMatch(/contact_permitted\s+BOOLEAN\s+NOT NULL\s+DEFAULT\s+true/i);
    });

    it("has visit_permitted column", () => {
      expect(migration).toMatch(/visit_permitted\s+BOOLEAN\s+NOT NULL\s+DEFAULT\s+true/i);
    });

    it("has contact_restricted column", () => {
      expect(migration).toMatch(/contact_restricted\s+BOOLEAN\s+NOT NULL\s+DEFAULT\s+false/i);
    });

    it("has visits_restricted column", () => {
      expect(migration).toMatch(/visits_restricted\s+BOOLEAN\s+NOT NULL\s+DEFAULT\s+false/i);
    });

    it("enforces one primary per child via unique index", () => {
      expect(migrationLower).toContain("idx_child_guardians_one_primary");
      expect(migrationLower).toContain("where is_primary = true and is_active = true");
    });
  });

  describe("guardian_documents table", () => {
    it("creates the guardian_documents table", () => {
      expect(migrationLower).toContain("create table guardian_documents");
    });

    it("has guardian_id referencing guardians", () => {
      expect(migration).toMatch(/guardian_id\s+UUID\s+NOT NULL\s+REFERENCES guardians/i);
    });

    it("has relationship_id referencing child_guardians", () => {
      expect(migration).toMatch(/relationship_id\s+UUID\s+REFERENCES child_guardians/i);
    });

    it("has document_type column", () => {
      expect(migration).toMatch(/document_type\s+TEXT\s+NOT NULL/i);
    });

    it("has storage_path column", () => {
      expect(migration).toMatch(/storage_path\s+TEXT\s+NOT NULL/i);
    });
  });

  describe("RLS", () => {
    it("enables RLS on guardians", () => {
      expect(migrationLower).toContain("alter table guardians enable row level security");
    });

    it("enables RLS on child_guardians", () => {
      expect(migrationLower).toContain("alter table child_guardians enable row level security");
    });

    it("enables RLS on guardian_documents", () => {
      expect(migrationLower).toContain("alter table guardian_documents enable row level security");
    });

    it("allows centre-scoped SELECT for guardians", () => {
      expect(migrationLower).toContain("guardians_select_centre");
      expect(migrationLower).toContain("auth.current_centre_id()");
    });

    it("allows centre-scoped SELECT for child_guardians", () => {
      expect(migrationLower).toContain("child_guardians_select_centre");
    });

    it("allows centre-scoped SELECT for guardian_documents", () => {
      expect(migrationLower).toContain("guardian_documents_select_centre");
    });

    it("denies authenticated inserts on guardians", () => {
      expect(migrationLower).toContain("guardians_deny_authenticated_insert");
    });

    it("denies authenticated inserts on child_guardians", () => {
      expect(migrationLower).toContain("child_guardians_deny_authenticated_insert");
    });
  });

  describe("permissions", () => {
    it("seeds guardians.view permission", () => {
      expect(migrationLower).toContain("'guardians', 'view'");
    });

    it("seeds guardians.create permission", () => {
      expect(migrationLower).toContain("'guardians', 'create'");
    });

    it("seeds guardians.update permission", () => {
      expect(migrationLower).toContain("'guardians', 'update'");
    });

    it("seeds guardians.deactivate permission", () => {
      expect(migrationLower).toContain("'guardians', 'deactivate'");
    });

    it("seeds guardians.relationship.manage permission", () => {
      expect(migrationLower).toContain("'guardians', 'relationship.manage'");
    });

    it("seeds guardians.documents.view permission", () => {
      expect(migrationLower).toContain("'guardians', 'documents.view'");
    });

    it("seeds guardians.documents.upload permission", () => {
      expect(migrationLower).toContain("'guardians', 'documents.upload'");
    });

    it("seeds guardians.documents.download permission", () => {
      expect(migrationLower).toContain("'guardians', 'documents.download'");
    });
  });

  describe("triggers", () => {
    it("creates updated_at trigger for guardians", () => {
      expect(migrationLower).toContain("set_guardians_updated_at");
    });

    it("creates updated_at trigger for child_guardians", () => {
      expect(migrationLower).toContain("set_child_guardians_updated_at");
    });
  });

  describe("indexes", () => {
    it("creates index on guardians centre_id", () => {
      expect(migrationLower).toContain("idx_guardians_centre_id");
    });

    it("creates index on guardians status", () => {
      expect(migrationLower).toContain("idx_guardians_status");
    });

    it("creates index on guardians name", () => {
      expect(migrationLower).toContain("idx_guardians_name");
    });

    it("creates index on child_guardians child_id", () => {
      expect(migrationLower).toContain("idx_child_guardians_child_id");
    });

    it("creates index on child_guardians guardian_id", () => {
      expect(migrationLower).toContain("idx_child_guardians_guardian_id");
    });

    it("creates index on child_guardians centre_id", () => {
      expect(migrationLower).toContain("idx_child_guardians_centre_id");
    });
  });
});
