import Link from "next/link";
import { notFound } from "next/navigation";
import { formatTsh, getBenefitTypeDisplay } from "@/types/resources";
import AuditHistory from "../../_components/audit-history";
import { serverFetch } from "@/lib/server-fetch";
import CaregiverAssignment from "./_components/caregiver-assignment";

async function getChild(id: string) {
  const res = await serverFetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/children/${id}`,
    { cache: "no-store" },
  );

  if (!res.ok) return null;
  return res.json();
}

async function getChildBenefits(childId: string) {
  const res = await serverFetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/resources/children/${childId}/benefits`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
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

export default async function ChildProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getChild(id);

  if (!result?.data) {
    notFound();
  }

  const child = result.data;
  const history = child.status_history ?? [];
  const benefits = await getChildBenefits(id);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/children"
          className="text-sm font-semibold text-gray-900 hover:text-indigo-600"
        >
          &larr; Back to Children
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {child.first_name}
            {child.middle_name ? ` ${child.middle_name}` : ""}{" "}
            {child.last_name}
          </h1>
          <p className="mt-1 text-sm text-gray-500 font-mono">
            {child.reference_number}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={child.status} />
          <Link
            href={`/children/${child.id}/edit`}
            className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Basic Information */}
      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">
            Basic Information
          </h2>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Full Name</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                {child.first_name}
                {child.middle_name ? ` ${child.middle_name}` : ""}{" "}
                {child.last_name}
                {child.preferred_name
                  ? ` (${child.preferred_name})`
                  : ""}
              </dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">
                Date of Birth
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                {new Date(child.date_of_birth).toLocaleDateString()}
              </dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Gender</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                {child.gender.charAt(0).toUpperCase() + child.gender.slice(1)}
              </dd>
            </div>
            {child.nationality && (
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Nationality
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                  {child.nationality}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Admission Information */}
      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">
            Admission Information
          </h2>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">
                Admission Date
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                {new Date(child.admission_date).toLocaleDateString()}
              </dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm sm:col-span-2">
                <StatusBadge status={child.status} />
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Status History */}
      {history.length > 0 && (
        <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">
              Status History
            </h2>
          </div>
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {history.map(
                (entry: {
                  id: string;
                  previous_status: string | null;
                  new_status: string;
                  changed_at: string;
                  reason: string | null;
                }) => (
                  <li key={entry.id} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={entry.new_status} />
                      {entry.previous_status && (
                        <span className="text-sm text-gray-500">
                          from {entry.previous_status}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {new Date(entry.changed_at).toLocaleString()}
                      {entry.reason && ` — ${entry.reason}`}
                    </div>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Activity / Audit History */}
      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Activity History</h2>
          <p className="mt-1 text-sm text-gray-500">
            Audit trail of changes made to this child&apos;s record.
          </p>
        </div>
        <AuditHistory entityType="child" entityId={child.id} />
      </div>

      {/* Education & Development */}
      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              Education & Development
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Profile, support needs, goals, progress and achievements
            </p>
          </div>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link
              href={`/education/profile?child_id=${child.id}`}
              className="rounded-lg border p-4 text-center hover:border-indigo-300 hover:bg-indigo-50"
            >
              <div className="text-2xl">🎓</div>
              <div className="mt-1 text-sm font-medium text-gray-900">
                Education Profile
              </div>
            </Link>
            <Link
              href={`/education/support-needs?child_id=${child.id}`}
              className="rounded-lg border p-4 text-center hover:border-indigo-300 hover:bg-indigo-50"
            >
              <div className="text-2xl">📚</div>
              <div className="mt-1 text-sm font-medium text-gray-900">
                Support Needs
              </div>
            </Link>
            <Link
              href={`/education/goals?child_id=${child.id}`}
              className="rounded-lg border p-4 text-center hover:border-indigo-300 hover:bg-indigo-50"
            >
              <div className="text-2xl">🎯</div>
              <div className="mt-1 text-sm font-medium text-gray-900">
                Development Goals
              </div>
            </Link>
            <Link
              href={`/education/progress?child_id=${child.id}`}
              className="rounded-lg border p-4 text-center hover:border-indigo-300 hover:bg-indigo-50"
            >
              <div className="text-2xl">📈</div>
              <div className="mt-1 text-sm font-medium text-gray-900">
                Progress
              </div>
            </Link>
            <Link
              href={`/education/achievements?child_id=${child.id}`}
              className="rounded-lg border p-4 text-center hover:border-indigo-300 hover:bg-indigo-50"
            >
              <div className="text-2xl">🏆</div>
              <div className="mt-1 text-sm font-medium text-gray-900">
                Achievements
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Resources & Support */}
      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              Resources & Support
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Source → Fund → Expense → Benefit received by this child
            </p>
          </div>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          {benefits === null ? (
            <p className="text-sm text-gray-500">
              You do not have permission to view resource support, or this
              module is unavailable.
            </p>
          ) : benefits.length === 0 ? (
            <p className="text-sm text-gray-500">
              No support/benefits recorded for this child yet.
            </p>
          ) : (
            <div className="space-y-3">
              {(
                benefits as {
                  id: string;
                  benefit_type: string;
                  description: string | null;
                  benefit_date: string | null;
                  expense?: {
                    id: string;
                    description: string | null;
                    amount: number;
                    fund?: {
                      id: string;
                      fund_name: string;
                      source?: { id: string; source_name: string } | null;
                    } | null;
                  } | null;
                }[]
              ).map((b) => (
                <Link
                  key={b.id}
                  href={`/resources/benefits/${b.id}`}
                  className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">
                      {getBenefitTypeDisplay(b.benefit_type as never)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {b.benefit_date
                        ? new Date(b.benefit_date).toLocaleDateString()
                        : "No date"}
                    </span>
                  </div>
                  {b.description && (
                    <p className="mt-1 text-sm text-gray-500">{b.description}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    {b.expense?.fund?.source?.source_name ?? "No source"} →{" "}
                    {b.expense?.fund?.fund_name ?? "No fund"} →{" "}
                    {b.expense?.description ?? "No expense"}{" "}
                    {b.expense?.amount != null && `(${formatTsh(b.expense.amount)})`}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Caregiver Assignment */}
      <CaregiverAssignment childId={child.id} currentUserId={""} />

      {/* Benefits */}
    </div>
  );
}
