import type { SupabaseClient } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserPermissions } from "@/lib/auth/authorization.service";
import { getSitePageById } from "@/lib/centre-site/centre-site.service";
import PageEditor from "@/app/(dashboard)/centre-site/_components/page-editor";
import type { SitePage } from "@/types/centre-site";

export const dynamic = "force-dynamic";

export default async function EditSitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
    allowInactiveSubscription: true,
  });
  const perms = new Set(await getUserPermissions(supabase as never, ctx));
  const canManage = perms.has("site.pages.manage");

  const admin = createAdminClient();
  const page = await getSitePageById(admin, ctx.centre.id, id);
  if (!page) notFound();

  if (!canManage) {
    redirect("/centre-site");
  }

  return (
    <PageEditor
      initialPage={page as SitePage}
      canManage={canManage}
      centreCode={ctx.centre.code}
    />
  );
}