import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserPermissions } from "@/lib/auth/authorization.service";
import PageEditor from "@/app/(dashboard)/centre-site/_components/page-editor";

export const dynamic = "force-dynamic";

export default async function NewSitePage() {
  const supabase = await createClient();
  const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
    allowInactiveSubscription: true,
  });
  const perms = new Set(await getUserPermissions(supabase as never, ctx));
  const canManage = perms.has("site.pages.manage");

  if (!canManage) {
    redirect("/centre-site");
  }

  return <PageEditor initialPage={null} canManage={canManage} centreCode={ctx.centre.code} />;
}