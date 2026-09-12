import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicSite } from "@/lib/centre-site/centre-site.service";
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
  try {
    const site = await loadSite(code);
    return {
      title: site.theme.site_name || site.centre.name,
      icons: site.theme.favicon_url ? { icon: site.theme.favicon_url } : undefined,
    };
  } catch {
    return { title: "Centre" };
  }
}

function publicUrl(code: string, slug?: string): string {
  return slug ? `/s/${code}/${slug}` : `/s/${code}`;
}

export default async function CentreSiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const site = await loadSite(code);
  const { theme } = site;

  const navPages = site.pages
    .filter((p: SitePage) => p.show_in_nav && (p.is_home || p.is_published))
    .sort((a: SitePage, b: SitePage) => a.nav_order - b.nav_order);

  const homeOnward = navPages.filter((p: SitePage) => !p.is_home);
  const homePage = navPages.find((p: SitePage) => p.is_home);

  const title = theme.site_name || site.centre.name;

  return (
    <div
      className="min-h-screen flex flex-col bg-white text-gray-900"
      style={{ fontFamily: theme.body_font || undefined }}
    >
        {theme.custom_css ? (
          <style dangerouslySetInnerHTML={{ __html: theme.custom_css }} />
        ) : null}
        <header
          className="shadow-sm sticky top-0 z-20"
          style={{ backgroundColor: "#ffffff", color: theme.primary_color }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <Link href={publicUrl(code)} className="flex items-center gap-3 min-w-0">
              {theme.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={theme.logo_url} alt={`${title} logo`} className="h-10 w-10 rounded object-contain" />
              ) : null}
              <span className="font-semibold text-lg truncate" style={{ fontFamily: theme.heading_font || undefined }}>
                {title}
              </span>
            </Link>
            <nav className="flex items-center gap-1 overflow-x-auto">
              {homePage ? (
                <Link
                  href={publicUrl(code)}
                  className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-gray-100 whitespace-nowrap"
                >
                  Home
                </Link>
              ) : null}
              {homeOnward.map((p: SitePage) => (
                <Link
                  key={p.id}
                  href={publicUrl(code, p.slug)}
                  className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-gray-100 whitespace-nowrap"
                >
                  {p.nav_label || p.title}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-10">{children}</main>

        <footer
          className="mt-12 py-8"
          style={{ backgroundColor: theme.primary_color }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-sm text-white/90">
            <p className="font-medium">{theme.footer_text || `${title}`}</p>
            {(theme.contact_email || theme.contact_phone) && (
              <p className="mt-2 text-white/75">
                {theme.contact_email ? <span>{theme.contact_email}</span> : null}
                {theme.contact_email && theme.contact_phone ? <span> · </span> : null}
                {theme.contact_phone ? <span>{theme.contact_phone}</span> : null}
              </p>
            )}
            <p className="mt-4 text-white/60 text-xs">
              © {new Date().getFullYear()} {title}
            </p>
          </div>
        </footer>
    </div>
  );
}