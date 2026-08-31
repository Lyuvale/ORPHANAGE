import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName } from "@/lib/auth/authorization.service";
import TeamForm from "./TeamForm";

export const metadata = {
  title: "Manage team",
};

export default async function TeamPage() {
  const supabase = (await createClient()) as never;
  const ctx = await requireAppAccess(supabase);
  const roleName = await getUserRoleName(supabase, ctx);

  if (roleName !== "CENTRE_MANAGER") {
    redirect("/children");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Manage team</h1>
        <Link
          href="/staff"
          className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Staff records
        </Link>
      </div>
      <p className="text-sm text-gray-600">
        Create login accounts for your centre&apos;s staff. Each user is linked to{" "}
        <span className="font-medium">{ctx.centre.name}</span> and signed in with
        their email and password.
      </p>
      <TeamForm />
    </div>
  );
}
