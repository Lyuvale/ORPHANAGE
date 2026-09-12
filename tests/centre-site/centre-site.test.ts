import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { slugify } from "@/lib/centre-site/centre-site.service";
import {
  sitePageInputSchema,
  sitePageBlockSchema,
  siteThemeInputSchema,
} from "@/lib/centre-site/centre-site.validation";
import {
  SITE_BLOCK_TYPES,
  DEFAULT_SITE_THEME,
} from "@/types/centre-site";

function src(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf-8");
}

describe("Centre site — slugify", () => {
  it("lowercases and kebab-cases text", () => {
    expect(slugify("Our Story")).toBe("our-story");
    expect(slugify("  Welcome   Home  ")).toBe("welcome-home");
  });

  it("strips non-url-safe characters", () => {
    expect(slugify("Who We Are! (2026)")).toBe("who-we-are-2026");
  });

  it("removes leading/trailing dashes and collapses doubles", () => {
    expect(slugify("--about--")).toBe("about");
    expect(slugify("a---b")).toBe("a-b");
  });
});

describe("Centre site — block validation (discriminated union)", () => {
  const validHeading = { id: "b1", type: "heading", data: { level: 2, text: "Our Home" } };

  it("accepts every supported block type", () => {
    const blocks = [
      validHeading,
      { id: "b2", type: "paragraph", data: { text: "A paragraph" } },
      { id: "b3", type: "image", data: { src: "https://cdn.example/x.jpg", alt: "House" } },
      { id: "b4", type: "button", data: { label: "Donate", href: "https://example.com/donate" } },
      { id: "b5", type: "list", data: { items: ["A", "B"], ordered: false } },
      { id: "b6", type: "quote", data: { text: "Quote" } },
      { id: "b7", type: "divider", data: {} },
      { id: "b8", type: "video", data: { url: "https://youtube.com/embed/x" } },
      { id: "b9", type: "embed_html", data: { html: "<iframe ...></iframe>" } },
    ];
    for (const block of blocks) {
      expect(sitePageBlockSchema.safeParse(block).success).toBe(true);
    }
  });

  it("rejects unknown block types and missing ids", () => {
    expect(
      sitePageBlockSchema.safeParse({ id: "x", type: "totally-unknown", data: {} }).success,
    ).toBe(false);
    expect(
      sitePageBlockSchema.safeParse({ type: "paragraph", data: { text: "x" } }).success,
    ).toBe(false);
  });

  it("matches the exported block type list", () => {
    expect(SITE_BLOCK_TYPES).toEqual([
      "heading",
      "paragraph",
      "image",
      "button",
      "list",
      "quote",
      "divider",
      "video",
      "embed_html",
    ]);
  });
});

describe("Centre site — page schema", () => {
  it("accepts a full create payload", () => {
    const res = sitePageInputSchema.safeParse({
      title: "Our Story",
      slug: "our-story",
      nav_label: "Story",
      show_in_nav: true,
      nav_order: 1,
      is_published: false,
      is_home: false,
      meta_description: "About the centre",
      content: [{ id: "b1", type: "paragraph", data: { text: "Hello" } }],
    });
    expect(res.success).toBe(true);
  });

  it("requires a title", () => {
    expect(sitePageInputSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("rejects an invalid slug and respects a generated home flag", () => {
    expect(sitePageInputSchema.safeParse({ title: "X", slug: "Has Spaces" }).success).toBe(false);
    expect(sitePageInputSchema.safeParse({ title: "X", is_home: true }).success).toBe(true);
  });
});

describe("Centre site — theme schema", () => {
  it("accepts valid hex colours and https URLs", () => {
    const res = siteThemeInputSchema.safeParse({
      site_name: "Hope House",
      primary_color: "#4f46e5",
      accent_color: "#0ea5e9",
      logo_url: "https://cdn.example/logo.png",
      contact_email: "hello@hopekids.example",
    });
    expect(res.success).toBe(true);
  });

  it("rejects invalid hex colours and non-https URLs", () => {
    expect(siteThemeInputSchema.safeParse({ primary_color: "red" }).success).toBe(false);
    expect(siteThemeInputSchema.safeParse({ primary_color: "#12345" }).success).toBe(false);
    expect(siteThemeInputSchema.safeParse({ logo_url: "http://cdn.example/logo.png" }).success).toBe(false);
  });

  it("defaults mirror the default theme rows", () => {
    expect(DEFAULT_SITE_THEME.primary_color).toBe("#4f46e5");
    expect(DEFAULT_SITE_THEME.heading_font).toBe("ui-sans-serif");
    expect(DEFAULT_SITE_THEME.body_font).toBe("ui-sans-serif");
    expect(DEFAULT_SITE_THEME.logo_url).toBeNull();
  });
});

describe("Centre site — migrations align the database", () => {
  it("seeds the CENTRE_IT role and site permissions", () => {
    const mig = src("supabase/migrations/20260922000000_centre_site_roles.sql");
    expect(mig).toContain("CENTRE_IT");
    expect(mig).toContain("('site', 'view')");
    expect(mig).toContain("('site', 'pages.manage')");
    expect(mig).toContain("('site', 'theme.manage')");
    expect(mig).toContain("CENTRE_MANAGER");
  });

  it("creates the theme and pages tables with tenant + publishing columns", () => {
    const mig = src("supabase/migrations/20260922000001_centre_site_tables.sql");
    for (const token of [
      "CREATE TABLE centre_site_theme",
      "CREATE TABLE centre_site_pages",
      "centre_id        UUID NOT NULL REFERENCES centres",
      "is_published     BOOLEAN NOT NULL DEFAULT false",
      "is_home          BOOLEAN NOT NULL DEFAULT false",
      "content          JSONB NOT NULL DEFAULT '[]'",
      "UNIQUE (centre_id, slug)",
    ]) {
      expect(mig).toContain(token);
    }
  });
});

describe("Centre site — API routes are guarded", () => {
  const routes = [
    "src/app/api/centre-site/pages/route.ts",
    "src/app/api/centre-site/pages/[id]/route.ts",
    "src/app/api/centre-site/theme/route.ts",
  ];

  it("every management route calls requireAppAccess and requirePermission", () => {
    for (const route of routes) {
      const rs = src(route);
      expect(rs).toContain("requireAppAccess");
      expect(rs).toContain("requirePermission");
    }
  });

  it("PATCH/DELETE pages and PUT theme demand site management permissions", () => {
    const rs = src(routes[1]) + src(routes[2]);
    expect(rs).toContain('"site.pages.manage"');
    expect(rs).toContain('"site.theme.manage"');
  });

  it("the public site route is public (no auth guard)", () => {
    const pub = src("src/app/api/public/sites/[code]/route.ts");
    expect(pub).not.toContain("requireAppAccess");
    expect(pub).not.toContain("requirePermission");
    expect(pub).toContain("getPublicSite");
  });

  it("the public site service only serves active centres and published pages", () => {
    const svc = src("src/lib/centre-site/centre-site.service.ts");
    const pubRoute = src("src/app/api/public/sites/[code]/route.ts");
    expect(svc).toContain('.eq("code", centreCode)');
    expect(svc).toContain('.eq("status", "active")');
    expect(svc).toContain("publishedOnly: true");
    expect(pubRoute).toContain("getPublicSite");
  });
});