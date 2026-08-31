import Link from "next/link";
import { ALL_AUDIT_ACTIONS } from "@/types/audit";

const ENTITY_LABELS: Record<string, string> = {
  child: "Child",
  support_asset: "Asset",
  support_expense: "Expense",
  support_fund: "Fund",
  support_benefit: "Benefit",
  support_source: "Source",
  staff_profile: "Staff",
  visit: "Visit",
  case_file: "Case",
  guardian: "Guardian",
  referral: "Referral",
  admission: "Admission",
  placement: "Placement",
  education_profile: "Education Profile",
  health_record: "Health Record",
  notification: "Notification",
  document: "Document",
  user_profile: "User / Account",
  session: "Session / Login",
  audit_trail: "Audit Trail",
  children_report_export: "Children Export",
  visits_report_export: "Visits Export",
  cases_report_export: "Cases Export",
  health_report_export: "Health Export",
  education_report_export: "Education Export",
  staff_report_export: "Staff Export",
  guardians_report_export: "Guardians Export",
  admissions_report_export: "Admissions Export",
  placements_report_export: "Placements Export",
  referrals_report_export: "Referrals Export",
  safeguarding_report_export: "Safeguarding Export",
};

function entityLabel(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? entityType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800",
  UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
  VIEW: "bg-gray-100 text-gray-800",
  EXPORT: "bg-amber-100 text-amber-800",
  DOWNLOAD: "bg-teal-100 text-teal-800",
  APPROVE: "bg-emerald-100 text-emerald-800",
  REJECT: "bg-orange-100 text-orange-800",
  LOGIN: "bg-indigo-100 text-indigo-800",
  LOGOUT: "bg-indigo-100 text-indigo-800",
  LOGIN_FAILED: "bg-red-100 text-red-800",
  ACCOUNT_DEACTIVATED: "bg-rose-100 text-rose-800",
  ACCOUNT_ACTIVATED: "bg-green-100 text-green-800",
  ROLE_CHANGED: "bg-purple-100 text-purple-800",
};

interface AuditRow {
  id: string;
  created_at: string;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  previous_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}

async function getAudit(
  searchParams: Record<string, string | undefined>,
): Promise<{ data: AuditRow[]; total: number; offset: number }> {
  const params = new URLSearchParams();
  if (searchParams.action) params.set("action", searchParams.action);
  if (searchParams.entity_type) params.set("entity_type", searchParams.entity_type);
  if (searchParams.actor_email) params.set("actor_email", searchParams.actor_email);
  if (searchParams.from) params.set("from", searchParams.from);
  if (searchParams.to) params.set("to", searchParams.to);
  if (searchParams.limit) params.set("limit", searchParams.limit);
  if (searchParams.offset) params.set("offset", searchParams.offset);

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/audit?${params.toString()}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    return { data: [], total: 0, offset: 0 };
  }

  return res.json();
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default async function AuditTrailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const limit = Number(params.limit) || 50;
  const { data: rows, total, offset } = await getAudit(params);

  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
          <p className="mt-1 text-sm text-gray-500">
            A secure, append-only record of who did what, when, and on which
            record within this centre.
          </p>
        </div>
        <a
          href={`/api/audit?${new URLSearchParams({
            action: params.action ?? "",
            entity_type: params.entity_type ?? "",
            actor_email: params.actor_email ?? "",
            from: params.from ?? "",
            to: params.to ?? "",
            export: "csv",
          }).toString()}`}
          className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Export CSV
        </a>
      </div>

      {/* Filters */}
      <form className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <select
          name="action"
          defaultValue={params.action ?? ""}
          className="block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        >
          <option value="">All Actions</option>
          {ALL_AUDIT_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <input
          type="text"
          name="entity_type"
          placeholder="Section / entity type"
          defaultValue={params.entity_type ?? ""}
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        />
        <input
          type="text"
          name="actor_email"
          placeholder="Actor email"
          defaultValue={params.actor_email ?? ""}
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        />
        <input
          type="date"
          name="from"
          defaultValue={params.from ?? ""}
          className="block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        />
        <input
          type="date"
          name="to"
          defaultValue={params.to ?? ""}
          className="block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        />
        <button
          type="submit"
          className="col-span-2 rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-span-1"
        >
          Filter
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No audit events found.</p>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Date / Time
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Who
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Action
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Section / Record
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    {row.actor_email || "System / Security event"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ACTION_COLORS[row.action] ?? "bg-gray-100 text-gray-800"}`}
                    >
                      {row.action}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    {entityLabel(row.entity_type)}
                    {row.entity_id && (
                      <span className="ml-1 font-mono text-xs text-gray-400">
                        ({row.entity_id.slice(0, 8)})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500">
                    {(row.new_values || row.previous_values || row.metadata) && (
                      <span className="block truncate max-w-xs">
                        {formatValue(row.new_values ?? row.previous_values ?? row.metadata)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {total} {total === 1 ? "event" : "events"} total
        </p>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={`/audit?${new URLSearchParams({
                action: params.action ?? "",
                entity_type: params.entity_type ?? "",
                actor_email: params.actor_email ?? "",
                from: params.from ?? "",
                to: params.to ?? "",
                limit: String(limit),
                offset: String(Math.max(offset - limit, 0)),
              }).toString()}`}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Previous
            </Link>
          )}
          <span className="px-3 py-2 text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/audit?${new URLSearchParams({
                action: params.action ?? "",
                entity_type: params.entity_type ?? "",
                actor_email: params.actor_email ?? "",
                from: params.from ?? "",
                to: params.to ?? "",
                limit: String(limit),
                offset: String(offset + limit),
              }).toString()}`}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
