import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260906000000_create_resources_support.sql"),
  "utf-8",
);

const lower = migration.toLowerCase();

describe("Resources & Support Migration", () => {
  describe("enums", () => {
    it("creates the four support enums", () => {
      expect(lower).toContain("create type support_source_type as enum");
      expect(lower).toContain("create type support_expense_status as enum");
      expect(lower).toContain("create type support_benefit_type as enum");
      expect(lower).toContain("create type support_document_entity as enum");
    });

    it("includes the expected enum values", () => {
      expect(migration).toContain("'DONATION'");
      expect(migration).toContain("'APPROVED'");
      expect(migration).toContain("'EDUCATION_SUPPORT'");
      expect(migration).toContain("'SOURCE'");
    });
  });

  describe("tables", () => {
    it("creates all six support tables", () => {
      for (const t of [
        "support_sources",
        "support_funds",
        "support_expenses",
        "support_benefits",
        "support_benefit_children",
        "support_documents",
      ]) {
        expect(lower).toContain(`create table ${t}`);
      }
    });

    it("expenses default to PENDING and require APPROVED to count", () => {
      expect(lower).toContain("default 'pending'");
    });

    it("links tables to centres with ON DELETE RESTRICT", () => {
      expect(lower).toContain("references centres(id) on delete restrict");
    });

    it("links benefit_children to existing children (never duplicated)", () => {
      expect(lower).toContain("references children(id) on delete restrict");
      expect(migration).toContain("UNIQUE (benefit_id, child_id)");
    });
  });

  describe("balance caps enforced in the database", () => {
    it("caps fund allocation to the source amount", () => {
      expect(lower).toContain("support_check_fund_allocation");
      expect(lower).toContain("v_allocation:");
    });

    it("caps approved expense usage to the fund balance", () => {
      expect(lower).toContain("support_check_expense_usage");
      expect(lower).toContain("v_expense:");
    });

    it("only APPROVED expenses are summed for usage", () => {
      expect(lower).toContain("approval_status = 'approved'");
    });
  });

  describe("RLS", () => {
    it("enables RLS on every support table", () => {
      for (const t of [
        "support_sources",
        "support_funds",
        "support_expenses",
        "support_benefits",
        "support_benefit_children",
        "support_documents",
      ]) {
        expect(lower).toContain(`alter table ${t} enable row level security`);
      }
    });

    it("scopes SELECT by current_centre_id", () => {
      expect(lower.split("public.current_centre_id()").length).toBeGreaterThan(5);
      for (const t of ["source", "fund", "expense", "benefit", "document"]) {
        expect(lower).toContain(`support_${t}_select_centre`);
      }
    });

    it("prevents direct authenticated writes (admin service only)", () => {
      expect(lower).toContain("support_source_deny_auth_insert");
      expect(lower).toContain("support_fund_deny_auth_update");
      expect(lower).toContain("support_expense_deny_auth_delete");
      expect(lower).toContain("support_benefit_deny_auth_insert");
      expect(lower).toContain("support_document_deny_auth_update");
    });
  });

  describe("server-controlled timestamps", () => {
    it("uses the base updated_at trigger function", () => {
      expect(migration).toContain("EXECUTE FUNCTION update_updated_at_column()");
      expect(migration).toContain("set_support_source_updated_at");
      expect(migration).toContain("set_support_fund_updated_at");
      expect(migration).toContain("set_support_expense_updated_at");
      expect(migration).toContain("set_support_benefit_updated_at");
    });
  });

  describe("storage", () => {
    it("creates a private support-documents bucket", () => {
      expect(migration).toContain("'support-documents'");
      expect(lower).toContain("insert into storage.buckets");
    });
  });

  describe("permissions", () => {
    it("adds all seven granular resources permissions", () => {
      for (const code of [
        "('resources', 'view',",
        "('resources', 'manage',",
        "('resources', 'approve',",
        "('resources', 'reports',",
        "('resources', 'documents.view',",
        "('resources', 'documents.upload',",
        "('resources', 'documents.download',",
      ]) {
        expect(lower).toContain(code);
      }
    });

    it("seeds with ON CONFLICT DO NOTHING", () => {
      expect(lower).toContain("on conflict (module, action) do nothing");
    });
  });

  describe("role mapping", () => {
    it("gives CENTRE_MANAGER and ACCOUNTANT_BURSAR full access", () => {
      expect(migration).toContain("mgr, id FROM permissions WHERE module = 'resources'");
      expect(migration).toContain("ab, id FROM permissions WHERE module = 'resources'");
    });

    it("gives SOCIAL_WORKER and RECORDS_OFFICER view-only", () => {
      expect(migration).toContain(
        "sw, id FROM permissions WHERE (module = 'resources' AND action = 'view')",
      );
      expect(migration).toContain(
        "ro, id FROM permissions WHERE (module = 'resources' AND action = 'view')",
      );
    });
  });
});
