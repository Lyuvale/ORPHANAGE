import Link from "next/link";
import { notFound } from "next/navigation";
import { formatTsh, getExpenseStatusDisplay } from "@/types/resources";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { can } from "@/lib/auth/authorization.service";
import { getFundDetail } from "@/lib/resources/resources.service";

export default async function FundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let fund: Awaited<ReturnType<typeof getFundDetail>> = null;
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as never, {
      allowInactiveSubscription: true,
    });
    if (await can(supabase as never, ctx, "resources.view")) {
      const admin = createAdminClient();
      fund = await getFundDetail(admin, id, ctx.centre.id);
    }
  } catch {
    fund = null;
  }
  if (!fund) notFound();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/resources/funds" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
            ← Funds
          </Link>
          <h2 className="mt-1 text-lg font-medium text-zinc-900">{fund.fund_name}</h2>
          <p className="text-sm text-zinc-500">
            Source:{" "}
            {fund.source ? (
              <Link href={`/resources/sources/${fund.source.id}`} className="font-semibold text-indigo-600 hover:text-indigo-500">
                {fund.source.source_name}
              </Link>
            ) : (
              "-"
            )}
          </p>
        </div>
        <Link
          href={`/resources/expenses/new?fund_id=${fund.id}`}
          className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-500"
        >
          Add Expense
        </Link>
      </div>

      {fund.purpose && (
        <p className="mb-6 text-sm text-zinc-600">
          <span className="font-medium">Purpose:</span> {fund.purpose}
        </p>
      )}

      {/* Fund card */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="text-sm text-zinc-500">Allocated</div>
          <div className="text-2xl font-bold text-sky-600">{formatTsh(fund.amount_allocated)}</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="text-sm text-zinc-500">Used (Approved)</div>
          <div className="text-2xl font-bold text-rose-600">{formatTsh(fund.used)}</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="text-sm text-zinc-500">Balance</div>
          <div className="text-2xl font-bold text-emerald-600">{formatTsh(fund.balance)}</div>
        </div>
      </div>

      {/* Expenses */}
      <h3 className="mb-2 text-base font-semibold text-zinc-900">Expenses</h3>
      {fund.expenses.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white p-8 text-center">
          <p className="text-sm text-zinc-500">
            No expenses recorded.{" "}
            <Link href={`/resources/expenses/new?fund_id=${fund.id}`} className="font-semibold text-indigo-600">
              Add the first expense
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900">Description</th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-zinc-900">Amount</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900">Date</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white">
              {fund.expenses.map(
                (e: {
                  id: string;
                  description: string | null;
                  amount: number;
                  expense_date: string | null;
                  approval_status: string;
                }) => (
                  <tr key={e.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-4 text-sm">
                      <Link href={`/resources/expenses/${e.id}`} className="font-semibold text-indigo-600 hover:text-indigo-500">
                        {e.description || "Expense"}
                      </Link>
                    </td>
                    <td className="px-3 py-4 text-right text-sm text-zinc-900">{formatTsh(e.amount)}</td>
                    <td className="px-3 py-4 text-sm text-zinc-500">
                      {e.expense_date ? new Date(e.expense_date).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-3 py-4 text-sm">
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                        {getExpenseStatusDisplay(e.approval_status as never)}
                      </span>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-zinc-400">
        Only approved expenses count toward used and balance. Balances are computed, never entered.
      </p>
    </div>
  );
}
