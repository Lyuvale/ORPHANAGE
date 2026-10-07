import Link from "next/link";
import { listCentres } from "@/lib/centres/centre.service";

export default async function AdminCentresPage() {
  const { data: centres } = await listCentres({ limit: 200 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">
            Centres
          </p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">Manage centres</h2>
        </div>
        <Link
          href="/admin/users"
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Create Manager
        </Link>
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
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
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

            <div className="mt-5 space-y-2 text-sm text-gray-600">
              <p>{centre.city ?? "City not set"}</p>
              <p>{centre.contact_email ?? "No contact email"}</p>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-4 text-sm">
              <span className="font-medium text-indigo-600">Open centre</span>
              <span aria-hidden="true">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
