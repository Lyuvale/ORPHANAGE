import Link from "next/link";
import { notFound } from "next/navigation";
import { getBenefitTypeDisplay, formatTsh } from "@/types/resources";
import ManageChildren from "./_components/manage-children";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { can } from "@/lib/auth/authorization.service";
import { getBenefitDetail } from "@/lib/resources/resources.service";

export default async function BenefitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let benefit: Awaited<ReturnType<typeof getBenefitDetail>> = null;
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as never, {
      allowInactiveSubscription: true,
    });
    if (await can(supabase as never, ctx, "resources.view")) {
      const admin = createAdminClient();
      benefit = await getBenefitDetail(admin, id, ctx.centre.id);
    }
  } catch {
    benefit = null;
  }
  if (!benefit) notFound();

  const expense = benefit.expense;
  const fund = expense?.fund ?? null;
  const source = fund?.source ?? null;

  return (
    <div>
      <div className="mb-4">
        <Link href="/resources/benefits" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
          ← Benefits
        </Link>
        <h2 className="mt-1 text-lg font-medium text-zinc-900">
          {getBenefitTypeDisplay(benefit.benefit_type)}
        </h2>
        <p className="text-sm text-zinc-500">
          {benefit.benefit_date ? new Date(benefit.benefit_date).toLocaleDateString() : "No date"}
        </p>
      </div>

      {benefit.description && (
        <p className="mb-6 text-sm text-zinc-600">
          <span className="font-medium">Description:</span> {benefit.description}
        </p>
      )}

      {/* Full flow chain: Source -> Fund -> Expense -> Benefit */}
      <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Source → Fund → Expense → Benefit
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {source ? (
            <Link href={`/resources/sources/${source.id}`} className="rounded-md bg-zinc-100 px-3 py-1.5 text-zinc-700 hover:bg-gray-200">
              {source.source_name}
            </Link>
          ) : (
            <span className="text-zinc-400">No source</span>
          )}
          <span className="text-zinc-400">→</span>
          {fund ? (
            <Link href={`/resources/funds/${fund.id}`} className="rounded-md bg-zinc-100 px-3 py-1.5 text-zinc-700 hover:bg-gray-200">
              {fund.fund_name} ({formatTsh(fund.amount_allocated)})
            </Link>
          ) : (
            <span className="text-zinc-400">No fund</span>
          )}
          <span className="text-zinc-400">→</span>
          {expense ? (
            <Link href={`/resources/expenses/${expense.id}`} className="rounded-md bg-zinc-100 px-3 py-1.5 text-zinc-700 hover:bg-gray-200">
              {expense.description || "Expense"} ({formatTsh(expense.amount)})
            </Link>
          ) : (
            <span className="text-zinc-400">No expense</span>
          )}
          <span className="text-zinc-400">→</span>
          <span className="rounded-md bg-indigo-100 px-3 py-1.5 font-medium text-indigo-700">
            {getBenefitTypeDisplay(benefit.benefit_type)}
          </span>
        </div>
      </div>

      {/* Children benefited */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-900">
          Children Benefited ({benefit.children.length})
        </h3>
        <ManageChildren benefitId={benefit.id} initialChildren={benefit.children} />
      </div>

      {benefit.children.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white p-8 text-center">
          <p className="text-sm text-zinc-500">
            No children linked yet. Use &quot;Manage Children&quot; to select who benefited.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900">Child</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white">
              {benefit.children.map(
                (c: { id: string; first_name: string; last_name: string; reference_number: string | null }) => (
                  <tr key={c.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-4 text-sm">
                      <Link href={`/children/${c.id}`} className="font-semibold text-indigo-600 hover:text-indigo-500">
                        {c.first_name} {c.last_name}
                      </Link>
                    </td>
                    <td className="px-3 py-4 text-sm text-zinc-500">{c.reference_number ?? "-"}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
