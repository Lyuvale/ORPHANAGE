import { describe, it, expect } from "vitest";
import { evaluateSubscriptionAccess } from "@/lib/subscriptions/subscription.service";
import type {
  SubscriptionWithPlan,
  PlanWithFeatures,
  PlanFeature,
} from "@/types/subscription";

const TODAY = new Date("2026-09-11T00:00:00Z");

function makeFeatures(enabled: Partial<Record<string, boolean>> = {}): PlanFeature[] {
  const keys = ["CORE", "MANAGEMENT", "EXPORT", "ANALYTICS"];
  return keys.map((k) => ({
    id: `f-${k}`,
    plan_id: "plan-1",
    feature_key: k,
    feature_label: k,
    enabled: enabled[k] ?? false,
    created_at: "2026-01-01T00:00:00Z",
  }));
}

function makePlan(features: PlanFeature[]): PlanWithFeatures {
  return {
    id: "plan-1",
    name: "Standard",
    description: null,
    price: 120,
    billing_period: "MONTHLY",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    features,
  };
}

function makeSubscription(
  overrides: Partial<SubscriptionWithPlan> = {},
): SubscriptionWithPlan {
  return {
    id: "sub-1",
    centre_id: "centre-1",
    plan_id: "plan-1",
    status: "active",
    start_date: null,
    end_date: null,
    trial_ends_at: null,
    payment_status: null,
    payment_provider: null,
    payment_reference: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    plan: makePlan(makeFeatures()),
    ...overrides,
  };
}

describe("evaluateSubscriptionAccess", () => {
  it("denies access when there is no subscription", () => {
    const r = evaluateSubscriptionAccess(null, TODAY);
    expect(r.status).toBe("none");
    expect(r.valid).toBe(false);
    expect(r.validOnDate).toBe(false);
    expect(r.reason).toContain("does not have an active subscription");
    expect(r.enabledFeatures.size).toBe(0);
  });

  it("grants access for an active in-date subscription", () => {
    const sub = makeSubscription({ status: "active", end_date: "2026-12-31" });
    const r = evaluateSubscriptionAccess(sub, TODAY);
    expect(r.valid).toBe(true);
    expect(r.validOnDate).toBe(true);
    expect(r.enabledFeatures).toBeInstanceOf(Set);
  });

  it("grants access for a trial that has not yet ended", () => {
    const sub = makeSubscription({
      status: "trial",
      trial_ends_at: "2026-09-20",
      end_date: null,
    });
    const r = evaluateSubscriptionAccess(sub, TODAY);
    expect(r.valid).toBe(true);
    expect(r.validOnDate).toBe(true);
  });

  it("denies a trial whose end date has passed", () => {
    const sub = makeSubscription({
      status: "trial",
      trial_ends_at: "2026-09-01",
    });
    const r = evaluateSubscriptionAccess(sub, TODAY);
    expect(r.valid).toBe(true); // status alone is active
    expect(r.validOnDate).toBe(false); // but the date has lapsed
    expect(r.reason).toContain("trial period has ended");
  });

  it("denies an active subscription whose end_date has passed", () => {
    const sub = makeSubscription({ status: "active", end_date: "2026-08-31" });
    const r = evaluateSubscriptionAccess(sub, TODAY);
    expect(r.valid).toBe(true);
    expect(r.validOnDate).toBe(false);
    expect(r.reason).toContain("expired");
  });

  it("denies an expired subscription", () => {
    const sub = makeSubscription({ status: "expired", end_date: "2026-08-31" });
    const r = evaluateSubscriptionAccess(sub, TODAY);
    expect(r.valid).toBe(false);
    expect(r.validOnDate).toBe(false);
  });

  it("denies a suspended subscription with a clear reason", () => {
    const sub = makeSubscription({ status: "suspended" });
    const r = evaluateSubscriptionAccess(sub, TODAY);
    expect(r.valid).toBe(false);
    expect(r.validOnDate).toBe(false);
    expect(r.reason).toContain("suspended");
  });

  it("denies a cancelled subscription", () => {
    const sub = makeSubscription({ status: "cancelled" });
    const r = evaluateSubscriptionAccess(sub, TODAY);
    expect(r.valid).toBe(false);
    expect(r.validOnDate).toBe(false);
  });

  it("exposes enabled plan features as a Set of keys", () => {
    const sub = makeSubscription({
      plan: makePlan(makeFeatures({ CORE: true, MANAGEMENT: true })),
    });
    const r = evaluateSubscriptionAccess(sub, TODAY);
    expect(r.enabledFeatures.has("CORE")).toBe(true);
    expect(r.enabledFeatures.has("MANAGEMENT")).toBe(true);
    expect(r.enabledFeatures.has("EXPORT")).toBe(false);
    expect(r.enabledFeatures.has("ANALYTICS")).toBe(false);
  });
});
