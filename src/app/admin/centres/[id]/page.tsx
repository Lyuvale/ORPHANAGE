import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName } from "@/lib/auth/authorization.service";
import { AssignManagerForm } from "./_components/assign-manager-form";

async function getCentre(id: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("centres").select("*").eq("id", id).single();
  if (error || !data) return null;
  return data;
}

export default async function AdminCentreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const ctx = await requireAppAccess(supabase as never);
  const role = await getUserRoleName(supabase as never, ctx);

  if (role !== "PLATFORM_ADMINISTRATOR") {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const [centre, userProfiles, managerAssignments] = await Promise.all([
    getCentre(id),
    admin.from("user_profiles").select("*").eq("centre_id", id).order("last_name", { ascending: true }),
    admin.from("user_roles").select("*, role:roles(name), user_profile:user_profiles(*)").eq("centre_id", id).eq("status", "active"),
  ]);

  if (!centre) {
    notFound();
  }

  const currentManager = (managerAssignments.data ?? []).find(
    (row) => (row.role as { name?: string } | null)?.name === "CENTRE_MANAGER",
  )?.user_profile as
    | {
        id: string;
        first_name: string;
        last_name: string;
        email: string | null;
      }
    | undefined;

  const users = (userProfiles.data ?? []) as Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
  }>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/admin/centres" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to centres
          </Link>
          <h2 className="mt-3 text-3xl font-bold text-gray-900">{centre.name}</h2>
          <p className="text-sm font-mono text-gray-500">Code: {centre.code}</p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
            centre.status === "active"
              ? "bg-green-100 text-green-800"
              : centre.status === "pending"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
          }`}
        >
          {centre.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Centre information</h3>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoRow label="Email" value={centre.contact_email ?? "—"} />
            <InfoRow label="Phone" value={centre.contact_phone ?? "—"} />
            <InfoRow label="City" value={centre.city ?? "—"} />
            <InfoRow label="Country" value={centre.country ?? "—"} />
            <InfoRow label="Address" value={centre.address_line1 ?? "—"} />
            <InfoRow label="Created" value={new Date(centre.created_at).toLocaleString()} />
          </dl>
        </div>

        <AssignManagerForm
          centreId={centre.id}
          users={users}
          currentManager={currentManager ?? null}
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}
