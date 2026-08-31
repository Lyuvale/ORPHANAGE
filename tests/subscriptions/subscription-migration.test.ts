import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260911000000_create_subscriptions.sql"),
  "utf-8",
);

const lower = migration.toLowerCase();

describe("Subscriptions Migration", () => {
  describe("types", () => {
    it("creates the subscription_status and billing_period enums", () => {
      expect(lower).toContain("create type subscription_status as enum");
      expect(lower).toContain("create type billing_period");
      expect(migration).toContain("'trial', 'active', 'expired', 'suspended', 'cancelled'");
    });
  });

  describe("tables", () => {
    it("creates plans, plan_features, subscriptions and subscription_history", () => {
      expect(lower).toContain("create table plans ");
      expect(lower).toContain("create table plan_features ");
      expect(lower).toContain("create table subscriptions ");
      expect(lower).toContain("create table subscription_history ");
    });

    it("subscriptions references centres and plans with restrict on delete", () => {
      expect(lower).toContain("references centres(id) on delete restrict");
      expect(lower).toContain("references plans(id) on delete restrict");
    });

    it("plan features are unique per plan and feature key", () => {
      expect(migration).toContain("UNIQUE (plan_id, feature_key)");
    });
  });

  describe("RLS / tenant isolation", () => {
    it("enables RLS on all four tables", () => {
      for (const table of ["plans", "plan_features", "subscriptions", "subscription_history"]) {
        expect(lower).toContain(`alter table ${table} enable row level security`);
      }
    });

    it("a centre can select only its own subscription using current_centre_id()", () => {
      expect(lower).toContain("current_centre_id()");
      expect(lower).toContain("subscriptions_select_own");
    });

    it("write access is service_role only (direct client writes denied)", () => {
      const mutateCount = (lower.match(/to service_role/g) ?? []).length;
      expect(mutateCount).toBeGreaterThanOrEqual(4);
    });
  });

  describe("permissions", () => {
    it("seeds subscriptions.view, manage and view_own permissions", () => {
      expect(migration).toContain("('subscriptions', 'view',");
      expect(migration).toContain("('subscriptions', 'manage',");
      expect(migration).toContain("('subscriptions', 'view_own',");
    });

    it("grants manage to CENTRE_MANAGER only and view_own to every centre role", () => {
      expect(migration).toContain("r.name IN ('CENTRE_MANAGER', 'SOCIAL_WORKER', 'CAREGIVER', 'RECORDS_OFFICER', 'ACCOUNTANT_BURSAR')");
      expect(migration).toContain("AND p.action = 'view_own'");
      expect(migration).toContain("v_centre_manager");
    });
  });

  describe("seeded plans", () => {
    it("seeds Basic, Standard and Premium reference plans", () => {
      expect(migration).toContain("'Basic'");
      expect(migration).toContain("'Standard'");
      expect(migration).toContain("'Premium'");
    });

    it("premium plan enables all feature keys", () => {
      expect(migration).toContain("(v_premium, 'ANALYTICS',  'Advanced analytics', true)");
    });
  });
});
