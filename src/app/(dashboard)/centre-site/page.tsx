import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserPermissions, getUserRoleName } from "@/lib/auth/authorization.service";
import { getSiteTheme, listSitePages } from "@/lib/centre-site/centre-site.service";
import SiteManager from "@/app/(dashboard)/centre-site/_components/site-manager";
import type { SitePage, SiteTheme } from "@/types/centre-site";

export const dynamic = "force-dynamic";

export default async function CentreSitePage() {
  const supabase = await createClient();
  const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
    allowInactiveSubscription: true,
  });

  const perms = new Set(await getUserPermissions(supabase as never, ctx));
  const role = await getUserRoleName(supabase as never, ctx);
  const canManagePages = perms.has("site.pages.manage");
  const canManageTheme = perms.has("site.theme.manage");
  const canViewNeeds = perms.has("site.needs.view");
  const canManageNeeds = perms.has("site.needs.manage");

  if (
    !perms.has("site.view") &&
    !canManagePages &&
    !canManageTheme &&
    !canViewNeeds &&
    !canManageNeeds
  ) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const [theme, pages] = await Promise.all([
    getSiteTheme(admin, ctx.centre.id),
    listSitePages(admin, ctx.centre.id),
  ]);

  const publicUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <SiteManager
      initialTheme={theme as SiteTheme}
      initialPages={pages.data as SitePage[]}
      centreCode={ctx.centre.code}
      centreName={ctx.centre.name}
      publicBaseUrl={publicUrl}
      canManagePages={canManagePages}
      canManageTheme={canManageTheme}
      canViewNeeds={canViewNeeds}
      canManageNeeds={canManageNeeds}
      roleLabel={role?.replace(/_/g, " ") ?? ""}
    />
  );
}