import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260908000000_create_notifications.sql"),
  "utf-8",
);

const lower = migration.toLowerCase();

describe("Notifications Migration", () => {
  describe("enums", () => {
    it("creates the three notification enums", () => {
      expect(lower).toContain("create type notification_type as enum");
      expect(lower).toContain("create type notification_event as enum");
      expect(lower).toContain("create type notification_entity as enum");
    });

    it("includes the critical safeguarding and financial events", () => {
      expect(migration).toContain("'SAFEGUARDING_CONCERN'");
      expect(migration).toContain("'SAFEGUARDING_ACTION'");
      expect(migration).toContain("'EXPENSE_AWAITING_APPROVAL'");
      expect(migration).toContain("'FUND_BALANCE_ALERT'");
    });
  });

  describe("tables", () => {
    it("creates notifications and notification_preferences tables", () => {
      expect(lower).toContain("create table notifications ");
      expect(lower).toContain("create table notification_preferences ");
    });

    it("notifications are scoped to a centre and a single recipient", () => {
      expect(lower).toContain("centre_id");
      expect(lower).toContain("references centres(id) on delete restrict");
      expect(lower).toContain("recipient_user_id");
      expect(lower).toContain("references user_profiles(id) on delete cascade");
    });

    it("preferences are unique per (user, event)", () => {
      expect(migration).toContain("UNIQUE (user_id, event_type)");
    });
  });

  describe("RLS / tenant isolation", () => {
    it("enables RLS on both tables", () => {
      const notificationsIdx = lower.indexOf("create table notifications ");
      const prefsIdx = lower.indexOf("create table notification_preferences ");
      expect(lower.slice(notificationsIdx, notificationsIdx + 2000)).toContain(
        "enable row level security",
      );
      expect(lower.slice(prefsIdx, prefsIdx + 2000)).toContain("enable row level security");
    });

    it("a user can select only their own notifications within their centre", () => {
      expect(lower).toContain("current_centre_id()");
      expect(lower).toContain("recipient_user_id");
    });

    it("direct client writes to notifications are denied by default", () => {
      expect(lower).toContain("for insert with check (false)");
      expect(lower).toContain("for update using (false)");
      expect(lower).toContain("for delete using (false)");
    });
  });

  describe("permissions", () => {
    it("seeds notifications.view and notifications.manage permissions", () => {
      expect(migration).toContain("('notifications', 'view',");
      expect(migration).toContain("('notifications', 'manage',");
    });

    it("grants view to every system role", () => {
      expect(lower).toContain("module = 'notifications' and action = 'view'");
      expect(lower).toContain("select id from roles where is_system = true");
    });
  });
});
