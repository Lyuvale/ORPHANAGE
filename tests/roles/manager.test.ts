import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROLE_PERMISSIONS, CENTRE_ROLES } from "@/types/role";

/**
 * ROLE 1 — CENTRE MANAGER (spec: responsibilities & access limits).
 *
 * Duties: centre operations, user accounts + roles + activation, monitoring,
 * authorised child info, caregiver assignments (+history), approvals, authorised
 * finance/resources, notifications, reports.
 * Limits: own centre only, no platform admin accounts, no platform settings,
 * no audit modification, no approval bypass.
 */
function src(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf-8");
}

describe("Manager static permissions (spec duties)", () => {
  const perms = ROLE_PERMISSIONS.CENTRE_MANAGER;

  it("manages centre users: create, update, assign roles, activate/deactivate", () => {
    for (const p of [
      "staff.create",
      "staff.update",
      "staff.assign_roles",
      "staff.status.manage",
      "staff.assignments.manage",
    ]) {
      expect(perms).toContain(p);
    }
  });

  it("views (never creates) finance; approves under approval rules", () => {
    expect(perms).toContain("finance.view");
    expect(perms).toContain("finance.approve");
    expect(perms).not.toContain("finance.create");
  });

  it("holds approval rights across referrals, case plans and visits", () => {
    expect(perms).toContain("referrals.approve");
    expect(perms).toContain("cases.plans.approve");
    expect(perms).toContain("visits.approve");
  });

  it("may read (never modify) the audit trail", () => {
    expect(perms).toContain("audit.view");
    expect(perms).not.toContain("audit.update");
    expect(perms).not.toContain("audit.delete");
  });

  it("has no platform administration permissions", () => {
    for (const p of perms) {
      expect(p.startsWith("platform.")).toBe(false);
    }
    expect(CENTRE_ROLES).toContain("CENTRE_MANAGER");
  });

  it("sees authorised reports, resources, notifications and subscriptions", () => {
    for (const p of [
      "reports.view",
      "reports.export",
      "resources.view",
      "notifications.view",
      "subscriptions.view_own",
    ]) {
      expect(perms).toContain(p);
    }
  });
});

describe("Manager team management is manager-only", () => {
  const team = src("src/app/(dashboard)/team/page.tsx");

  it("redirects non-managers away from user management", () => {
    expect(team).toContain("CENTRE_MANAGER");
    expect(team).toContain("redirect");
  });
});

describe("Manager navigation (permission-driven menu)", () => {
  const layout = src("src/app/(dashboard)/layout.tsx");

  it("builds the menu from the user's own DB permissions", () => {
    expect(layout).toContain("getUserPermissions");
  });

  it("shows management areas (Team, Staff, Resources, Audit, Register)", () => {
    for (const href of [
      'href="/team"',
      'href="/staff"',
      'href="/resources"',
      'href="/audit"',
      'href="/register"',
    ]) {
      expect(layout).toContain(href);
    }
  });
});

describe("Manager dashboard", () => {
  const dash = src("src/app/(dashboard)/dashboard/page.tsx");

  it("renders a manager section with centre oversight cards", () => {
    expect(dash).toContain("CENTRE_MANAGER");
    for (const text of ["Team", "Referrals", "Subscription"]) {
      expect(dash).toContain(text);
    }
  });
});
