import Link from "next/link";
import {
  formatTsh,
  getSourceTypeDisplay,
  getBenefitTypeDisplay,
} from "@/types/resources";

async function getOverview() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/resources/overview`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

const REPORT_TYPES = [
  { key: "source", label: "Source" },
  { key: "fund", label: "Fund" },
  { key: "expense", label: "Expense" },
  { key: "benefit", label: "Benefit" },
  { key: "child", label: "Child Support" },
  { key: "asset", label: "Asset" },
];

const FORMATS = [
  { key: "csv", label: "CSV" },
  { key: "excel", label: "Excel" },
  { key: "pdf", label: "PDF" },
];

export default async function ResourcesOverviewPage() {
  const overview = await getOverview();

  const cards = [
    { label: "Sources", value: overview?.total_sources ?? "-", color: "text-indigo-600" },
    { label: "Funds", value: overview?.total_funds ?? "-", color: "text-blue-600" },
    { label: "Expenses", value: overview?.total_expenses ?? "-", color: "text-green-600" },
    { label: "Benefits", value: overview?.total_benefits ?? "-", color: "text-amber-600" },
    { label: "Assets", value: overview?.total_assets ?? "-", color: "text-teal-600" },
    { label: "Received", value: formatTsh(overview?.total_received), color: "text-emerald-600" },
    { label: "Allocated", value: formatTsh(overview?.total_allocated), color: "text-sky-600" },
    { label: "Used", value: formatTsh(overview?.total_used), color: "text-rose-600" },
    { label: "Asset Value", value: formatTsh(overview?.total_assets_value), color: "text-teal-700" },
    { label: "Children Benefited", value: overview?.total_children_benefited ?? "-", color: "text-purple-600" },
  ];

  return (
    <div>
      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border bg-white p-4">
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-sm text-gray-500">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Breakdowns */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">By Source Type</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {overview?.by_source_type?.map(
              (e: { source_type: string; count: number; amount: number }) => (
                <span key={e.source_type} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                  {getSourceTypeDisplay(e.source_type as never)} · {e.count} ({formatTsh(e.amount)})
                </span>
              ),
            ) ?? <span className="text-sm text-gray-400">No sources yet</span>}
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">By Benefit Type</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {overview?.by_benefit_type?.map(
              (e: { benefit_type: string; count: number }) => (
                <span key={e.benefit_type} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                  {getBenefitTypeDisplay(e.benefit_type as never)} · {e.count}
                </span>
              ),
            ) ?? <span className="text-sm text-gray-400">No benefits yet</span>}
          </div>
        </div>
      </div>

      {/* Recent funds */}
      <div className="mb-6 rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Recent Funds</h2>
          <Link href="/resources/funds" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
            View all
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(overview?.recent_funds ?? []).map((f: { id: string; fund_name: string; amount_allocated: number; used: number; balance: number }) => (
            <Link
              key={f.id}
              href={`/resources/funds/${f.id}`}
              className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
            >
              <div className="font-semibold text-gray-900">{f.fund_name}</div>
              <div className="mt-2 text-sm text-gray-500">
                Received {formatTsh(f.amount_allocated)}
              </div>
              <div className="text-sm text-gray-500">Used {formatTsh(f.used)}</div>
              <div className="text-sm font-semibold text-emerald-600">Balance {formatTsh(f.balance)}</div>
            </Link>
          ))}
          {(overview?.recent_funds ?? []).length === 0 && (
            <p className="text-sm text-gray-400">No funds yet.</p>
          )}
        </div>
      </div>

      {/* Reports */}
      <div className="rounded-lg border bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Reports</h2>
        <p className="mt-1 text-sm text-gray-500">
          Export reports based on the Source → Fund → Expense → Benefit → Child relationship, plus
          the Asset register.
        </p>
        <div className="mt-3 space-y-2">
          {REPORT_TYPES.map((rt) => (
            <div key={rt.key} className="flex flex-wrap items-center gap-2">
              <span className="w-36 text-sm font-medium text-gray-700">{rt.label}</span>
              {FORMATS.map((fm) => (
                <a
                  key={fm.key}
                  href={`/api/resources/reports?type=${rt.key}&format=${fm.key}`}
                  className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                >
                  {fm.label}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
