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

  it("offers placement only when the child step is present (ownership chain)", () => {
    expect(client).toContain("caps.placement && caps.child");
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

describe("Intake sections live together on the child; standalone lists removed", () => {
  it("children list gates its registration entry and links /register", () => {
    const code = src("src/app/(dashboard)/children/page.tsx");
    expect(code).toContain("children.create");
    expect(code).toContain('href="/register"');
    expect(code).toContain("showRegister");
  });

  it("referral/admission/placement/guardian list pages are deleted", () => {
    const { existsSync } = require("node:fs") as typeof import("node:fs");
    for (const rel of [
      "src/app/(dashboard)/referrals/page.tsx",
      "src/app/(dashboard)/admissions/page.tsx",
      "src/app/(dashboard)/placements/page.tsx",
      "src/app/(dashboard)/guardians/page.tsx",
    ]) {
      expect(existsSync(join(process.cwd(), rel))).toBe(false);
    }
  });

  it("exact list paths redirect to the children hub", () => {
    const config = src("next.config.ts");
    for (const p of ['"/referrals"', '"/admissions"', '"/placements"', '"/guardians"']) {
      expect(config).toContain(p);
    }
    expect(config).toContain('"/children"');
  });

  it("navigation has no standalone intake sections", () => {
    const layout = src("src/app/(dashboard)/layout.tsx");
    for (const href of [
      'href="/referrals"',
      'href="/admissions"',
      'href="/placements"',
      'href="/guardians"',
    ]) {
      expect(layout).not.toContain(href);
    }
    expect(layout).toContain('href="/children"');
    expect(layout).toContain('href="/register"');
  });

  it("child profile shows referral, admission, placement and guardians together", () => {
    const page = src("src/app/(dashboard)/children/[id]/page.tsx");
    for (const h of ["Referral", "Admission", "Placement", "Guardians"]) {
      expect(page).toContain(h);
    }
    expect(page).toContain("/api/referrals?child_id=");
    expect(page).toContain("/api/admissions?child_id=");
    expect(page).toContain("/api/placements?child_id=");
  });

  it("no references to the removed single-record pages remain", () => {
    const { readdirSync, statSync, readFileSync } = require("node:fs") as typeof import("node:fs");
    const { join: joinPath } = require("node:path") as typeof import("node:path");
    const roots = [
      join(process.cwd(), "src"),
      join(process.cwd(), "tests"),
    ];
    const leftovers: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = joinPath(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
        } else if (full.endsWith(".tsx") || full.endsWith(".ts")) {
          const text = readFileSync(full, "utf8");
          if (
            /"(children|referrals|admissions|placements|guardians)\/new"|'\/(children|referrals|admissions|placements|guardians)\/new/.test(
              text,
            )
          ) {
            leftovers.push(full);
          }
        }
      }
    };
    for (const root of roots) walk(root);
    expect(leftovers).toEqual([]);
  });
});
