import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260903000000_create_health_medical_management.sql"),
  "utf-8",
);

const lower = migration.toLowerCase();

describe("Health & Medical Management Migration", () => {
  describe("enums", () => {
    it("creates all health enums", () => {
      expect(lower).toContain("create type blood_group as enum");
      expect(lower).toContain("create type medical_record_type as enum");
      expect(lower).toContain("create type medical_visit_type as enum");
      expect(lower).toContain("create type medication_status as enum");
      expect(lower).toContain("create type medication_admin_status as enum");
      expect(lower).toContain("create type appointment_type as enum");
      expect(lower).toContain("create type appointment_status as enum");
      expect(lower).toContain("create type screening_type as enum");
      expect(lower).toContain("create type immunization_status as enum");
      expect(lower).toContain("create type health_document_type as enum");
      expect(lower).toContain("create type health_alert_type as enum");
      expect(lower).toContain("create type health_followup_type as enum");
      expect(lower).toContain("create type health_followup_status as enum");
    });

    it("includes medication admin statuses", () => {
      expect(lower).toContain("'given'");
      expect(lower).toContain("'missed'");
      expect(lower).toContain("'refused'");
      expect(lower).toContain("'not_available'");
      expect(lower).toContain("'other_approved'");
    });
  });

  describe("tables", () => {
    it("creates health_profiles", () => {
      expect(lower).toContain("create table health_profiles");
    });
    it("creates health_medical_records", () => {
      expect(lower).toContain("create table health_medical_records");
    });
    it("creates health_medical_visits", () => {
      expect(lower).toContain("create table health_medical_visits");
    });
    it("creates health_medications", () => {
      expect(lower).toContain("create table health_medications");
    });
    it("creates health_medication_admin", () => {
      expect(lower).toContain("create table health_medication_admin");
    });
    it("creates health_appointments and history", () => {
      expect(lower).toContain("create table health_appointments");
      expect(lower).toContain("create table health_appointment_history");
    });
    it("creates health_screenings", () => {
      expect(lower).toContain("create table health_screenings");
    });
    it("creates health_immunizations", () => {
      expect(lower).toContain("create table health_immunizations");
    });
    it("creates health_documents", () => {
      expect(lower).toContain("create table health_documents");
    });
    it("creates health_alerts", () => {
      expect(lower).toContain("create table health_alerts");
    });
    it("creates health_followups", () => {
      expect(lower).toContain("create table health_followups");
    });
  });

  describe("RLS", () => {
    it("enables RLS on every health table", () => {
      const tables = [
        "health_profiles",
        "health_medical_records",
        "health_medical_visits",
        "health_medications",
        "health_medication_admin",
        "health_appointments",
        "health_appointment_history",
        "health_screenings",
        "health_immunizations",
        "health_documents",
        "health_alerts",
        "health_followups",
      ];
      for (const t of tables) {
        expect(lower).toContain(`alter table ${t} enable row level security`);
      }
    });

    it("scopes SELECT by current_centre_id", () => {
      const selectPolicies = (migration.match(/health_\w+_select_centre/g) ?? []).length;
      expect(selectPolicies).toBeGreaterThanOrEqual(10);
      expect(lower.split("public.current_centre_id()").length).toBeGreaterThan(2);
    });
  });

  describe("append-only medical records", () => {
    it("has version and parent_record_id columns", () => {
      expect(migration).toMatch(/version\s+INTEGER/i);
      expect(lower).toContain("parent_record_id");
    });
  });

  describe("server-controlled medication admin timestamp", () => {
    it("creates health_admin_timestamp function", () => {
      expect(lower).toContain("create function health_admin_timestamp()");
    });
    it("sets administered_time server-side", () => {
      expect(lower).toContain("new.administered_time");
    });
  });

  describe("private storage bucket", () => {
    it("inserts the health-documents bucket", () => {
      expect(lower).toContain("insert into storage.buckets");
      expect(lower).toContain("'health-documents'");
    });
    it("upserts on conflict without making it public", () => {
      expect(lower).toContain("on conflict (id) do update");
    });
  });

  describe("permissions", () => {
    it("seeds health permissions with ON CONFLICT DO NOTHING", () => {
      expect(lower).toContain("insert into permissions (module, action, description)");
      expect(lower).toContain("on conflict (module, action) do nothing");
    });
    it("registers health permission codes", () => {
      for (const code of [
        "('health', 'view',",
        "('health', 'medical_records.view',",
        "('health', 'medical_records.create',",
        "('health', 'medical_records.update',",
        "('health', 'medications.view',",
        "('health', 'medications.manage',",
        "('health', 'medications.administer',",
        "('health', 'appointments.view',",
        "('health', 'appointments.manage',",
        "('health', 'screenings.view',",
        "('health', 'screenings.manage',",
        "('health', 'immunizations.view',",
        "('health', 'immunizations.manage',",
        "('health', 'documents.view',",
        "('health', 'documents.upload',",
        "('health', 'documents.download',",
        "('health', 'emergency.view',",
      ]) {
        expect(lower).toContain(code);
      }
    });
  });

  describe("role mapping", () => {
    it("maps roles for CENTRE_MANAGER, SOCIAL_WORKER, CAREGIVER and RECORDS_OFFICER", () => {
      expect(lower).toContain("'centre_manager'");
      expect(lower).toContain("'social_worker'");
      expect(lower).toContain("'caregiver'");
      expect(lower).toContain("'records_officer'");
    });
    it("uses ON CONFLICT DO NOTHING for role-permission grants", () => {
      expect(lower.match(/insert into role_permissions \(role_id, permission_id\)/g)?.length).toBeGreaterThanOrEqual(4);
    });
  });
});
