import { describe, it, expect } from "vitest";
import {
  SUBSCRIPTION_STATUSES,
  BILLING_PERIODS,
  ACTIVE_SUBSCRIPTION_STATUSES,
  RESTRICTED_SUBSCRIPTION_STATUSES,
  PLAN_FEATURE_KEYS,
  isSubscriptionActiveStatus,
  getSubscriptionStatusDisplay,
  getSubscriptionStatusBadge,
  formatPlanDate,
} from "@/types/subscription";

describe("Subscription Types", () => {
  it("defines the five subscription statuses", () => {
    expect(SUBSCRIPTION_STATUSES).toEqual([
      "trial",
      "active",
      "expired",
      "suspended",
      "cancelled",
    ]);
  });

  it("defines billing periods", () => {
    expect(BILLING_PERIODS).toContain("ONETIME");
    expect(BILLING_PERIODS).toContain("MONTHLY");
    expect(BILLING_PERIODS).toContain("YEARLY");
  });

  it("only trial and active grant normal system access", () => {
    expect(ACTIVE_SUBSCRIPTION_STATUSES).toEqual(["trial", "active"]);
    expect(RESTRICTED_SUBSCRIPTION_STATUSES).toEqual([
      "expired",
      "suspended",
      "cancelled",
    ]);
    for (const s of ["trial", "active"] as const) {
      expect(isSubscriptionActiveStatus(s)).toBe(true);
    }
    for (const s of ["expired", "suspended", "cancelled"] as const) {
      expect(isSubscriptionActiveStatus(s)).toBe(false);
    }
  });

  it("groups statuses partition the full set with no overlap", () => {
    const all = [...ACTIVE_SUBSCRIPTION_STATUSES, ...RESTRICTED_SUBSCRIPTION_STATUSES];
    expect(new Set(all).size).toBe(SUBSCRIPTION_STATUSES.length);
    expect(all.sort()).toEqual([...SUBSCRIPTION_STATUSES].sort());
  });

  it("defines the plan feature keys", () => {
    expect(PLAN_FEATURE_KEYS).toContain("CORE");
    expect(PLAN_FEATURE_KEYS).toContain("MANAGEMENT");
    expect(PLAN_FEATURE_KEYS).toContain("EXPORT");
    expect(PLAN_FEATURE_KEYS).toContain("ANALYTICS");
  });

  it("provides display labels for every status", () => {
    expect(getSubscriptionStatusDisplay("active")).toBe("Active");
    expect(getSubscriptionStatusDisplay("trial")).toBe("Trial");
    expect(getSubscriptionStatusDisplay("suspended")).toBe("Suspended");
    expect(getSubscriptionStatusDisplay("cancelled")).toBe("Cancelled");
    expect(getSubscriptionStatusDisplay("expired")).toBe("Expired");
    expect(getSubscriptionStatusDisplay("none")).toBe("No Subscription");
  });

  it("provides a badge class for every status", () => {
    for (const s of [...SUBSCRIPTION_STATUSES, "none"] as const) {
      expect(getSubscriptionStatusBadge(s)).toContain("bg-");
    }
  });

  it("formats dates safely", () => {
    expect(formatPlanDate(null)).toBe("—");
    expect(formatPlanDate(undefined)).toBe("—");
    expect(formatPlanDate("not-a-date")).toBe("not-a-date");
    expect(formatPlanDate("2026-12-31")).not.toBe("—");
  });
});
