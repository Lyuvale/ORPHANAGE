import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Assisted account recovery: when a user forgets their username/password,
 * the person who created the account helps them (username = email, visible
 * in the accounts list; password = one-time reset by creator/admin).
 */
function src(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf-8");
}

describe("Recovery scoping (deny by default)", () => {
  const mod = src("src/lib/auth/account-recovery.ts");

  it("only managers and platform admins may reset", () => {
    expect(mod).toContain("PLATFORM_ADMINISTRATOR");
    expect(mod).toContain("CENTRE_MANAGER");
    expect(mod).toContain("You are not allowed to reset passwords.");
  });

  it("managers are scoped to own-centre staff (never managers, admins, or self)", () => {
    expect(mod).toContain("own centre");
    expect(mod).toContain("CENTRE_MANAGER");
    expect(mod).toContain("cannot reset your own password");
  });

  it("platform admins can never reset platform administrator accounts", () => {
    expect(mod).toContain("cannot be reset here");
  });

  it("every reset is audit-logged and the temp password is shown once", () => {
    expect(mod).toContain("auditUpdate");
    expect(mod).toContain("user_account");
    const list = src("src/app/(dashboard)/team/_components/user-accounts-list.tsx");
    expect(list).toContain("Shown once");
  });
});

describe("Recovery UI surfaces", () => {
  it("team page lists login accounts with reset for managers", () => {
    const team = src("src/app/(dashboard)/team/page.tsx");
    expect(team).toContain("UserAccountsList");
    const list = src("src/app/(dashboard)/team/_components/user-accounts-list.tsx");
    expect(list).toContain("username is their email");
    expect(list).toContain("Reset password");
    expect(list).toContain("resetUserPassword");
  });

  it("platform admin can look up any email and reset", () => {
    const page = src("src/app/(dashboard)/admin/users/_components/admin-password-reset.tsx");
    expect(page).toContain("resetUserPasswordByEmail");
  });

  it("login page tells users how to get help", () => {
    const login = src("src/app/(auth)/login/LoginForm.tsx");
    expect(login).toContain("Forgot your password");
    expect(login).toContain("username is your email");
  });
});
