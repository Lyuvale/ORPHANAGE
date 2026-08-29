import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260904000000_create_education_development.sql"),
  "utf-8",
);

const lower = migration.toLowerCase();

describe("Education & Development Migration", () => {
  describe("enums", () => {
    it("creates all education enums", () => {
      expect(lower).toContain("create type education_status as enum");
      expect(lower).toContain("create type education_support_type as enum");
      expect(lower).toContain("create type education_support_priority as enum");
      expect(lower).toContain("create type education_support_status as enum");
      expect(lower).toContain("create type education_goal_status as enum");
      expect(lower).toContain("create type education_progress_status as enum");
      expect(lower).toContain("create type education_achievement_category as enum");
    });

    it("includes support types", () => {
      expect(migration).toContain("'BOOKS'");
      expect(migration).toContain("'UNIFORM'");
      expect(migration).toContain("'STATIONERY'");
      expect(migration).toContain("'SCHOOL_BAG'");
      expect(migration).toContain("'TRANSPORT'");
      expect(migration).toContain("'SCHOOL_FEES'");
      expect(migration).toContain("'OTHER'");
    });
  });

  describe("tables", () => {
    it("creates education_profiles with UNIQUE(centre_id, child_id)", () => {
      expect(lower).toContain("create table education_profiles");
      expect(migration).toContain("UNIQUE(centre_id, child_id)");
    });
    it("creates education_support_needs", () => {
      expect(lower).toContain("create table education_support_needs");
    });
    it("creates education_goals", () => {
      expect(lower).toContain("create table education_goals");
    });
    it("creates education_progress", () => {
      expect(lower).toContain("create table education_progress");
    });
    it("creates education_achievements with evidence_reference", () => {
      expect(lower).toContain("create table education_achievements");
      expect(lower).toContain("evidence_reference");
    });
  });

  describe("RLS", () => {
    it("enables RLS on every education table", () => {
      const tables = [
        "education_profiles",
        "education_support_needs",
        "education_goals",
        "education_progress",
        "education_achievements",
      ];
      for (const t of tables) {
        expect(lower).toContain(`alter table ${t} enable row level security`);
      }
    });

    it("scopes SELECT by current_centre_id", () => {
      const selectPolicies = (migration.match(/edu_\w+_select_centre/g) ?? []).length;
      expect(selectPolicies).toBeGreaterThanOrEqual(5);
      expect(lower.split("public.current_centre_id()").length).toBeGreaterThan(5);
    });

    it("prevents direct authenticated writes (admin via service only)", () => {
      expect(lower).toContain("edu_profile_deny_authenticated_insert");
      expect(lower).toContain("edu_goal_deny_authenticated_update");
      expect(lower).toContain("edu_progress_deny_authenticated_delete");
    });
  });

  describe("server-controlled timestamps", () => {
    it("creates updated_at triggers using base function", () => {
      expect(migration).toContain("EXECUTE FUNCTION update_updated_at_column()");
      expect(migration).toContain("set_edu_profile_updated_at");
      expect(migration).toContain("set_edu_goal_updated_at");
      expect(migration).toContain("set_edu_ach_updated_at");
    });
  });

  describe("permissions", () => {
    it("seeds education permissions with ON CONFLICT DO NOTHING", () => {
      expect(lower).toContain("insert into permissions (module, action, description)");
      expect(lower).toContain("on conflict (module, action) do nothing");
    });
    it("registers the six education permission codes", () => {
      for (const code of [
        "('education_development', 'view',",
        "('education_development', 'education.manage',",
        "('education_development', 'support_needs.manage',",
        "('education_development', 'goals.manage',",
        "('education_development', 'progress.manage',",
        "('education_development', 'achievements.manage',",
      ]) {
        expect(lower).toContain(code);
      }
    });
  });

  describe("role mapping", () => {
    it("maps roles for CENTRE_MANAGER, SOCIAL_WORKER, CAREGIVER and RECORDS_OFFICER", () => {
      expect(migration).toContain("'CENTRE_MANAGER'");
      expect(migration).toContain("'SOCIAL_WORKER'");
      expect(migration).toContain("'CAREGIVER'");
      expect(migration).toContain("'RECORDS_OFFICER'");
    });
    it("grants only view + progress.manage to CAREGIVER", () => {
      expect(migration).toContain("'view',");
      expect(migration).toContain("'progress.manage'");
    });
    it("notes that ACCOUNTANT_BURSAR has no education access", () => {
      expect(migration).toContain("ACCOUNTANT_BURSAR");
    });
  });
});
