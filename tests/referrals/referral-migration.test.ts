import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260829000000_create_referrals_admissions_placements.sql"),
  "utf-8",
);

const migrationLower = migration.toLowerCase();

describe("Referrals, Admissions & Placements Migration", () => {
  describe("referral_status enum", () => {
    it("creates referral_status enum", () => {
      expect(migration).toContain("referral_status");
    });

    it("includes all required statuses", () => {
      expect(migrationLower).toContain("'submitted'");
      expect(migrationLower).toContain("'under_review'");
      expect(migrationLower).toContain("'admitted'");
      expect(migrationLower).toContain("'rejected'");
      expect(migrationLower).toContain("'withdrawn'");
    });
  });

  describe("referral_source enum", () => {
    it("creates referral_source enum", () => {
      expect(migration).toContain("referral_source");
    });

    it("includes all required sources", () => {
      expect(migrationLower).toContain("'police'");
      expect(migrationLower).toContain("'court'");
      expect(migrationLower).toContain("'hospital'");
      expect(migrationLower).toContain("'school'");
      expect(migrationLower).toContain("'community'");
      expect(migrationLower).toContain("'government'");
      expect(migrationLower).toContain("'self_referral'");
      expect(migrationLower).toContain("'other'");
    });
  });

  describe("referral_priority enum", () => {
    it("creates referral_priority enum", () => {
      expect(migration).toContain("referral_priority");
    });

    it("includes all required priorities", () => {
      expect(migrationLower).toContain("'low'");
      expect(migrationLower).toContain("'medium'");
      expect(migrationLower).toContain("'high'");
      expect(migrationLower).toContain("'urgent'");
    });
  });

  describe("referrals table", () => {
    it("creates the referrals table", () => {
      expect(migrationLower).toContain("create table referrals");
    });

    it("has centre_id column referencing centres", () => {
      expect(migration).toMatch(/centre_id\s+UUID\s+NOT NULL\s+REFERENCES centres/i);
    });

    it("has reference_number column", () => {
      expect(migration).toMatch(/reference_number\s+TEXT\s+NOT NULL/i);
    });

    it("has child_first_name column", () => {
      expect(migration).toMatch(/child_first_name\s+TEXT\s+NOT NULL/i);
    });

    it("has child_last_name column", () => {
      expect(migration).toMatch(/child_last_name\s+TEXT\s+NOT NULL/i);
    });

    it("has source column with referral_source type", () => {
      expect(migration).toMatch(/source\s+referral_source\s+NOT NULL/i);
    });

    it("has priority column with default medium", () => {
      expect(migration).toMatch(/priority\s+referral_priority\s+NOT NULL\s+DEFAULT\s+'medium'/i);
    });

    it("has status column with default submitted", () => {
      expect(migration).toMatch(/status\s+referral_status\s+NOT NULL\s+DEFAULT\s+'submitted'/i);
    });

    it("has reason column", () => {
      expect(migration).toMatch(/reason\s+TEXT\s+NOT NULL/i);
    });

    it("enforces unique reference per centre", () => {
      expect(migrationLower).toContain("referrals_centre_reference_unique");
    });
  });

  describe("referral_documents table", () => {
    it("creates the referral_documents table", () => {
      expect(migrationLower).toContain("create table referral_documents");
    });

    it("has referral_id referencing referrals", () => {
      expect(migration).toMatch(/referral_id\s+UUID\s+NOT NULL\s+REFERENCES referrals/i);
    });
  });

  describe("admission_status enum", () => {
    it("creates admission_status enum", () => {
      expect(migration).toContain("admission_status");
    });

    it("includes all required statuses", () => {
      expect(migrationLower).toContain("'pending'");
      expect(migrationLower).toContain("'approved'");
      expect(migrationLower).toContain("'denied'");
      expect(migrationLower).toContain("'cancelled'");
    });
  });

  describe("admissions table", () => {
    it("creates the admissions table", () => {
      expect(migrationLower).toContain("create table admissions");
    });

    it("has referral_id referencing referrals", () => {
      expect(migration).toMatch(/referral_id\s+UUID\s+NOT NULL\s+REFERENCES referrals/i);
    });

    it("has status column with default pending", () => {
      expect(migration).toMatch(/status\s+admission_status\s+NOT NULL\s+DEFAULT\s+'pending'/i);
    });

    it("enforces unique reference per centre", () => {
      expect(migrationLower).toContain("admissions_centre_reference_unique");
    });
  });

  describe("admission_history table", () => {
    it("creates the admission_history table", () => {
      expect(migrationLower).toContain("create table admission_history");
    });

    it("has admission_id referencing admissions", () => {
      expect(migration).toMatch(/admission_id\s+UUID\s+NOT NULL\s+REFERENCES admissions/i);
    });
  });

  describe("placement_status enum", () => {
    it("creates placement_status enum", () => {
      expect(migration).toContain("placement_status");
    });

    it("includes all required statuses", () => {
      expect(migrationLower).toContain("'active'");
      expect(migrationLower).toContain("'completed'");
      expect(migrationLower).toContain("'transferred'");
      expect(migrationLower).toContain("'discharged'");
    });
  });

  describe("placements table", () => {
    it("creates the placements table", () => {
      expect(migrationLower).toContain("create table placements");
    });

    it("has child_id referencing children", () => {
      expect(migration).toMatch(/child_id\s+UUID\s+NOT NULL\s+REFERENCES children/i);
    });

    it("has admission_id referencing admissions", () => {
      expect(migration).toMatch(/admission_id\s+UUID\s+REFERENCES admissions/i);
    });

    it("has status column with default active", () => {
      expect(migration).toMatch(/status\s+placement_status\s+NOT NULL\s+DEFAULT\s+'active'/i);
    });

    it("has start_date column", () => {
      expect(migration).toMatch(/start_date\s+DATE\s+NOT NULL/i);
    });

    it("has placement_type column with default residential", () => {
      expect(migration).toMatch(/placement_type\s+TEXT\s+NOT NULL\s+DEFAULT\s+'residential'/i);
    });

    it("validates placement_type values", () => {
      expect(migrationLower).toContain("placements_placement_type_check");
      expect(migrationLower).toContain("'residential'");
      expect(migrationLower).toContain("'foster'");
      expect(migrationLower).toContain("'adoption'");
      expect(migrationLower).toContain("'transitional'");
      expect(migrationLower).toContain("'temporary'");
    });

    it("validates dates check", () => {
      expect(migrationLower).toContain("placements_dates_check");
    });

    it("enforces unique reference per centre", () => {
      expect(migrationLower).toContain("placements_centre_reference_unique");
    });
  });

  describe("RLS", () => {
    it("enables RLS on referrals", () => {
      expect(migrationLower).toContain("alter table referrals enable row level security");
    });

    it("enables RLS on referral_documents", () => {
      expect(migrationLower).toContain("alter table referral_documents enable row level security");
    });

    it("enables RLS on admissions", () => {
      expect(migrationLower).toContain("alter table admissions enable row level security");
    });

    it("enables RLS on admission_history", () => {
      expect(migrationLower).toContain("alter table admission_history enable row level security");
    });

    it("enables RLS on placements", () => {
      expect(migrationLower).toContain("alter table placements enable row level security");
    });

    it("allows centre-scoped SELECT for referrals", () => {
      expect(migrationLower).toContain("referrals_select_centre");
      expect(migrationLower).toContain("auth.current_centre_id()");
    });

    it("allows centre-scoped SELECT for admissions", () => {
      expect(migrationLower).toContain("admissions_select_centre");
    });

    it("allows centre-scoped SELECT for placements", () => {
      expect(migrationLower).toContain("placements_select_centre");
    });
  });

  describe("permissions", () => {
    it("seeds admissions permissions", () => {
      expect(migrationLower).toContain("'admissions', 'view'");
      expect(migrationLower).toContain("'admissions', 'create'");
      expect(migrationLower).toContain("'admissions', 'review'");
    });

    it("seeds placements permissions", () => {
      expect(migrationLower).toContain("'placements', 'view'");
      expect(migrationLower).toContain("'placements', 'create'");
      expect(migrationLower).toContain("'placements', 'update'");
    });

    it("seeds referral review/approve/reject permissions", () => {
      expect(migrationLower).toContain("'referrals', 'review'");
      expect(migrationLower).toContain("'referrals', 'approve'");
      expect(migrationLower).toContain("'referrals', 'reject'");
    });
  });

  describe("triggers", () => {
    it("creates updated_at trigger for referrals", () => {
      expect(migrationLower).toContain("set_referrals_updated_at");
    });

    it("creates updated_at trigger for admissions", () => {
      expect(migrationLower).toContain("set_admissions_updated_at");
    });

    it("creates updated_at trigger for placements", () => {
      expect(migrationLower).toContain("set_placements_updated_at");
    });
  });
});
