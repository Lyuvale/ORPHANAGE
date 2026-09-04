import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROLE_PERMISSIONS } from "@/types/role";

/**
 * ROLE 5 — ACCOUNTANT/BURSAR (spec: responsibilities & access limits).
 *
 * Duties: sources, funds, budgets, expenses (+evidence, submit for approval,
 * track status), benefits linked to expenses/children, procurement,
 * inventory, assets, financial/resource reports + export.
 * Limits: no user management, no confidential cases/safeguarding by default,
 * no platform administration, own centre only, never approve own transaction.
 */
function src(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf-8");
}

describe("Accountant static permissions (spec duties)", () => {
  const perms = ROLE_PERMISSIONS.ACCOUNTANT_BURSAR;

  it("manages finance and resource accountability", () => {
    for (const p of [
      "finance.view",
      "finance.create",
      "finance.approve",
      "resources.view",
      "resources.manage",
      "resources.approve",
      "resources.reports",
      "resources.assets.view",
      "resources.assets.manage",
      "resources.assets.costs",
      "resources.assets.status",
      "resources.assets.dispose",
      "resources.documents.view",
      "resources.documents.upload",
      "reports.view",
      "reports.export",
      "children.view",
      "guardians.view",
      "notifications.view",
    ]) {
      expect(perms).toContain(p);
    }
  });

  it("cannot manage users, cases, safeguarding or platform", () => {
    for (const p of [
      "staff.create",
      "staff.update",
      "staff.assign_roles",
      "staff.status.manage",
      "cases.view",
      "cases.create",
      "safeguarding.view",
      "safeguarding.create",
      "daily_care.create",
      "admissions.create",
    ]) {
      expect(perms).not.toContain(p);
    }
    for (const p of perms) {
      expect(p.startsWith("platform.")).toBe(false);
    }
  });
});

describe("Separation of duties (never approve own transaction)", () => {
  const approval = src("src/app/api/resources/expenses/[id]/approval/route.ts");

  it("blocks self-approval at the endpoint", () => {
    expect(approval).toContain("resources.approve");
    expect(approval).toContain("cannot approve your own");
  });
});

describe("Accountant dashboard", () => {
  const dash = src("src/app/(dashboard)/dashboard/page.tsx");

  it("renders an accountant section with finance workload", () => {
    expect(dash).toContain("ACCOUNTANT_BURSAR");
    for (const text of ["Expenses", "Funds", "Assets"]) {
      expect(dash).toContain(text);
    }
  });
});
