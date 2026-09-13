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
const ENUM_MIGRATION =
  "supabase/migrations/20260913000002_add_centre_pending_enum.sql";

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

describe("Subscription security — donations serve the CENTRE's needs, not the SaaS subscription", () => {
  it("the public centre listing is governed by centre status + contributions, NOT subscription", () => {
    const route = src(PUBLIC_CENTRES);
    expect(route).toContain('.eq("status", "active")');
    expect(route).toContain('eq("enabled", true)');
    expect(route).not.toContain("loadSubscriptionForContext");
    expect(route).not.toContain("isSubscriptionValid");
  });

  it("the public donate route accepts donors for any active centre with contributions enabled", () => {
    const route = src(PUBLIC_DONATE);
    expect(route).toContain('centre.status !== "active"');
    expect(route).toContain('contribCfg.enabled !== true');
    expect(route).not.toContain("loadSubscriptionForContext");
    expect(route).not.toContain("isSubscriptionValid");
  });

  it("the public site service serves any active centre regardless of subscription", () => {
    const svc = src(PUBLIC_SITE_SVC);
    expect(svc).toContain('.eq("status", "active")');
    expect(svc).not.toContain("loadSubscriptionForContext");
    expect(svc).not.toContain("isSubscriptionValid");
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
    const enumMig = src(ENUM_MIGRATION);
    expect(enumMig).toContain("ALTER TYPE centre_status ADD VALUE IF NOT EXISTS 'pending'");
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