import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  type CentreRole,
} from "@/types/role";
import {
  manualContributionSchema,
  publicContributionSchema,
  verifyContributionSchema,
} from "@/lib/centre-site/centre-needs.validation";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20261112000000_centre_need_contributions_verification.sql",
  ),
  "utf-8",
);
const lower = migration.toLowerCase();

const service = readFileSync(
  join(process.cwd(), "src/lib/centre-site/centre-needs.service.ts"),
  "utf-8",
);

describe("Centre Needs — verification migration", () => {
  it("adds the verification columns", () => {
    expect(lower).toContain("add column status text not null default 'pending'");
    expect(lower).toContain("add column transaction_reference text");
    expect(lower).toContain("add column contributor_name text");
    expect(lower).toContain("add column verified_by uuid");
    expect(lower).toContain("add column verified_at timestamptz");
  });

  it("constrains status to pending/verified/rejected", () => {
    expect(lower).toContain("status in ('pending', 'verified', 'rejected')");
  });

  it("allows PUBLIC contributions", () => {
    expect(lower).toContain(
      "check (source in ('online', 'manual', 'public'))",
    );
  });

  it("backfills existing rows as verified", () => {
    expect(lower).toContain("set status = 'verified'");
  });

  it("seeds site.needs.verify and grants it to the right roles", () => {
    expect(lower).toContain("('site', 'needs.verify'");
    expect(lower).toContain("'centre_manager', 'centre_it', 'accountant_bursar'");
  });
});

describe("Centre Needs — verified-only progress", () => {
  it("sums only verified contributions", () => {
    expect(service).toContain('.eq("status", "verified")');
  });

  it("creates public submissions as pending", () => {
    expect(service).toContain('source: "PUBLIC"');
    expect(service).toContain('status: "pending"');
  });

  it("creates manual entries as verified immediately", () => {
    expect(service).toContain('source: "MANUAL"');
    expect(service).toContain('status: "verified"');
    expect(service).toContain("verified_by: createdBy");
  });

  it("only verifies rows that are still pending", () => {
    expect(service).toContain('.eq("status", "pending")');
  });
});

describe("Centre Needs — verification permission", () => {
  it("defines site.needs.verify", () => {
    expect(PERMISSIONS.SITE_NEEDS_VERIFY).toBe("site.needs.verify");
  });

  it("grants verify to manager, IT and accountant", () => {
    for (const role of [
      "CENTRE_MANAGER",
      "CENTRE_IT",
      "ACCOUNTANT_BURSAR",
    ] as CentreRole[]) {
      expect(ROLE_PERMISSIONS[role]).toContain("site.needs.verify");
    }
  });

  it("does not give the accountant manage rights", () => {
    expect(ROLE_PERMISSIONS.ACCOUNTANT_BURSAR).not.toContain(
      "site.needs.manage",
    );
  });
});

describe("Centre Needs — contribution validation", () => {
  const needId = "11111111-1111-1111-1111-111111111111";

  it("accepts a valid public submission", () => {
    const parsed = publicContributionSchema.safeParse({
      needId,
      amount: "50000",
      transaction_reference: "MPESA-ABC123",
      contributor_name: "Asha",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.amount).toBe(50000);
    }
  });

  it("rejects a public submission without a reference", () => {
    const parsed = publicContributionSchema.safeParse({
      needId,
      amount: 50000,
      transaction_reference: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a non-positive amount", () => {
    for (const amount of [0, -100, "abc"]) {
      expect(
        publicContributionSchema.safeParse({
          needId,
          amount,
          transaction_reference: "REF-1",
        }).success,
      ).toBe(false);
    }
  });

  it("accepts a manual entry without a reference", () => {
    const parsed = manualContributionSchema.safeParse({
      needId,
      amount: 1000,
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts an empty manual reference as null", () => {
    const parsed = manualContributionSchema.safeParse({
      needId,
      amount: 1000,
      transaction_reference: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.transaction_reference).toBeNull();
    }
  });

  it("only accepts verify or reject actions", () => {
    for (const action of ["verify", "reject"]) {
      expect(
        verifyContributionSchema.safeParse({
          contributionId: needId,
          action,
        }).success,
      ).toBe(true);
    }
    expect(
      verifyContributionSchema.safeParse({
        contributionId: needId,
        action: "approve",
      }).success,
    ).toBe(false);
  });
});
