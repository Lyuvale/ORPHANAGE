import { describe, it, expect } from "vitest";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_EVENTS,
  NOTIFICATION_ENTITIES,
  OPTIONAL_NOTIFICATION_EVENTS,
  CRITICAL_NOTIFICATION_EVENTS,
  isCriticalEvent,
  getNotificationTypeDisplay,
  getNotificationTypeBadge,
  getNotificationEntityDisplay,
  formatNotificationTime,
  getNotificationEntityDisplay as _entityDisplay,
} from "@/types/notifications";
import type { Notification } from "@/types/notifications";

const UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("Notifications Types", () => {
  describe("enums", () => {
    it("defines four notification types", () => {
      expect(NOTIFICATION_TYPES).toEqual([
        "INFORMATION",
        "ACTION_REQUIRED",
        "WARNING",
        "URGENT",
      ]);
    });

    it("defines twenty-two notification events", () => {
      expect(NOTIFICATION_EVENTS).toHaveLength(22);
      expect(NOTIFICATION_EVENTS).toContain("SAFEGUARDING_CONCERN");
      expect(NOTIFICATION_EVENTS).toContain("EXPENSE_AWAITING_APPROVAL");
      expect(NOTIFICATION_EVENTS).toContain("FUND_BALANCE_ALERT");
      expect(NOTIFICATION_EVENTS).toContain("CHILD_ADMITTED");
      expect(NOTIFICATION_EVENTS).toContain("SUBSCRIPTION_EXPIRING");
      expect(NOTIFICATION_EVENTS).toContain("SUBSCRIPTION_EXPIRED");
      expect(NOTIFICATION_EVENTS).toContain("SUBSCRIPTION_ACTIVATED");
      expect(NOTIFICATION_EVENTS).toContain("SUBSCRIPTION_SUSPENDED");
      expect(NOTIFICATION_EVENTS).toContain("SUBSCRIPTION_TRIAL_EXPIRING");
    });

    it("defines notification entities", () => {
      expect(NOTIFICATION_ENTITIES).toContain("CHILD");
      expect(NOTIFICATION_ENTITIES).toContain("SAFEGUARDING");
      expect(NOTIFICATION_ENTITIES).toContain("EXPENSE");
      expect(NOTIFICATION_ENTITIES).toContain("CENTRE");
    });
  });

  describe("critical vs optional events", () => {
    it("safeguarding, financial accountability, account and centre events are critical", () => {
      expect(CRITICAL_NOTIFICATION_EVENTS).toContain("SAFEGUARDING_CONCERN");
      expect(CRITICAL_NOTIFICATION_EVENTS).toContain("SAFEGUARDING_ACTION");
      expect(CRITICAL_NOTIFICATION_EVENTS).toContain("EXPENSE_AWAITING_APPROVAL");
      expect(CRITICAL_NOTIFICATION_EVENTS).toContain("FUND_BALANCE_ALERT");
      expect(CRITICAL_NOTIFICATION_EVENTS).toContain("ACCOUNT_ACTION");
      expect(CRITICAL_NOTIFICATION_EVENTS).toContain("CENTRE_STATUS_CHANGED");
    });

    it("routine events are optional (can be opted out)", () => {
      expect(OPTIONAL_NOTIFICATION_EVENTS).toContain("CHILD_ADMITTED");
      expect(OPTIONAL_NOTIFICATION_EVENTS).toContain("VISIT_SCHEDULED");
      expect(OPTIONAL_NOTIFICATION_EVENTS).toContain("SOURCE_RECORDED");
      expect(OPTIONAL_NOTIFICATION_EVENTS).toContain("EXPENSE_APPROVED");
    });

    it("critical and optional sets are disjoint and cover all events", () => {
      const overlap = CRITICAL_NOTIFICATION_EVENTS.filter((e) =>
        OPTIONAL_NOTIFICATION_EVENTS.includes(e),
      );
      expect(overlap).toEqual([]);
      const total = new Set([...CRITICAL_NOTIFICATION_EVENTS, ...OPTIONAL_NOTIFICATION_EVENTS]);
      expect(total.size).toBe(NOTIFICATION_EVENTS.length);
    });

    it("isCriticalEvent returns true only for critical events", () => {
      expect(isCriticalEvent("SAFEGUARDING_CONCERN")).toBe(true);
      expect(isCriticalEvent("EXPENSE_AWAITING_APPROVAL")).toBe(true);
      expect(isCriticalEvent("CHILD_ADMITTED")).toBe(false);
      expect(isCriticalEvent(null)).toBe(false);
      expect(isCriticalEvent(undefined)).toBe(false);
    });
  });

  describe("display helpers", () => {
    it("formats notification types", () => {
      expect(getNotificationTypeDisplay("INFORMATION")).toBe("Information");
      expect(getNotificationTypeDisplay("ACTION_REQUIRED")).toBe("Action Required");
      expect(getNotificationTypeDisplay("WARNING")).toBe("Warning");
      expect(getNotificationTypeDisplay("URGENT")).toBe("Urgent");
    });

    it("assigns a badge class per type", () => {
      expect(getNotificationTypeBadge("URGENT")).toContain("bg-red-100");
      expect(getNotificationTypeBadge("WARNING")).toContain("bg-orange-100");
      expect(getNotificationTypeBadge("INFORMATION")).toContain("bg-sky-100");
    });

    it("formats entity labels and defaults to System", () => {
      expect(getNotificationEntityDisplay("CHILD")).toBe("Child");
      expect(getNotificationEntityDisplay("SAFEGUARDING")).toBe("Safeguarding");
      expect(_entityDisplay(null)).toBe("System");
      expect(_entityDisplay(undefined)).toBe("System");
    });

    it("formats ISO timestamps", () => {
      const iso = "2026-08-30T14:22:00.000Z";
      expect(formatNotificationTime(iso)).toBeTruthy();
      expect(formatNotificationTime(null)).toBe("");
      expect(formatNotificationTime(undefined)).toBe("");
      expect(formatNotificationTime("not-a-date")).toBe("");
    });
  });

  describe("model", () => {
    it("models a notification with safe summary and related record link", () => {
      const n: Notification = {
        id: "n1",
        centre_id: UUID,
        recipient_user_id: "u1",
        title: "Safeguarding concern recorded",
        message: "A new safeguarding concern has been recorded and requires review.",
        type: "URGENT",
        event_type: "SAFEGUARDING_CONCERN",
        entity_type: "SAFEGUARDING",
        entity_id: "c1",
        route: "/children/c1",
        is_critical: true,
        is_read: false,
        read_at: null,
        created_by: "u2",
        created_at: new Date().toISOString(),
      };
      expect(n.entity_type).toBe("SAFEGUARDING");
      expect(n.is_critical).toBe(true);
      expect(n.route).toBe("/children/c1");
    });
  });
});
