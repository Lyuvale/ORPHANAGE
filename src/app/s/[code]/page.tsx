import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicSite } from "@/lib/centre-site/centre-site.service";
import BlockRenderer from "@/components/centre-site/block-renderer";
import type { PublicSite, SitePage } from "@/types/centre-site";

export const dynamic = "force-dynamic";

async function loadSite(code: string): Promise<PublicSite> {
  const admin = createAdminClient();
  const site = await getPublicSite(admin, code);
  if (!site) notFound();
  return site;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const site = await loadSite(code);
  return { title: site.theme.site_name || site.centre.name };
}

export default async function CentreSiteHome({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const site = await loadSite(code);

  // The home page is the flagged is_home page; fall back to the first
  // published page so the website never shows an empty root.
  const page =
    site.pages.find((p: SitePage) => p.is_home && p.is_published) ??
    site.pages.find((p: SitePage) => p.is_published);

  if (!page) {
    return (
      <div className="text-center py-24">
        <h1 className="text-2xl font-semibold text-gray-800">
          {site.theme.site_name || site.centre.name}
        </h1>
        <p className="mt-3 text-gray-500">
          This website is still under construction.
        </p>
      </div>
    );
  }

  return (
    <article>
      {page.meta_description && (
        <p className="mb-6 text-gray-500 text-sm">{page.meta_description}</p>
      )}
      <BlockRenderer blocks={page.content} />
    </article>
  );
}