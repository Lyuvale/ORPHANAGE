import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROLE_PERMISSIONS } from "@/types/role";

/**
 * ROLE 4 — RECORDS OFFICER (spec: responsibilities & access limits).
 *
 * The official registrar: full intake chain (referral, child, guardian,
 * admission, placement), child profiles/updates/status/history, documents,
 * education records, admin records.
 * Limits: no finance/sources/funds/expenses/assets, no restricted
 * safeguarding or confidential cases without permission, no user management,
 * no platform administration, no deleting history without process,
 * own centre only.
 */
function src(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf-8");
}

describe("Records officer static permissions (official registrar)", () => {
  const perms = ROLE_PERMISSIONS.RECORDS_OFFICER;

  it("holds the full intake creation chain", () => {
    for (const p of [
      "referrals.view",
      "referrals.create",
      "children.view",
      "children.create",
      "guardians.view",
      "guardians.create",
      "admissions.view",
      "admissions.create",
      "placements.view",
      "placements.create",
    ]) {
      expect(perms).toContain(p);
    }
  });

  it("manages records, documents, education and history", () => {
    for (const p of [
      "children.update",
      "children.status.update",
      "documents.view",
      "documents.upload",
      "cases.documents.view",
      "education_development.view",
      "education_development.education.manage",
      "reports.view",
      "audit.view",
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
      "resources.manage",
      "resources.assets.manage",
      "cases.create",
      "safeguarding.create",
    ]) {
      expect(perms).not.toContain(p);
    }
    for (const p of perms) {
      expect(p.startsWith("platform.")).toBe(false);
    }
  });
});

describe("Records officer migration aligns the database", () => {
  const mig = src("supabase/migrations/20260917000000_role_access_limits.sql");

  it("grants registrar rights and revokes user management", () => {
    expect(mig).toContain("RECORDS_OFFICER");
    expect(mig).toContain("('referrals', 'create')");
    expect(mig).toContain("('admissions', 'create')");
    expect(mig).toContain("('staff', 'create')");
    expect(mig).toContain("('staff', 'update')");
  });
});

describe("Records officer dashboard", () => {
  const dash = src("src/app/(dashboard)/dashboard/page.tsx");

  it("renders a records section with registration workload", () => {
    expect(dash).toContain("RECORDS_OFFICER");
    expect(dash).toContain("Registration");
  });
});
