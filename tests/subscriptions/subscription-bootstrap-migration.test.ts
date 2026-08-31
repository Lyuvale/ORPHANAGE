import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260911000001_provision_initial_subscriptions.sql"),
  "utf-8",
);

const lower = migration.toLowerCase();

describe("Subscriptions Bootstrap Migration", () => {
  it("references the STANDARD reference plan", () => {
    expect(lower).toContain("lower(name) = 'standard'");
  });

  it("assigns an active subscription to every active centre lacking one", () => {
    expect(lower).toContain("from centres where status = 'active'");
    expect(lower).toContain("'active'");
  });

  it("sets a one-year term", () => {
    expect(migration).toContain("+ INTERVAL '1 year'");
  });

  it("is idempotent (skips centres that already have a subscription)", () => {
    expect(lower).toContain("exists (select 1 from subscriptions where centre_id");
    expect(lower).toContain("continue");
  });

  it("records an auditable provisioned history entry", () => {
    expect(migration).toContain("'PROVISIONED'");
    expect(migration).toContain("subscription_history");
  });
});
