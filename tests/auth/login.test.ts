import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  CENTRE_ROLES,
  PLATFORM_ROLES,
} from "@/types/role";

/**
 * Authentication feature checks.
 *
 * These are static/unit invariants verifying that the login/sign-up flow
 * respects the role model and never exposes platform administration at
 * self-signup.
 */

const AUTH_ACTIONS_PATH = "src/lib/auth/auth-actions.ts";
const LOGIN_FORM_PATH = "src/app/(auth)/login/LoginForm.tsx";

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

describe("Auth — sign-up respects the role model", () => {
  it("self-sign-up never offers platform-administration", () => {
    const src = readFileSync(AUTH_ACTIONS_PATH, "utf8");
    expect(src).toContain("const SIGNUP_ROLES = CENTRE_ROLES");
    expect(src).toContain("SIGNUP_ROLES as readonly string[]");
  });
});
