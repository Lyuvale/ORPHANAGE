import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SitePage,
  SiteTheme,
  PublicSite,
  SitePageBlock,
} from "@/types/centre-site";
import { DEFAULT_SITE_THEME } from "@/types/centre-site";
import { listPublicNeeds } from "@/lib/centre-site/centre-needs.service";
import type { SitePageInput, SitePagePatch, SiteThemeInput } from "@/lib/centre-site/centre-site.validation";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

// ─── Helpers ─────────────────────────────────────────────────

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
}

async function uniqueSlug(admin: AdminClient, centreId: string, base: string, excludeId?: string): Promise<string> {
  const candidate = slugify(base) || "page";
  let slug = candidate;
  let n = 2;
  for (;;) {
    const { data, error } = await admin
      .from("centre_site_pages")
      .select("id")
      .eq("centre_id", centreId)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(`Failed to check slug: ${error.message}`);
    if (!data || data.id === excludeId) return slug;
    slug = `${candidate}-${n}`;
    n += 1;
  }
}

// ─── Theme ───────────────────────────────────────────────────

export async function getSiteTheme(admin: AdminClient, centreId: string): Promise<SiteTheme> {
  const { data, error } = await admin
    .from("centre_site_theme")
    .select("*")
    .eq("centre_id", centreId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to load site theme: ${error.message}`);
  }
  if (data) return data as SiteTheme;

  const { data: created, error: insertError } = await admin
    .from("centre_site_theme")
    .insert({ centre_id: centreId, ...DEFAULT_SITE_THEME })
    .select()
    .single();

  if (insertError || !created) {
    // Race: another request may have just created the row.
    if (insertError?.code === "23505") return getSiteTheme(admin, centreId);
    throw new Error(`Failed to initialise site theme: ${insertError?.message}`);
  }
  return created as SiteTheme;
}

export async function updateSiteTheme(
  admin: AdminClient,
  centreId: string,
  input: SiteThemeInput,
  updatedBy: string,
): Promise<SiteTheme> {
  const current = await getSiteTheme(admin, centreId);
  const { data, error } = await admin
    .from("centre_site_theme")
    .update({ ...current, ...input, centre_id: centreId, updated_by: updatedBy })
    .eq("centre_id", centreId)
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to save site theme: ${error?.message}`);
  return data as SiteTheme;
}

// ─── Pages ───────────────────────────────────────────────────

export async function listSitePages(
  admin: AdminClient,
  centreId: string,
  opts: { publishedOnly?: boolean } = {},
): Promise<{ data: SitePage[]; count: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = admin
    .from("centre_site_pages")
    .select("*", { count: "exact" })
    .eq("centre_id", centreId);
  if (opts.publishedOnly) q = q.eq("is_published", true);
  q = q.order("nav_order", { ascending: true }).order("created_at", { ascending: true });

  const { data, error, count } = await q;
  if (error) throw new Error(`Failed to list site pages: ${error.message}`);
  return { data: (data ?? []) as SitePage[], count: count ?? 0 };
}

export async function getSitePageById(admin: AdminClient, centreId: string, pageId: string): Promise<SitePage | null> {
  const { data, error } = await admin
    .from("centre_site_pages")
    .select("*")
    .eq("id", pageId)
    .eq("centre_id", centreId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to load page: ${error.message}`);
  }
  return (data as SitePage | null) ?? null;
}

export async function getSitePageBySlug(
  admin: AdminClient,
  centreId: string,
  slug: string,
  opts: { publishedOnly?: boolean } = {},
): Promise<SitePage | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = admin
    .from("centre_site_pages")
    .select("*")
    .eq("centre_id", centreId)
    .eq("slug", slug);
  if (opts.publishedOnly) q = q.eq("is_published", true);
  q = q.maybeSingle();

  const { data, error } = await q;
  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to load page: ${error.message}`);
  }
  return (data as SitePage | null) ?? null;
}

export async function createSitePage(
  admin: AdminClient,
  centreId: string,
  input: SitePageInput,
  userId: string,
): Promise<SitePage> {
  const title = input.title.trim();
  const slug = input.slug?.trim() || (await uniqueSlug(admin, centreId, title));

  if (input.is_home) {
    await admin
      .from("centre_site_pages")
      .update({ is_home: false })
      .eq("centre_id", centreId)
      .eq("is_home", true);
  }

  const { data, error } = await admin
    .from("centre_site_pages")
    .insert({
      centre_id: centreId,
      title,
      slug,
      nav_label: input.nav_label ?? null,
      show_in_nav: input.show_in_nav ?? true,
      nav_order: input.nav_order ?? 0,
      is_published: input.is_published ?? false,
      is_home: input.is_home ?? false,
      meta_description: input.meta_description ?? null,
      content: (input.content ?? []) as SitePageBlock[],
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A page with this slug already exists. Try a different title.");
    }
    throw new Error(`Failed to create page: ${error.message}`);
  }
  return data as SitePage;
}

export async function updateSitePage(
  admin: AdminClient,
  centreId: string,
  pageId: string,
  patch: SitePagePatch,
  userId: string,
): Promise<SitePage> {
  const existing = await getSitePageById(admin, centreId, pageId);
  if (!existing) throw new Error("Page not found");

  const next: Record<string, unknown> = { updated_by: userId };

  if (patch.title !== undefined) next.title = patch.title.trim();
  if (patch.slug !== undefined) {
    next.slug = patch.slug.trim() || (await uniqueSlug(admin, centreId, String(patch.title ?? existing.title), pageId));
  }
  if (patch.nav_label !== undefined) next.nav_label = patch.nav_label;
  if (patch.show_in_nav !== undefined) next.show_in_nav = patch.show_in_nav;
  if (patch.nav_order !== undefined) next.nav_order = patch.nav_order;
  if (patch.meta_description !== undefined) next.meta_description = patch.meta_description;
  if (patch.content !== undefined) next.content = patch.content as SitePageBlock[];

  if (patch.is_home) {
    await admin
      .from("centre_site_pages")
      .update({ is_home: false })
      .eq("centre_id", centreId)
      .eq("is_home", true)
      .neq("id", pageId);
  }
  if (patch.is_home !== undefined) next.is_home = patch.is_home;
  if (patch.is_published !== undefined) next.is_published = patch.is_published;

  const { data, error } = await admin
    .from("centre_site_pages")
    .update(next)
    .eq("id", pageId)
    .eq("centre_id", centreId)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A page with this slug already exists.");
    }
    throw new Error(`Failed to update page: ${error.message}`);
  }
  return data as SitePage;
}

export async function deleteSitePage(admin: AdminClient, centreId: string, pageId: string): Promise<void> {
  const { error } = await admin
    .from("centre_site_pages")
    .delete()
    .eq("id", pageId)
    .eq("centre_id", centreId);
  if (error) throw new Error(`Failed to delete page: ${error.message}`);
}

// ─── Public site ─────────────────────────────────────────────

export async function getPublicSite(admin: AdminClient, centreCode: string): Promise<PublicSite | null> {
  const { data: centre, error: centreError } = await admin
    .from("centres")
    .select("id, name, code")
    .eq("code", centreCode)
    .eq("status", "active")
    .maybeSingle();

  if (centreError && centreError.code !== "PGRST116") {
    throw new Error(`Failed to load centre: ${centreError.message}`);
  }
  if (!centre) return null;

  const theme = await getSiteTheme(admin, centre.id);
  const pages = await listSitePages(admin, centre.id, { publishedOnly: true });
  const needs = await listPublicNeeds(admin, centre.id);

  return {
    centre: { id: centre.id, name: centre.name, code: centre.code },
    theme,
    pages: pages.data,
    needs,
  };
}