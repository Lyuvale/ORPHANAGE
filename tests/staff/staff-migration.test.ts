import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260905000000_create_staff_management.sql"),
  "utf-8",
);

const lower = migration.toLowerCase();

describe("Staff Management Migration", () => {
  describe("enums", () => {
    it("creates all six staff enums", () => {
      expect(lower).toContain("create type staff_status as enum");
      expect(lower).toContain("create type staff_history_event as enum");
      expect(lower).toContain("create type staff_assignment_status as enum");
      expect(lower).toContain("create type staff_training_status as enum");
      expect(lower).toContain("create type staff_verification_status as enum");
      expect(lower).toContain("create type staff_document_type as enum");
    });

    it("includes employment status values", () => {
      expect(migration).toContain("'ACTIVE'");
      expect(migration).toContain("'ON_LEAVE'");
      expect(migration).toContain("'SUSPENDED'");
      expect(migration).toContain("'INACTIVE'");
      expect(migration).toContain("'ENDED'");
    });

    it("includes event / status / document values", () => {
      expect(migration).toContain("'JOINED'");
      expect(migration).toContain("'ASSIGNMENT_CHANGED'");
      expect(migration).toContain("'STATUS_CHANGED'");
      expect(migration).toContain("'PENDING'");
      expect(migration).toContain("'COMPLETED'");
      expect(migration).toContain("'NOT_VERIFIED'");
      expect(migration).toContain("'EMPLOYMENT_AGREEMENT'");
      expect(migration).toContain("'QUALIFICATION_CERTIFICATE'");
    });
  });

  describe("tables", () => {
    it("creates all seven staff tables", () => {
      for (const t of [
        "staff_profiles",
        "staff_history",
        "staff_assignments",
        "staff_training",
        "staff_qualifications",
        "staff_emergency_contacts",
        "staff_documents",
      ]) {
        expect(lower).toContain(`create table ${t}`);
      }
    });

    it("enforces ENDED requires end_date on staff_profiles", () => {
      expect(lower).toContain("employment_status <> 'ended' or end_date is not null");
    });

    it("reuses centre role vocabulary for operational_role", () => {
      expect(migration).toContain("'CENTRE_MANAGER'");
      expect(migration).toContain("'ACCOUNTANT_BURSAR'");
    });

    it("creates tenant safety unique indexes", () => {
      expect(lower).toContain("idx_staff_profiles_centre_user");
      expect(lower).toContain("idx_staff_profiles_centre_identifier");
    });

    it("restricts staff history deletion", () => {
      expect(lower).toContain("on delete restrict");
    });
  });

  describe("RLS", () => {
    it("enables RLS on every staff table", () => {
      for (const t of [
        "staff_profiles",
        "staff_history",
        "staff_assignments",
        "staff_training",
        "staff_qualifications",
        "staff_emergency_contacts",
        "staff_documents",
      ]) {
        expect(lower).toContain(`alter table ${t} enable row level security`);
      }
    });

    it("scopes SELECT by current_centre_id", () => {
      const selectPolicies = (migration.match(/staff_\w+_select_centre/g) ?? []).length;
      expect(selectPolicies).toBeGreaterThanOrEqual(6);
      expect(lower.split("public.current_centre_id()").length).toBeGreaterThan(7);
    });

    it("prevents direct authenticated writes (admin service only)", () => {
      expect(lower).toContain("staff_profile_deny_authenticated_insert");
      expect(lower).toContain("staff_assignment_deny_authenticated_update");
      expect(lower).toContain("staff_document_deny_authenticated_delete");
    });
  });

  describe("server-controlled timestamps", () => {
    it("creates updated_at triggers using base function", () => {
      expect(migration).toContain("EXECUTE FUNCTION update_updated_at_column()");
      expect(migration).toContain("set_staff_profile_updated_at");
      expect(migration).toContain("set_staff_assignment_updated_at");
      expect(migration).toContain("set_staff_training_updated_at");
      expect(migration).toContain("set_staff_qualification_updated_at");
      expect(migration).toContain("set_staff_emergency_updated_at");
    });
  });

  describe("storage", () => {
    it("creates a private staff-documents bucket", () => {
      expect(migration).toContain("'staff-documents'");
      expect(lower).toContain("insert into storage.buckets");
    });
  });

  describe("permissions", () => {
    it("adds only the nine granular staff permissions", () => {
      for (const code of [
        "('staff', 'status.manage',",
        "('staff', 'assignments.manage',",
        "('staff', 'training.view',",
        "('staff', 'training.manage',",
        "('staff', 'qualifications.view',",
        "('staff', 'qualifications.manage',",
        "('staff', 'documents.view',",
        "('staff', 'documents.manage',",
        "('staff', 'emergency.view',",
      ]) {
        expect(lower).toContain(code);
      }
    });

    it("does not reinsert base staff permissions (no view/create/update/assign_roles rows)", () => {
      for (const extra of [
        "('staff', 'view',",
        "('staff', 'create',",
        "('staff', 'update',",
        "('staff', 'assign_roles',",
      ]) {
        expect(lower).not.toContain(extra);
      }
    });

    it("seeds with ON CONFLICT DO NOTHING", () => {
      expect(lower).toContain("on conflict (module, action) do nothing");
    });
  });

  describe("role mapping", () => {
    it("maps CENTRE_MANAGER to all staff permissions", () => {
      expect(migration).toContain(
        "SELECT mgr, id FROM permissions WHERE module = 'staff'",
      );
    });

    it("maps SOCIAL_WORKER, CAREGIVER and ACCOUNTANT_BURSAR to view only", () => {
      for (const varRef of ["sw", "cg", "ab"]) {
        expect(
          migration.includes(
            `SELECT ${varRef}, id FROM permissions WHERE (module = 'staff' AND action = 'view')`,
          ),
        ).toBe(true);
      }
    });

    it("maps RECORDS_OFFICER to record-keeping permissions only", () => {
      expect(migration).toContain(
        "SELECT ro, id FROM permissions\n  WHERE (module = 'staff' AND action IN (",
      );
      expect(migration).toContain("'training.manage'");
      expect(migration).toContain("'documents.manage'");
    });
  });
});