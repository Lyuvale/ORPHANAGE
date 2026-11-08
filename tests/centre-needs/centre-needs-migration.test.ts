import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20261109000000_create_centre_needs.sql"),
  "utf-8",
);
const lower = migration.toLowerCase();

describe("Centre Needs Migration", () => {
  describe("centre_needs table", () => {
    it("creates the centre_needs table", () => {
      expect(lower).toContain("create table centre_needs");
    });

    it("has a tenant-scoped centre_id with cascade delete", () => {
      expect(migration).toMatch(
        /centre_id\s+UUID\s+NOT NULL\s+REFERENCES centres\(id\)\s+ON DELETE CASCADE/i,
      );
    });

    it("has title, description and image_url", () => {
      expect(migration).toMatch(/title\s+TEXT\s+NOT NULL/i);
      expect(migration).toMatch(/description\s+TEXT/i);
      expect(migration).toMatch(/image_url\s+TEXT/i);
    });

    it("has a positive target_amount", () => {
      expect(migration).toMatch(/target_amount\s+NUMERIC\(14,2\)\s+NOT NULL/i);
      expect(lower).toContain("target_amount > 0");
    });

    it("has a text status constrained to active/completed/archived", () => {
      expect(migration).toMatch(
        /status\s+TEXT\s+NOT NULL\s+DEFAULT\s+'active'/i,
      );
      expect(lower).toContain("status in ('active', 'completed', 'archived')");
    });

    it("has is_public defaulting to true", () => {
      expect(migration).toMatch(
        /is_public\s+BOOLEAN\s+NOT NULL\s+DEFAULT\s+true/i,
      );
    });

    it("has sort_order and audit actor columns", () => {
      expect(migration).toMatch(/sort_order\s+INTEGER\s+NOT NULL\s+DEFAULT\s+0/i);
      expect(migration).toMatch(/created_by\s+UUID/i);
      expect(migration).toMatch(/updated_by\s+UUID/i);
    });

    it("has created_at/updated_at defaults and an updated_at trigger", () => {
      expect(migration).toMatch(
        /created_at\s+TIMESTAMPTZ\s+NOT NULL\s+DEFAULT now\(\)/i,
      );
      expect(migration).toMatch(
        /updated_at\s+TIMESTAMPTZ\s+NOT NULL\s+DEFAULT now\(\)/i,
      );
      expect(lower).toContain("set_centre_needs_updated_at");
    });
  });

  describe("centre_need_contributions table", () => {
    it("creates the contributions table", () => {
      expect(lower).toContain("create table centre_need_contributions");
    });

    it("cascades when the need is deleted", () => {
      expect(migration).toMatch(
        /need_id\s+UUID\s+NOT NULL\s+REFERENCES centre_needs\(id\)\s+ON DELETE CASCADE/i,
      );
    });

    it("stores a positive amount", () => {
      expect(migration).toMatch(/amount\s+NUMERIC\(14,2\)\s+NOT NULL/i);
      expect(lower).toContain("amount > 0");
    });

    it("limits source to ONLINE or MANUAL", () => {
      expect(migration).toMatch(/source\s+TEXT\s+NOT NULL/i);
      expect(lower).toContain("source in ('online', 'manual')");
    });

    it("makes payment_transaction_id UNIQUE for webhook idempotency", () => {
      expect(migration).toMatch(/payment_transaction_id\s+UUID\s+UNIQUE/i);
      expect(lower).toContain("references payment_transactions(id)");
    });

    it("has a note and created_by", () => {
      expect(migration).toMatch(/note\s+TEXT/i);
      expect(migration).toMatch(/created_by\s+UUID/i);
    });
  });

  describe("Row Level Security", () => {
    it("enables RLS on both tables", () => {
      expect(lower).toContain("alter table centre_needs enable row level security");
      expect(lower).toContain(
        "alter table centre_need_contributions enable row level security",
      );
    });

    it("lets authenticated users select only their own centre rows", () => {
      expect(migration).toContain(
        "centre_id = public.current_centre_id()",
      );
      expect(lower).toContain("centre_needs_select_centre");
      expect(lower).toContain("centre_need_contributions_select_centre");
    });

    it("gives service_role full access", () => {
      expect(lower).toContain("centre_needs_service_all");
      expect(lower).toContain("centre_need_contributions_service_all");
      expect(lower).toContain("to service_role");
    });

    it("denies authenticated writes", () => {
      for (const policy of [
        "centre_needs_deny_authenticated_insert",
        "centre_needs_deny_authenticated_update",
        "centre_needs_deny_authenticated_delete",
        "centre_need_contributions_deny_authenticated_insert",
        "centre_need_contributions_deny_authenticated_update",
        "centre_need_contributions_deny_authenticated_delete",
      ]) {
        expect(lower).toContain(policy);
      }
    });
  });

  describe("Permissions", () => {
    it("seeds site.needs.view and site.needs.manage", () => {
      expect(lower).toContain("('site', 'needs.view'");
      expect(lower).toContain("('site', 'needs.manage'");
    });

    it("grants manage to CENTRE_MANAGER and CENTRE_IT", () => {
      expect(lower).toContain("'centre_manager', 'centre_it'");
      expect(lower).toContain("('site', 'needs.manage')");
    });

    it("grants view (and site.view) to ACCOUNTANT_BURSAR", () => {
      expect(lower).toContain("r.name = 'accountant_bursar'");
      expect(lower).toContain("('site', 'needs.view')");
      expect(lower).toContain("('site', 'view')");
    });
  });
});
