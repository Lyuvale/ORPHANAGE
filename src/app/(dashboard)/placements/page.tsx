import Link from "next/link";
import ReportExportDialog from "@/app/(dashboard)/_components/report-export-dialog";
import { serverFetch } from "@/lib/server-fetch";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { can } from "@/lib/auth/authorization.service";

const REPORT_OPTIONS = [
  { value: "placements", label: "Placements List" },
  { value: "by-status", label: "Placements by Status" },
];

async function getPlacements(searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (searchParams.status) params.set("status", searchParams.status);
  if (searchParams.placement_type) params.set("placement_type", searchParams.placement_type);
  if (searchParams.search) params.set("search", searchParams.search);
  if (searchParams.limit) params.set("limit", searchParams.limit);
  if (searchParams.offset) params.set("offset", searchParams.offset);

  const res = await serverFetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/placements?${params.toString()}`,
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
    completed: "bg-blue-100 text-blue-800",
    transferred: "bg-purple-100 text-purple-800",
    discharged: "bg-gray-100 text-gray-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-800"}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default async function PlacementsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { data: placements, count } = await getPlacements(params);

  // Registration entry is visible only to roles that may create placements.
  let showRegister = false;
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as never, {
      allowInactiveSubscription: true,
    });
    showRegister = await can(supabase as never, ctx, "placements.create");
  } catch {
    showRegister = false;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Placements</h1>
        <div className="flex items-center gap-3">
          <ReportExportDialog
            apiPath="/api/reports/placements"
            title="Report / Export"
            options={REPORT_OPTIONS}
            fileName="placements"
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
          placeholder="Search by reference, bed, or room..."
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
          <option value="completed">Completed</option>
          <option value="transferred">Transferred</option>
          <option value="discharged">Discharged</option>
        </select>
        <select
          name="placement_type"
          defaultValue={params.placement_type ?? ""}
          className="block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        >
          <option value="">All Types</option>
          <option value="residential">Residential</option>
          <option value="foster">Foster Care</option>
          <option value="adoption">Adoption</option>
          <option value="transitional">Transitional</option>
          <option value="temporary">Temporary</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Search
        </button>
      </form>

      {placements.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No placements found.</p>
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
                  Reference
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Child ID
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Type
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Bed/Room
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
              {placements.map(
                (placement: {
                  id: string;
                  reference_number: string;
                  child_id: string;
                  placement_type: string;
                  bed_reference: string | null;
                  room_number: string | null;
                  status: string;
                  start_date: string;
                }) => (
                  <tr key={placement.id}>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-mono text-gray-500">
                      <Link
                        href={`/placements/${placement.id}`}
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        {placement.reference_number}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-mono text-gray-500">
                      {placement.child_id.slice(0, 8)}...
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {placement.placement_type.charAt(0).toUpperCase() + placement.placement_type.slice(1)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {placement.bed_reference ?? "-"} / {placement.room_number ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <StatusBadge status={placement.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(placement.start_date).toLocaleDateString()}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-sm text-gray-500">
        {count} {count === 1 ? "placement" : "placements"} total
      </p>
    </div>
  );
}
