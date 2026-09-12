import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicSite, getSitePageBySlug } from "@/lib/centre-site/centre-site.service";
import BlockRenderer from "@/components/centre-site/block-renderer";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string; slug: string }>;
}): Promise<Metadata> {
  const { code, slug } = await params;
  const admin = createAdminClient();
  const site = await getPublicSite(admin, code);
  if (!site) return {};
  const page = await getSitePageBySlug(admin, site.centre.id, slug, { publishedOnly: true });
  if (!page) return {};
  return {
    title: `${page.title} — ${site.theme.site_name || site.centre.name}`,
    description: page.meta_description ?? undefined,
  };
}

export default async function CentreSitePageView({
  params,
}: {
  params: Promise<{ code: string; slug: string }>;
}) {
  const { code, slug } = await params;
  const admin = createAdminClient();
  const site = await getPublicSite(admin, code);
  if (!site) notFound();

  const page = await getSitePageBySlug(admin, site.centre.id, slug, { publishedOnly: true });
  if (!page) notFound();

  return (
    <article>
      <h1 className="text-3xl font-bold mb-2 text-gray-900">{page.title}</h1>
      {page.meta_description && (
        <p className="mb-6 text-gray-500 text-sm">{page.meta_description}</p>
      )}
      <BlockRenderer blocks={page.content} />
    </article>
  );
}