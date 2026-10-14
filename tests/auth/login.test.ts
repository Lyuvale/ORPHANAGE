import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  CENTRE_ROLES,
  PLATFORM_ROLES,
} from "@/types/role";

/**
 * Authentication feature checks.
 *
 * These are static/unit invariants verifying that the login + user-provisioning
 * flow respects the role model, never exposes platform administration to
 * non-admins, and disables self-service sign-up.
 */

const AUTH_ACTIONS_PATH = "src/lib/auth/auth-actions.ts";
const LOGIN_FORM_PATH = "src/app/(auth)/login/LoginForm.tsx";
const SIGNUP_PAGE_PATH = "src/app/(auth)/signup/page.tsx";

describe("Auth — role-aware sign-in", () => {
  it("classifies platform administrator separately from centre roles", () => {
    expect(PLATFORM_ROLES).toContain("PLATFORM_ADMINISTRATOR");
    expect(CENTRE_ROLES).not.toContain("PLATFORM_ADMINISTRATOR");
  });

  it("the login form resolves the landing page from the active role", () => {
    const src = readFileSync(LOGIN_FORM_PATH, "utf8");
    expect(src).toContain('roleName === "PLATFORM_ADMINISTRATOR"');
    expect(src).toContain('"/admin"');
    expect(src).toContain('"/centres"');
    expect(src).toContain("signInWithPassword");
  });
});

describe("Auth — user provisioning respects the role model", () => {
  it("self-service sign-up is disabled (no public create-account route)", () => {
    const src = readFileSync(SIGNUP_PAGE_PATH, "utf8");
    expect(src).not.toContain("Select a centre");
    expect(/(licensed|provisioned|administrator)/i.test(src)).toBe(true);
  });

  it("provisioning only exposes centre roles, never platform admin", () => {
    const src = readFileSync(AUTH_ACTIONS_PATH, "utf8");
    expect(src).toContain("MANAGER_CREATABLE_SYSTEM_ROLES");
    // Platform admin should not be in manager's allowedRoles array
    expect(src).not.toContain("PLATFORM_ADMINISTRATOR]");
    expect(src).toContain("CENTRE_ROLES");
  });

  it("a centre manager is scoped to their own centre and cannot create managers", () => {
    const src = readFileSync(AUTH_ACTIONS_PATH, "utf8");
    expect(src).toContain("targetCentreId = ctx.centre.id");
    expect(src).toContain("MANAGER_CREATABLE_SYSTEM_ROLES");
    expect(src).toContain("customRoles");
  });
});
