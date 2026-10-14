import Link from "next/link";
import ReportExportDialog from "@/app/(dashboard)/_components/report-export-dialog";
import { serverFetch } from "@/lib/server-fetch";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { can } from "@/lib/auth/authorization.service";

const REPORT_OPTIONS = [
  { value: "by-status", label: "Children by Status" },
  { value: "detail", label: "Children Details" },
  { value: "by-age", label: "Children by Age Group" },
  { value: "admissions", label: "Admission History" },
  { value: "status-history", label: "Status History" },
];

async function getChildren(searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (searchParams.status) params.set("status", searchParams.status);
  if (searchParams.search) params.set("search", searchParams.search);
  if (searchParams.limit) params.set("limit", searchParams.limit);
  if (searchParams.offset) params.set("offset", searchParams.offset);

  const res = await serverFetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/children?${params.toString()}`,
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
    transferred: "bg-blue-100 text-blue-800",
    graduated: "bg-purple-100 text-purple-800",
    alumni: "bg-gray-100 text-gray-800",
    deactivated: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-800"}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default async function ChildrenListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { data: children, count } = await getChildren(params);

  // Registration entry is visible only to roles that may create children.
  let showRegister = false;
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as never, {
      allowInactiveSubscription: true,
    });
    showRegister = await can(supabase as never, ctx, "children.create");
  } catch {
    showRegister = false;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Children</h1>
        <div className="flex items-center gap-3">
          <ReportExportDialog
            apiPath="/api/reports/children"
            title="Report / Export"
            options={REPORT_OPTIONS}
            fileName="children"
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

      {/* Search and filter */}
      <form className="mb-6 flex gap-3">
        <input
          type="text"
          name="search"
          placeholder="Search by name or reference..."
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
          <option value="transferred">Transferred</option>
          <option value="graduated">Graduated</option>
          <option value="alumni">Alumni</option>
          <option value="deactivated">Deactivated</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Search
        </button>
      </form>

      {/* Children table */}
      {children.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center shadow-sm">
          <p className="text-sm text-slate-400">No children found.</p>
          {showRegister && (
            <Link
              href="/register"
              className="mt-4 inline-block text-sm font-semibold text-care-600 hover:text-care-700"
            >
              Start a new registration
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Reference
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Admission Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Date of Birth
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {children.map(
                (child: {
                  id: string;
                  reference_number: string;
                  first_name: string;
                  last_name: string;
                  middle_name: string | null;
                  status: string;
                  admission_date: string;
                  date_of_birth: string;
                }) => (
                  <tr key={child.id} className="transition-colors hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-slate-500">
                      <Link
                        href={`/children/${child.id}`}
                        className="text-care-600 hover:text-care-700"
                      >
                        {child.reference_number}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                      <Link
                        href={`/children/${child.id}`}
                        className="text-care-600 hover:text-care-700"
                      >
                        {child.first_name}
                        {child.middle_name ? ` ${child.middle_name}` : ""}{" "}
                        {child.last_name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <StatusBadge status={child.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                      {new Date(child.admission_date).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                      {new Date(child.date_of_birth).toLocaleDateString()}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-sm text-gray-500">
        {count} {count === 1 ? "child" : "children"} total
      </p>
    </div>
  );
}
