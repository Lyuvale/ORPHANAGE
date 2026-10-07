import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminUsersPage() {
  const admin = createAdminClient();
  const { data: centres } = await admin.from("centres").select("*").order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">
          Create manager
        </p>
        <h2 className="mt-2 text-3xl font-bold text-gray-900">Choose a centre</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(centres ?? []).map((centre) => (
          <Link
            key={centre.id}
            href={`/admin/centres/${centre.id}`}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-gray-900">{centre.name}</p>
                <p className="mt-1 text-sm font-mono text-gray-500">{centre.code}</p>
              </div>
              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                {centre.status}
              </span>
            </div>

            <div className="mt-5 text-sm text-gray-600">
              <p>{centre.city ?? "No city"}</p>
              <p>{centre.contact_email ?? "No contact email"}</p>
            </div>

            <div className="mt-5 text-sm font-semibold text-indigo-600">Assign manager →</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
