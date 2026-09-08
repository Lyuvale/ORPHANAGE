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
      "visits.request",
      "health.view",
      "health.emergency.view",
      "education_development.view",
      "documents.upload",
      "staff.assignments.manage",
    ]) {
      expect(perms).toContain(p);
    }
  });

  it("views health without managing records", () => {
    for (const p of [
      "health.create",
      "health.medical_records.create",
      "health.medications.manage",
      "health.medications.administer",
      "health.appointments.manage",
      "health.screenings.manage",
      "health.immunizations.manage",
      "health.documents.upload",
    ]) {
      expect(perms).not.toContain(p);
    }
  });

  it("submits referrals/assessments/admissions but never reviews or approves", () => {
    for (const p of [
      "referrals.create",
      "referrals.update",
      "cases.assessments.create",
      "admissions.create",
    ]) {
      expect(perms).toContain(p);
    }
    for (const p of [
      "referrals.review",
      "referrals.approve",
      "referrals.reject",
      "visits.reject",
      "admissions.review",
    ]) {
      expect(perms).not.toContain(p);
    }
    // Visit approval stays with the social worker managing family contact.
    expect(perms).toContain("visits.approve");
  });

  it("does not own official child registration or placement records", () => {
    for (const p of [
      "children.create",
      "children.update",
      "children.status.update",
      "placements.update",
    ]) {
      expect(perms).not.toContain(p);
    }
    expect(perms).toContain("children.view");
    expect(perms).toContain("placements.view");
    expect(perms).toContain("placements.create");
  });

  it("views/follows up education without managing it", () => {
    expect(perms).toContain("education_development.view");
    for (const p of [
      "education_development.education.manage",
      "education_development.support_needs.manage",
      "education_development.goals.manage",
      "education_development.progress.manage",
      "education_development.achievements.manage",
    ]) {
      expect(perms).not.toContain(p);
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

  it("has no resources module at all", () => {
    expect(ROLE_PERMISSIONS.SOCIAL_WORKER.some((p) => p.startsWith("resources."))).toBe(false);
  });
});

describe("Social worker migration aligns the database", () => {
  const mig18 = src("supabase/migrations/20260918000000_correct_role_ownership.sql");
  const mig20 = src("supabase/migrations/20260920000000_submit_review_separation.sql");

  it("strips submit-approval, registration and education/resource management", () => {
    expect(mig18).toContain("SOCIAL_WORKER");
    expect(mig18).toContain("('admissions', 'review')");
    expect(mig18).toContain("('children', 'create')");
    expect(mig18).toContain("('placements', 'update')");
    expect(mig18).toContain("p.module IN ('resources')");
  });

  it("separates submit from review and grants caregiver assignment", () => {
    expect(mig20).toContain("SOCIAL_WORKER");
    expect(mig20).toContain("('referrals', 'review')");
    expect(mig20).toContain("('referrals', 'approve')");
    expect(mig20).toContain("('visits', 'reject')");
    expect(mig20).not.toContain("('visits', 'approve')");
    expect(mig20).toContain("assignments.manage");
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
