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

  it("is the only role that deletes (child archive)", () => {
    expect(perms).toContain("children.archive");
  });

  it("is NOT involved in registration: no intake creation rights", () => {
    for (const p of [
      "children.create",
      "referrals.create",
      "admissions.create",
      "placements.create",
      "guardians.create",
    ]) {
      expect(perms).not.toContain(p);
    }
  });

  it("reviews child records and assessments without routinely creating them", () => {
    expect(perms).toContain("children.view");
    expect(perms).not.toContain("children.update");
    expect(perms).not.toContain("children.status.update");
    expect(perms).toContain("cases.assessments.view");
    expect(perms).not.toContain("cases.assessments.create");
    expect(perms).not.toContain("cases.assessments.update");
  });

  it("views/monitors education and resources without managing them", () => {
    expect(perms).toContain("education_development.view");
    expect(perms).toContain("resources.view");
    expect(perms).toContain("resources.assets.view");
    for (const p of [
      "education_development.education.manage",
      "education_development.support_needs.manage",
      "education_development.goals.manage",
      "education_development.progress.manage",
      "education_development.achievements.manage",
      "resources.manage",
      "resources.assets.manage",
      "resources.assets.costs",
      "resources.assets.status",
      "resources.assets.dispose",
      "resources.documents.upload",
    ]) {
      expect(perms).not.toContain(p);
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

describe("Manager team hub (accounts + directory merged, sections by permission)", () => {
  const team = src("src/app/(dashboard)/team/page.tsx");

  it("reserves account management for staff.create holders", () => {
    expect(team).toContain("staff.create");
    expect(team).toContain("TeamForm");
  });

  it("opens the directory to staff.view holders, others are redirected", () => {
    expect(team).toContain("staff.view");
    expect(team).toContain("StaffDirectory");
    expect(team).toContain('redirect("/children")');
  });

  it("has no standalone staff list page (merged; /staff redirects to /team)", () => {
    const { existsSync, readFileSync: read } = require("node:fs") as typeof import("node:fs");
    expect(existsSync(join(process.cwd(), "src/app/(dashboard)/staff/page.tsx"))).toBe(false);
    expect(read(join(process.cwd(), "next.config.ts"), "utf-8")).toContain('"/staff"');
  });
});

describe("Manager navigation (permission-driven menu)", () => {
  const layout = src("src/app/(dashboard)/layout.tsx");

  it("builds the menu from the user's own DB permissions", () => {
    expect(layout).toContain("getUserPermissions");
  });

  it("shows management areas (Team hub, Resources, Audit) and no separate Staff page", () => {
    for (const href of [
      'href="/team"',
      'href="/resources"',
      'href="/audit"',
      'href="/register"',
    ]) {
      expect(layout).toContain(href);
    }
    expect(layout).not.toContain('href="/staff"');
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

describe("Manager Approve / Reject where the work lives (no standalone page)", () => {
  const dash = src("src/app/(dashboard)/dashboard/page.tsx");
  const visits = src("src/app/(dashboard)/visits/page.tsx");
  const expenses = src("src/app/(dashboard)/resources/expenses/page.tsx");
  const buttons = src("src/app/(dashboard)/_components/approve-reject-buttons.tsx");

  it("has no standalone approvals page", () => {
    const { existsSync } = require("node:fs") as typeof import("node:fs");
    expect(existsSync(join(process.cwd(), "src/app/(dashboard)/approvals"))).toBe(false);
  });

  it("dashboard shows pending referrals/admissions with Approve/Reject inline", () => {
    expect(dash).toContain("PendingReviews");
    expect(dash).toContain("/api/referrals/");
    expect(dash).toContain("/api/admissions/");
    expect(dash).toContain("ApproveRejectButtons");
  });

  it("visits list shows Approve/Reject to approvers (via own caps)", () => {
    expect(visits).toContain("visits.approve");
    expect(visits).toContain("ApproveRejectButtons");
    expect(visits).toContain("/api/auth/me");
  });

  it("expenses list shows Approve/Reject for pending items to approvers", () => {
    expect(expenses).toContain("resources.approve");
    expect(expenses).toContain("ApproveRejectButtons");
  });

  it("shared buttons show Approve and Reject and refresh after acting", () => {
    expect(buttons).toContain("Approve");
    expect(buttons).toContain("Reject");
    expect(buttons).toContain("router.refresh");
  });
});
