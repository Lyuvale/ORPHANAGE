import { describe, it, expect } from "vitest";
import { ROLE_PERMISSIONS, CENTRE_ROLES, PERMISSIONS } from "@/types/role";

/**
 * ROLE 6 — CENTRE_IT (IT Officer) (spec: responsibilities & access limits).
 *
 * Owns the centre's public website: builds pages and the site appearance.
 * Limits: site-only permissions; never children/sensitive records management,
 * finance, staff management or platform administration; own centre only.
 */
const perms = ROLE_PERMISSIONS.CENTRE_IT;

describe("Centre IT Officer (CENTRE_IT) static permissions", () => {
  it("is a recognised centre role (not the platform role)", () => {
    expect(CENTRE_ROLES).toContain("CENTRE_IT");
  });

  it("owns the website: view, pages.manage and theme.manage", () => {
    for (const p of ["site.view", "site.pages.manage", "site.theme.manage"]) {
      expect(perms).toContain(p);
    }
  });

  it("can view children minimally, but cannot manage records, finance, staff or platform", () => {
    for (const p of [
      "children.create",
      "children.update",
      "children.archive",
      "finance.view",
      "finance.create",
      "staff.create",
      "staff.assign_roles",
      "resources.manage",
      "reports.export",
      "audit.view",
    ]) {
      expect(perms).not.toContain(p);
    }
    for (const p of perms) {
      expect(p.startsWith("platform.")).toBe(false);
    }
  });

  it("is not given confidential case/safeguarding/health management", () => {
    for (const p of [
      "cases.create",
      "cases.update",
      "safeguarding.create",
      "safeguarding.update",
      "health.create",
      "health.update",
    ]) {
      expect(perms).not.toContain(p);
    }
  });
});

describe("Centre site permission catalogue", () => {
  it("defines the site permissions", () => {
    expect(PERMISSIONS.SITE_VIEW).toBe("site.view");
    expect(PERMISSIONS.SITE_PAGES_MANAGE).toBe("site.pages.manage");
    expect(PERMISSIONS.SITE_THEME_MANAGE).toBe("site.theme.manage");
  });

  it("grants the manager read-only oversight", () => {
    expect(ROLE_PERMISSIONS.CENTRE_MANAGER).toContain("site.view");
    expect(ROLE_PERMISSIONS.CENTRE_MANAGER).not.toContain("site.pages.manage");
    expect(ROLE_PERMISSIONS.CENTRE_MANAGER).not.toContain("site.theme.manage");
  });

  it("withholds site management from all other roles", () => {
    for (const role of [
      "SOCIAL_WORKER",
      "CAREGIVER",
      "RECORDS_OFFICER",
      "ACCOUNTANT_BURSAR",
    ]) {
      expect(ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]).not.toContain("site.pages.manage");
      expect(ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]).not.toContain("site.theme.manage");
    }
  });
});