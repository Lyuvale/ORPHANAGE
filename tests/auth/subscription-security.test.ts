import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CENTRE_STATUSES } from "@/types/centre";

function src(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf-8");
}

const PLATFORM_CENTRES = "src/app/api/platform/centres/route.ts";
const DASHBOARD_CENTRES_ID = "src/app/api/centres/[id]/route.ts";
const DASHBOARD_CENTRES = "src/app/api/centres/route.ts";
const PUBLIC_CENTRES = "src/app/api/public/centres/route.ts";
const PUBLIC_DONATE = "src/app/api/public/sites/[code]/donate/route.ts";
const PUBLIC_SITE_SVC = "src/lib/centre-site/centre-site.service.ts";
const UPLOAD = "src/app/api/centre-site/upload/route.ts";
const AUTH_ACTIONS = "src/lib/auth/auth-actions.ts";
const CENTRE_SERVICE = "src/lib/centres/centre.service.ts";
const BACKFILL_MIGRATION =
  "supabase/migrations/20260913000003_enforce_subscription_invariants.sql";

describe("Subscription security — invariant: an ACTIVE centre requires a valid subscription", () => {
  it("defines a pending status so creation is never active by default", () => {
    expect(CENTRE_STATUSES).toContain("pending");
  });

  it("the centre service defaults new centres to pending", () => {
    expect(src(CENTRE_SERVICE)).toContain('status: input.status ?? "pending"');
  });

  it("the dashboard centre POST never creates an active centre (provisions no subscription)", () => {
    const route = src(DASHBOARD_CENTRES);
    expect(route).not.toContain("status: parsed.data.status");
    // Activation is delegated to guarded platform operations.
  });

  it("platform centre creation inserts status pending and provisions a trial", () => {
    const route = src(PLATFORM_CENTRES);
    expect(route).toContain('status: "pending"');
    expect(route).toContain("createSubscription(");
    expect(route).toContain('status: "trial"');
    expect(route).toContain("Trial subscription provisioned automatically at centre creation.");
  });

  it("platform centre creation refuses to proceed when no plan exists", () => {
    const route = src(PLATFORM_CENTRES);
    expect(route).toContain("No active plan exists. Create a plan first");
  });
});

describe("Subscription security — centre activation is guarded", () => {
  it("platform activation requires a valid subscription", () => {
    const route = src(PLATFORM_CENTRES);
    expect(route).toContain("loadSubscriptionForContext");
    expect(route).toContain("isSubscriptionValid");
    expect(route).toContain("Cannot activate this centre — it has no valid subscription");
  });

  it("dashboard manager activation (PATCH) requires a valid subscription", () => {
    const route = src(DASHBOARD_CENTRES_ID);
    expect(route).toContain("status === \"active\"");
    expect(route).toContain("isSubscriptionValid");
    expect(route).toContain("Cannot activate this centre");
  });
});

describe("Subscription security — public surfaces only serve subscribed centres", () => {
  it("the public centre listing filters by valid subscription", () => {
    const route = src(PUBLIC_CENTRES);
    expect(route).toContain("loadSubscriptionForContext");
    expect(route).toContain("isSubscriptionValid");
  });

  it("the public donate route rejects unsubscribed centres", () => {
    const route = src(PUBLIC_DONATE);
    expect(route).toContain("loadSubscriptionForContext");
    expect(route).toContain("isSubscriptionValid");
    expect(route).toContain("Online donations are paused.");
  });

  it("the public site service returns null for unsubscribed centres", () => {
    const svc = src(PUBLIC_SITE_SVC);
    expect(svc).toContain("loadSubscriptionForContext");
    expect(svc).toContain("isSubscriptionValid");
  });
});

describe("Subscription security — staff uploads and provisioning require a valid subscription", () => {
  it("the centre-site upload route no longer bypasses the subscription gate", () => {
    const up = src(UPLOAD);
    expect(up).toContain("requireAppAccess");
    expect(up).not.toContain("allowInactiveSubscription");
  });

  it("user provisioning requires the caller to hold a valid subscription", () => {
    const mod = src(AUTH_ACTIONS);
    expect(mod).toContain("requireAppAccess(supabase)");
    expect(mod).not.toContain("allowInactiveSubscription: true");
  });
});

describe("Subscription security — backfill migration enforces the invariant on existing data", () => {
  const mig = src(BACKFILL_MIGRATION);

  it("extends the centre_status enum with pending", () => {
    expect(mig).toContain("ALTER TYPE centre_status ADD VALUE IF NOT EXISTS 'pending'");
  });

  it("is idempotent (skips centres that already have a subscription)", () => {
    const lower = mig.toLowerCase();
    expect(lower).toContain("exists (select 1 from subscriptions where centre_id");
    expect(lower).toContain("continue");
  });

  it("provisions a 14-day TRIAL for active centres with no subscription", () => {
    const lower = mig.toLowerCase();
    expect(lower).toContain("from centres where status = 'active'");
    expect(lower).toContain("'trial'");
    expect(lower).toContain("+ interval '14 days'");
  });

  it("records an auditable provisioned history entry", () => {
    expect(mig).toContain("'PROVISIONED'");
    expect(mig).toContain("subscription_history");
  });
});