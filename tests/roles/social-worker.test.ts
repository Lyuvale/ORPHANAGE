import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROLE_PERMISSIONS } from "@/types/role";

/**
 * ROLE 2 — SOCIAL WORKER (spec: responsibilities & access limits).
 *
 * Duties: referrals, assessments, cases (+notes/follow-ups/plans),
 * family/guardian info, safeguarding, visits, relevant health/education,
 * authorised documents.
 * Limits: no user management, no general finance, no sources/funds/assets
 * management, no platform administration, own centre only.
 */
function src(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf-8");
}

describe("Social worker static permissions (spec duties)", () => {
  const perms = ROLE_PERMISSIONS.SOCIAL_WORKER;

  it("handles the full welfare chain", () => {
    for (const p of [
      "referrals.view",
      "referrals.create",
      "referrals.review",
      "cases.view",
      "cases.create",
      "cases.notes.create",
      "cases.plans.create",
      "cases.assessments.create",
      "cases.interventions.create",
      "safeguarding.view",
      "safeguarding.create",
      "safeguarding.escalate",
      "guardians.view",
      "guardians.create",
      "guardians.relationship.manage",
      "visits.view",
      "visits.create",
      "health.view",
      "education_development.view",
      "documents.upload",
    ]) {
      expect(perms).toContain(p);
    }
  });

  it("cannot manage users, finance, assets or platform", () => {
    for (const p of [
      "staff.create",
      "staff.update",
      "staff.assign_roles",
      "staff.status.manage",
      "finance.view",
      "finance.create",
      "finance.approve",
      "resources.manage",
      "resources.assets.manage",
      "audit.view",
    ]) {
      expect(perms).not.toContain(p);
    }
    for (const p of perms) {
      expect(p.startsWith("platform.")).toBe(false);
    }
  });
});

describe("Social worker dashboard", () => {
  const dash = src("src/app/(dashboard)/dashboard/page.tsx");

  it("renders a social worker section with welfare workload cards", () => {
    expect(dash).toContain("SOCIAL_WORKER");
    for (const text of ["Referrals", "Cases", "Safeguarding", "Visits"]) {
      expect(dash).toContain(text);
    }
  });
});
