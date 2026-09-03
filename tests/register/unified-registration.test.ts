import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Unified intake page (/register): one registration flow chaining
 * referral -> child -> guardian (+ link) -> admission -> placement.
 *
 * Each section is visible only to roles holding the matching create
 * permission (enforced on the page and again by each POST route).
 */
function src(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf-8");
}

describe("Unified registration page gating (role-based visibility)", () => {
  const page = src("src/app/(dashboard)/register/page.tsx");

  it("checks all five creation permissions before rendering", () => {
    for (const perm of [
      "referrals.create",
      "children.create",
      "guardians.create",
      "admissions.create",
      "placements.create",
    ]) {
      expect(page).toContain(perm);
    }
  });

  it("redirects users with no creation rights to /children", () => {
    expect(page).toContain('redirect("/children")');
  });

  it("passes the centre id and per-section caps to the wizard", () => {
    expect(page).toContain("centreId");
    expect(page).toContain("caps");
  });
});

describe("Registration wizard chains records with tenant scoping", () => {
  const client = src("src/app/(dashboard)/register/RegisterClient.tsx");

  it("creates records in intake order through the existing POST routes", () => {
    for (const url of [
      "/api/referrals",
      "/api/children",
      "/api/guardians",
      "/api/guardians/relationships",
      "/api/admissions",
      "/api/placements",
    ]) {
      expect(client).toContain(url);
    }
  });

  it("attributes every record to the caller's own centre", () => {
    expect(client.match(/centre_id: centreId/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it("links the guardian to the child with relationship + primary flag", () => {
    expect(client).toContain("relationship_type");
    expect(client).toContain("is_primary");
  });

  it("shows each step only when the matching capability is present", () => {
    for (const cap of [
      "caps.referral",
      "caps.child",
      "caps.guardian",
      "caps.admission",
      "caps.placement",
    ]) {
      expect(client).toContain(cap);
    }
  });
});

describe("Creation POST routes default missing centre_id to the own centre", () => {
  const routes = [
    "src/app/api/children/route.ts",
    "src/app/api/referrals/route.ts",
    "src/app/api/admissions/route.ts",
    "src/app/api/placements/route.ts",
    "src/app/api/guardians/route.ts",
    "src/app/api/guardians/relationships/route.ts",
  ];

  for (const rel of routes) {
    it(`${rel} defaults centre_id while still rejecting other centres`, () => {
      const code = src(rel);
      expect(code).toContain("if (!body.centre_id) body.centre_id = ctx.centre.id;");
      expect(code).toContain("for another centre");
    });
  }
});

describe("Register navigation", () => {
  const layout = src("src/app/(dashboard)/layout.tsx");

  it("exposes a Register link to intake roles and keeps platform admin out", () => {
    expect(layout).toContain('href="/register"');
    expect(layout).toContain("canRegister");
    expect(layout).toContain('"/register"');
  });
});
