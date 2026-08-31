import Link from "next/link";
import { STAFF_STATUSES, getStaffStatusDisplay } from "@/types/staff";
import { CENTRE_ROLES } from "@/types/role";
import ReportExportDialog from "@/app/(dashboard)/_components/report-export-dialog";

const REPORT_OPTIONS = [
  { value: "summary", label: "Staff Summary" },
  { value: "staff", label: "Staff List" },
  { value: "by-role", label: "Staff by Role" },
  { value: "assignments", label: "Staff Assignments" },
];

async function getOverview() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/staff/overview`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

async function getStaff(searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (searchParams.search) params.set("search", searchParams.search);
  if (searchParams.employment_status) params.set("employment_status", searchParams.employment_status);
  if (searchParams.operational_role) params.set("operational_role", searchParams.operational_role);
  if (searchParams.department) params.set("department", searchParams.department);

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/staff?${params.toString()}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    return { data: [], count: 0 };
  }

  return res.json();
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    ON_LEAVE: "bg-amber-100 text-amber-800",
    SUSPENDED: "bg-orange-100 text-orange-800",
    INACTIVE: "bg-gray-100 text-gray-800",
    ENDED: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-800"}`}
    >
      {getStaffStatusDisplay(status as (typeof STAFF_STATUSES)[number])}
    </span>
  );
}

export default async function StaffDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const [overview, { data: staff, count }] = await Promise.all([
    getOverview(),
    getStaff(params),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="mt-1 text-sm text-gray-500">
            Workforce &amp; staff operations for the centre
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ReportExportDialog
            apiPath="/api/reports/staff"
            title="Report / Export"
            options={REPORT_OPTIONS}
            fileName="staff"
          />
          <Link
            href="/staff/new"
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Add Staff
          </Link>
        </div>
      </div>

      {/* Workforce snapshot */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-2xl font-bold text-green-600">
            {overview?.total_active ?? "-"}
          </div>
          <div className="text-sm text-gray-500">Active</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-2xl font-bold text-amber-600">
            {overview?.on_leave ?? "-"}
          </div>
          <div className="text-sm text-gray-500">On Leave</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-2xl font-bold text-orange-600">
            {overview?.suspended ?? "-"}
          </div>
          <div className="text-sm text-gray-500">Suspended</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-2xl font-bold text-red-600">
            {overview?.ended ?? "-"}
          </div>
          <div className="text-sm text-gray-500">Ended</div>
        </div>
      </div>

      {/* Role breakdown */}
      {overview?.by_role?.length ? (
        <div className="mb-6 rounded-lg border bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            By Operational Role
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {overview.by_role.map(
              (entry: { operational_role: string | null; count: number }) => (
                <span
                  key={entry.operational_role ?? "Unassigned"}
                  className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                >
                  {entry.operational_role ?? "Unassigned"} · {entry.count}
                </span>
              ),
            )}
          </div>
        </div>
      ) : null}

      {/* Search and filter */}
      <form className="mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          name="search"
          placeholder="Search by job title, department or identifier..."
          defaultValue={params.search ?? ""}
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 md:flex-1"
        />
        <select
          name="employment_status"
          defaultValue={params.employment_status ?? ""}
          className="block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        >
          <option value="">All Statuses</option>
          {STAFF_STATUSES.map((s) => (
            <option key={s} value={s}>
              {getStaffStatusDisplay(s)}
            </option>
          ))}
        </select>
        <select
          name="operational_role"
          defaultValue={params.operational_role ?? ""}
          className="block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        >
          <option value="">All Roles</option>
          {CENTRE_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Search
        </button>
      </form>

      {/* Staff table */}
      {staff.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-500">No staff members found.</p>
          <Link
            href="/staff/new"
            className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            Add the first staff member
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  ID / Job Title
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Department
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Operational Role
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Start Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {staff.map(
                (s: {
                  id: string;
                  staff_identifier: string | null;
                  job_title: string;
                  department: string | null;
                  operational_role: string | null;
                  employment_status: string;
                  start_date: string | null;
                }) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <Link
                        href={`/staff/${s.id}`}
                        className="font-semibold text-indigo-600 hover:text-indigo-500"
                      >
                        {s.job_title}
                      </Link>
                      {s.staff_identifier && (
                        <div className="font-mono text-xs text-gray-500">
                          {s.staff_identifier}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                      {s.department || "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                      {s.operational_role || "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <StatusBadge status={s.employment_status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {s.start_date ? new Date(s.start_date).toLocaleDateString() : "-"}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-sm text-gray-500">
        {count} {count === 1 ? "staff member" : "staff members"} total
      </p>
    </div>
  );
}