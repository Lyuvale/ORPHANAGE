import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName, can } from "@/lib/auth/authorization.service";
import { createAdminClient } from "@/lib/supabase/admin";
import UsersForm, { type CentreOption } from "./UsersForm";

export const metadata = {
  title: "Create users",
};

export default async function AdminUsersPage() {
  const supabase = (await createClient()) as never;
  const ctx = await requireAppAccess(supabase, { allowInactiveSubscription: true });
  const roleName = await getUserRoleName(supabase, ctx);
  const canManage = await can(supabase, ctx, "platform.centres");

  if (roleName !== "PLATFORM_ADMINISTRATOR" || !canManage) {
    redirect("/children");
  }

  const admin = createAdminClient();
  const { data: centres } = await admin
    .from("centres")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  const options: CentreOption[] = (centres ?? []).map((c: { id: string; name: string }) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Create user accounts</h1>
        <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          PLATFORM ADMINISTRATOR
        </span>
      </div>
      <p className="text-sm text-gray-600">
        Create a centre manager account for a centre. Once signed in, the manager
        can create staff accounts for their own centre.
      </p>
      <UsersForm centres={options} />
      <p className="text-sm">
        <Link href="/admin" className="text-blue-600 hover:text-blue-800">
          Back to Platform Administration
        </Link>
      </p>
    </div>
  );
}
