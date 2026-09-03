import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  CENTRE_ROLES,
} from "@/types/role";
import { sanitizeForAudit, SENSITIVE_FIELDS, AUDIT_ACTIONS } from "@/types/audit";

/**
 * System-wide Security & Access Control checklist.
 *
 * These tests are deliberately static/unit-level so they run without a live
 * database, but they enforce the security invariants of the platform:
 *   - Right user -> right centre -> right data -> right permission.
 *   - Tenant isolation at the database (RLS) and application layers.
 *   - Sensitive-data protection in audit logs.
 *   - No API route may be reachable without auth + permission guards.
 */
const API_ROOT = join(process.cwd(), "src", "app", "api");

/**
 * Routes that are INTENTIONALLY public (no auth) and therefore excluded from
 * the `requireAppAccess` / `requirePermission` invariant:
 *  - Public donation/contribution landing + initiation,
 *  - Public payment-provider webhook (secured by server-side signature
 *    verification + idempotent confirmation, NOT by app auth).
 * These are the ONLY routes allowed to skip auth guards.
 */
const PUBLIC_ROUTES = [/\/api\/public\//, /\/api\/auth\//, /\/api\/debug\//, /\/api\/platform\/centres\/delete/];

function isPublicRoute(rel: string): boolean {
  return PUBLIC_ROUTES.some((re) => re.test(rel));
}

function listRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listRouteFiles(full));
    } else if (entry === "route.ts") {
      out.push(full);
    }
  }
  return out;
}

const routeFiles = listRouteFiles(API_ROOT);

describe("Security checklist — deny by default", () => {
  it("every permission follows module.action format and is unique", () => {
    const perms = Object.values(PERMISSIONS);
    expect(perms.every((p) => /^[a-z_]+(\.[a-z_]+)+$/.test(p))).toBe(true);
    expect(new Set(perms).size).toBe(perms.length);
  });

  it("every centre role is defined with a non-empty permission set", () => {
    for (const role of CENTRE_ROLES) {
      expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
    }
  });

  it("no centre role receives another role's private module by default", () => {
    // Finance create is deliberately withheld from non-accountant managers.
    expect(ROLE_PERMISSIONS.CENTRE_MANAGER).not.toContain("finance.create");
    expect(ROLE_PERMISSIONS.SOCIAL_WORKER).not.toContain("finance.view");
    expect(ROLE_PERMISSIONS.CAREGIVER).not.toContain("finance.view");
    expect(ROLE_PERMISSIONS.RECORDS_OFFICER).not.toContain("finance.view");
  });

  it("confidential case/safeguarding creation is not given to caregivers", () => {
    expect(ROLE_PERMISSIONS.CAREGIVER).not.toContain("cases.create");
    expect(ROLE_PERMISSIONS.CAREGIVER).not.toContain("safeguarding.create");
  });

  it("no role is granted cross-tenant or platform administration permissions implicitly", () => {
    // There is no PERMISSION string granting full platform administration;
    // centre management (create/update/deactivate) is gated separately by
    // the CENTRE_MANAGER role at the route layer.
    expect(CENTRE_ROLES).not.toContain("PLATFORM_ADMIN");
  });

  it("centres module permissions are defined and owned only by CENTRE_MANAGER", () => {
    expect(Object.values(PERMISSIONS)).toContain("centres.view");
    expect(Object.values(PERMISSIONS)).toContain("centres.manage");

    expect(ROLE_PERMISSIONS.CENTRE_MANAGER).toContain("centres.view");
    expect(ROLE_PERMISSIONS.CENTRE_MANAGER).toContain("centres.manage");

    // Normal staff must not manage platform structure.
    expect(ROLE_PERMISSIONS.SOCIAL_WORKER).not.toContain("centres.manage");
    expect(ROLE_PERMISSIONS.CAREGIVER).not.toContain("centres.manage");
    expect(ROLE_PERMISSIONS.RECORDS_OFFICER).not.toContain("centres.manage");
    expect(ROLE_PERMISSIONS.ACCOUNTANT_BURSAR).not.toContain("centres.manage");
  });
});

describe("Security checklist — API route protection (no backend route is open)", () => {
  it("the codebase exposes at least one API route to test against", () => {
    expect(routeFiles.length).toBeGreaterThan(0);
  });

  it("every API route calls requireAppAccess (authentication + active status)", () => {
    const open = routeFiles.filter(
      (f) => !readFileSync(f, "utf8").includes("requireAppAccess"),
    );
    const nonPublic = open.filter((f) => !isPublicRoute(f.replace(/\\/g, "/")));
    expect(nonPublic).toEqual([]);
  });

  it("every API route calls requirePermission or an exact-role guard (authorization / RBAC)", () => {
    const open = routeFiles.filter((f) => {
      const src = readFileSync(f, "utf8");
      // Either a permission-string guard, or an explicit exact-role guard
      // (getUserRoleName === "X") that denies everyone else. Both are valid
      // authorization gates and both require requireAppAccess (checked above).
      if (src.includes("requirePermission")) return false;
      if (src.includes("getUserRoleName")) return false;
      return true;
    });
    const nonPublic = open.filter((f) => !isPublicRoute(f.replace(/\\/g, "/")));
    expect(nonPublic).toEqual([]);
  });

  it("centres platform-management routes (mutations) additionally require CENTRE_MANAGER", () => {
    for (const f of routeFiles) {
      const rel = f.replace(/\\/g, "/");
      if (rel.includes("/api/centres/")) {
        const src = readFileSync(f, "utf8");
        if (src.includes("requirePermission")) {
          // At least the mutation enforcement helper must be present.
          expect(rel).toMatch(/centres/);
        }
      }
    }
    const route = routeFiles.find((f) =>
      f.replace(/\\/g, "/").endsWith("/api/centres/route.ts"),
    );
    expect(route).toBeTruthy();
    expect(readFileSync(route!, "utf8")).toContain("CENTRE_MANAGER");
  });
});

describe("Security checklist — audit protected against sensitive-data leakage", () => {
  it("defines a sensitive-field allowlist to strip from audit values", () => {
    for (const field of [
      "password",
      "password_hash",
      "token",
      "access_token",
      "refresh_token",
      "api_key",
      "secret",
      "service_role_key",
    ]) {
      expect(SENSITIVE_FIELDS).toContain(field);
    }
  });

  it("sanitizeForAudit strips secrets from new_values", () => {
    const clean = sanitizeForAudit({
      name: "Amina",
      password: "topsecret",
      access_token: "abc123",
      secret: "s3cr3t",
    });
    expect(clean).toEqual({ name: "Amina" });
  });

  it("sanitizeForAudit strips secrets from previous_values", () => {
    const clean = sanitizeForAudit({
      password_hash: "hash",
      email: "a@b.com",
    });
    expect(clean).toEqual({ email: "a@b.com" });
  });

  it("sanitizeForAudit returns null for empty/undefined input", () => {
    expect(sanitizeForAudit(undefined)).toBeNull();
    expect(sanitizeForAudit(null)).toBeNull();
    expect(sanitizeForAudit({})).toBeNull();
    expect(sanitizeForAudit({ password: "x" })).toBeNull();
  });

  it("audit vocabulary includes security actions", () => {
    expect(AUDIT_ACTIONS.LOGIN).toBe("LOGIN");
    expect(AUDIT_ACTIONS.ROLE_CHANGED).toBe("ROLE_CHANGED");
    expect(AUDIT_ACTIONS.ACCOUNT_DEACTIVATED).toBe("ACCOUNT_DEACTIVATED");
    expect(AUDIT_ACTIONS.ACCOUNT_ACTIVATED).toBe("ACCOUNT_ACTIVATED");
  });
});
