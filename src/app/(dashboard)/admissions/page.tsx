import Link from "next/link";
import ReportExportDialog from "@/app/(dashboard)/_components/report-export-dialog";
import { serverFetch } from "@/lib/server-fetch";

const REPORT_OPTIONS = [
  { value: "admissions", label: "Admissions List" },
  { value: "by-status", label: "Admissions by Status" },
  { value: "summary", label: "Admissions Summary" },
];

async function getAdmissions(searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (searchParams.status) params.set("status", searchParams.status);
  if (searchParams.search) params.set("search", searchParams.search);
  if (searchParams.limit) params.set("limit", searchParams.limit);
  if (searchParams.offset) params.set("offset", searchParams.offset);

  const res = await serverFetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/admissions?${params.toString()}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    return { data: [], count: 0 };
  }

  return res.json();
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    denied: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-800"}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default async function AdmissionsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { data: admissions, count } = await getAdmissions(params);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admissions</h1>
        <div className="flex items-center gap-3">
          <ReportExportDialog
            apiPath="/api/reports/admissions"
            title="Report / Export"
            options={REPORT_OPTIONS}
            fileName="admissions"
          />
          <Link
            href="/admissions/new"
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            New Admission
          </Link>
        </div>
      </div>

      <form className="mb-6 flex gap-3">
        <input
          type="text"
          name="search"
          placeholder="Search by reference or decision..."
          defaultValue={params.search ?? ""}
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        />
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="denied">Denied</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Search
        </button>
      </form>

      {admissions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No admissions found.</p>
          <Link
            href="/admissions/new"
            className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            Create the first admission
          </Link>
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
                  Referral Ref
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Decision
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {admissions.map(
                (admission: {
                  id: string;
                  reference_number: string;
                  referral_id: string;
                  status: string;
                  decision: string | null;
                  created_at: string;
                }) => (
                  <tr key={admission.id}>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-mono text-gray-500">
                      <Link
                        href={`/admissions/${admission.id}`}
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        {admission.reference_number}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-mono text-gray-500">
                      {admission.referral_id.slice(0, 8)}...
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <StatusBadge status={admission.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {admission.decision ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(admission.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-sm text-gray-500">
        {count} {count === 1 ? "admission" : "admissions"} total
      </p>
    </div>
  );
}
