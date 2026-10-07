import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { listCentres } from "@/lib/centres/centre.service";

export default async function AdminOverviewPage() {
  const admin = createAdminClient();
  const [{ count: centreCount }, { count: profileCount }] = await Promise.all([
    listCentres({ limit: 1 }),
    admin.from("user_profiles").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">
          Admin overview
        </p>
        <h2 className="mt-2 text-3xl font-bold text-gray-900">Platform control</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Centres" value={String(centreCount)} href="/admin/centres" />
        <SummaryCard title="Users" value={String(profileCount ?? 0)} href="/admin/users" />
        <SummaryCard title="Assign manager" value="Go" href="/admin/centres" />
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  href,
}: {
  title: string;
  value: string;
  href: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        <Link href={href} className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
          Open
        </Link>
      </div>
    </div>
  );
}
