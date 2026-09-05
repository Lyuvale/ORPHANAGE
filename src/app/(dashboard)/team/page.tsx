import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { can } from "@/lib/auth/authorization.service";
import TeamForm from "./TeamForm";
import StaffDirectory from "./_components/staff-directory";

export const metadata = {
  title: "Team & Staff",
};

// People hub: user accounts (login access + roles) and the staff directory
// live together. Each section is shown only to roles holding the matching
// permission: account management is the Centre Manager's exclusive duty,
// while the directory is visible to every role with staff.view.
export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const supabase = (await createClient()) as never;
  const ctx = await requireAppAccess(supabase);

  let canManageAccounts = false;
  let canViewDirectory = false;
  try {
    canManageAccounts = await can(supabase, ctx, "staff.create");
    canViewDirectory = await can(supabase, ctx, "staff.view");
  } catch {
    canManageAccounts = false;
    canViewDirectory = false;
  }

  if (!canManageAccounts && !canViewDirectory) {
    redirect("/children");
  }

  const params = await searchParams;

  return (
    <div className="space-y-10">
      {canManageAccounts && (
        <section>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Manage team</h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Create login accounts for your centre&apos;s staff. Each user is linked to{" "}
            <span className="font-medium">{ctx.centre.name}</span> and signed in with
            their email and password.
          </p>
          <div className="mt-4">
            <TeamForm />
          </div>
        </section>
      )}

      {canViewDirectory && (
        <section>
          <StaffDirectory searchParams={params} canCreate={canManageAccounts} />
        </section>
      )}
    </div>
  );
}
