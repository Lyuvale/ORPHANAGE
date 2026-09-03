import Link from "next/link";
import ReportExportDialog from "@/app/(dashboard)/_components/report-export-dialog";
import { serverFetch } from "@/lib/server-fetch";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { can } from "@/lib/auth/authorization.service";

const REPORT_OPTIONS = [
  { value: "summary", label: "Summary" },
  { value: "guardians", label: "Guardians" },
  { value: "relationships", label: "Relationships" },
];

async function getGuardians(searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (searchParams.status) params.set("status", searchParams.status);
  if (searchParams.search) params.set("search", searchParams.search);
  if (searchParams.limit) params.set("limit", searchParams.limit);
  if (searchParams.offset) params.set("offset", searchParams.offset);

  const res = await serverFetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/guardians?${params.toString()}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    return { data: [], count: 0 };
  }

  return res.json();
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
    deceased: "bg-red-100 text-red-800",
    unknown: "bg-yellow-100 text-yellow-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-800"}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default async function GuardiansListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { data: guardians, count } = await getGuardians(params);

  // Registration entry is visible only to roles that may create guardians.
  let showRegister = false;
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as never, {
      allowInactiveSubscription: true,
    });
    showRegister = await can(supabase as never, ctx, "guardians.create");
  } catch {
    showRegister = false;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Guardians</h1>
        <div className="flex items-center gap-3">
          <ReportExportDialog
            apiPath="/api/reports/guardians"
            title="Report / Export"
            options={REPORT_OPTIONS}
            fileName="guardians"
          />
          {showRegister && (
            <Link
              href="/register"
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              New Registration
            </Link>
          )}
        </div>
      </div>

      <form className="mb-6 flex gap-3">
        <input
          type="text"
          name="search"
          placeholder="Search by name, phone, or email..."
          defaultValue={params.search ?? ""}
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        />
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="deceased">Deceased</option>
          <option value="unknown">Unknown</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Search
        </button>
      </form>

      {guardians.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No guardians found.</p>
          {showRegister && (
            <Link
              href="/register"
              className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-500"
            >
              Start a new registration
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Name
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Phone
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Email
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Added
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {guardians.map(
                (guardian: {
                  id: string;
                  first_name: string;
                  middle_name: string | null;
                  last_name: string;
                  preferred_name: string | null;
                  phone: string | null;
                  email: string | null;
                  status: string;
                  created_at: string;
                }) => (
                  <tr key={guardian.id}>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                      <Link
                        href={`/guardians/${guardian.id}`}
                        className="text-indigo-600 hover:text-indigo-500 font-medium"
                      >
                        {guardian.preferred_name || guardian.first_name}
                        {guardian.middle_name
                          ? ` ${guardian.middle_name}`
                          : ""}{" "}
                        {guardian.last_name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {guardian.phone ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {guardian.email ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <StatusBadge status={guardian.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(guardian.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-sm text-gray-500">
        {count} {count === 1 ? "guardian" : "guardians"} total
      </p>
    </div>
  );
}
