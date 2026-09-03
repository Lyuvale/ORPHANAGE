import Link from "next/link";
import ReportExportDialog from "@/app/(dashboard)/_components/report-export-dialog";
import ApproveRejectButtons from "@/app/(dashboard)/_components/approve-reject-buttons";
import { serverFetch } from "@/lib/server-fetch";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { can } from "@/lib/auth/authorization.service";

const REPORT_OPTIONS = [
  { value: "referrals", label: "Referrals List" },
  { value: "by-status", label: "Referrals by Status" },
];

async function getReferrals(searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (searchParams.status) params.set("status", searchParams.status);
  if (searchParams.source) params.set("source", searchParams.source);
  if (searchParams.search) params.set("search", searchParams.search);
  if (searchParams.limit) params.set("limit", searchParams.limit);
  if (searchParams.offset) params.set("offset", searchParams.offset);

  const res = await serverFetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/referrals?${params.toString()}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    return { data: [], count: 0 };
  }

  return res.json();
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    submitted: "bg-yellow-100 text-yellow-800",
    under_review: "bg-blue-100 text-blue-800",
    admitted: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    withdrawn: "bg-gray-100 text-gray-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-800"}`}
    >
      {status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    low: "bg-gray-100 text-gray-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[priority] ?? "bg-gray-100 text-gray-800"}`}
    >
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

export default async function ReferralsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { data: referrals, count } = await getReferrals(params);

  // Registration entry is visible only to roles that may create referrals.
  // Review actions are visible only to roles holding review/reject rights.
  let showRegister = false;
  let canReview = false;
  let canReject = false;
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as never, {
      allowInactiveSubscription: true,
    });
    showRegister = await can(supabase as never, ctx, "referrals.create");
    canReview = await can(supabase as never, ctx, "referrals.review");
    canReject = await can(supabase as never, ctx, "referrals.reject");
  } catch {
    showRegister = false;
    canReview = false;
    canReject = false;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Referrals</h1>
        <div className="flex items-center gap-3">
          <ReportExportDialog
            apiPath="/api/reports/referrals"
            title="Report / Export"
            options={REPORT_OPTIONS}
            fileName="referrals"
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
          placeholder="Search by name, reference, or reason..."
          defaultValue={params.search ?? ""}
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        />
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        >
          <option value="">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="admitted">Admitted</option>
          <option value="rejected">Rejected</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
        <select
          name="source"
          defaultValue={params.source ?? ""}
          className="block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        >
          <option value="">All Sources</option>
          <option value="police">Police</option>
          <option value="court">Court</option>
          <option value="hospital">Hospital</option>
          <option value="school">School</option>
          <option value="community">Community</option>
          <option value="government">Government</option>
          <option value="self_referral">Self Referral</option>
          <option value="other">Other</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Search
        </button>
      </form>

      {referrals.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No referrals found.</p>
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
                  Child Name
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Source
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Priority
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Submitted
                </th>
                {(canReview || canReject) && (
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {referrals.map(
                (referral: {
                  id: string;
                  reference_number: string;
                  child_first_name: string;
                  child_middle_name: string | null;
                  child_last_name: string;
                  source: string;
                  priority: string;
                  status: string;
                  submitted_at: string;
                }) => (
                  <tr key={referral.id}>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-mono text-gray-500">
                      <Link
                        href={`/referrals/${referral.id}`}
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        {referral.reference_number}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                      <Link
                        href={`/referrals/${referral.id}`}
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        {referral.child_first_name}
                        {referral.child_middle_name
                          ? ` ${referral.child_middle_name}`
                          : ""}{" "}
                        {referral.child_last_name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {referral.source.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <PriorityBadge priority={referral.priority} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <StatusBadge status={referral.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(referral.submitted_at).toLocaleDateString()}
                    </td>
                    {(canReview || canReject) && (
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        {(referral.status === "submitted" || referral.status === "under_review") ? (
                          <ApproveRejectButtons
                            url={`/api/referrals/${referral.id}`}
                            approveBody={{ new_status: "admitted" }}
                            rejectBody={{ new_status: "rejected" }}
                            showApprove={canReview}
                            showReject={canReject}
                          />
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-sm text-gray-500">
        {count} {count === 1 ? "referral" : "referrals"} total
      </p>
    </div>
  );
}
