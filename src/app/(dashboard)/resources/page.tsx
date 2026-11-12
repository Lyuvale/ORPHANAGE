import Link from "next/link";
import {
  formatTsh,
  getSourceTypeDisplay,
  getBenefitTypeDisplay,
} from "@/types/resources";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getOverview } from "@/lib/resources/resources.service";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

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

async function loadOverview() {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as never);
    const admin = createAdminClient();
    return await getOverview(admin, ctx.centre.id);
  } catch {
    return null;
  }
}

export default async function ResourcesOverviewPage() {
  const overview = await loadOverview();

  const cards = [
    { label: "Sources", value: overview?.total_sources ?? "-" },
    { label: "Funds", value: overview?.total_funds ?? "-" },
    { label: "Expenses", value: overview?.total_expenses ?? "-" },
    { label: "Benefits", value: overview?.total_benefits ?? "-" },
    { label: "Assets", value: overview?.total_assets ?? "-" },
    { label: "Received", value: formatTsh(overview?.total_received) },
    { label: "Allocated", value: formatTsh(overview?.total_allocated) },
    { label: "Used", value: formatTsh(overview?.total_used) },
    { label: "Asset Value", value: formatTsh(overview?.total_assets_value) },
    {
      label: "Children Benefited",
      value: overview?.total_children_benefited ?? "-",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resources & Support"
        subtitle="Track sources, funds, expenses, benefits and assets in one place."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {cards.map((c) => (
          <StatCard key={c.label} label={c.label} value={c.value} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="By source type" />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {overview?.by_source_type?.map(
                (e: { source_type: string; count: number; amount: number }) => (
                  <span
                    key={e.source_type}
                    className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700"
                  >
                    {getSourceTypeDisplay(e.source_type as never)} · {e.count} (
                    {formatTsh(e.amount)})
                  </span>
                ),
              ) ?? <span className="text-sm text-zinc-400">No sources yet</span>}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="By benefit type" />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {overview?.by_benefit_type?.map(
                (e: { benefit_type: string; count: number }) => (
                  <span
                    key={e.benefit_type}
                    className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700"
                  >
                    {getBenefitTypeDisplay(e.benefit_type as never)} · {e.count}
                  </span>
                ),
              ) ?? <span className="text-sm text-zinc-400">No benefits yet</span>}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Recent funds"
          action={
            <Link
              href="/resources/funds"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
            >
              View all
            </Link>
          }
        />
        <CardBody>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(overview?.recent_funds ?? []).map(
              (f: {
                id: string;
                fund_name: string;
                amount_allocated: number;
                used: number;
                balance: number;
              }) => (
                <Link
                  key={f.id}
                  href={`/resources/funds/${f.id}`}
                  className="rounded-lg border border-zinc-200 p-4 hover:bg-zinc-50"
                >
                  <div className="font-semibold text-zinc-900">{f.fund_name}</div>
                  <div className="mt-2 text-sm text-zinc-500">
                    Received {formatTsh(f.amount_allocated)}
                  </div>
                  <div className="text-sm text-zinc-500">
                    Used {formatTsh(f.used)}
                  </div>
                  <div className="text-sm font-semibold text-emerald-600">
                    Balance {formatTsh(f.balance)}
                  </div>
                </Link>
              ),
            )}
            {(overview?.recent_funds ?? []).length === 0 && (
              <p className="text-sm text-zinc-400">No funds yet.</p>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Reports"
          description="Export reports across the Source → Fund → Expense → Benefit → Child chain, plus the Asset register."
        />
        <CardBody>
          <div className="space-y-2">
            {REPORT_TYPES.map((rt) => (
              <div key={rt.key} className="flex flex-wrap items-center gap-2">
                <span className="w-36 text-sm font-medium text-zinc-700">
                  {rt.label}
                </span>
                {FORMATS.map((fm) => (
                  <a
                    key={fm.key}
                    href={`/api/resources/reports?type=${rt.key}&format=${fm.key}`}
                    className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-gray-200"
                  >
                    {fm.label}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
