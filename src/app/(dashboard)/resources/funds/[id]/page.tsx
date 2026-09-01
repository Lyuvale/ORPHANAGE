import Link from "next/link";
import { notFound } from "next/navigation";
import { formatTsh, getExpenseStatusDisplay } from "@/types/resources";
import { serverFetch } from "@/lib/server-fetch";

async function getFund(id: string) {
  const res = await serverFetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/resources/funds/${id}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

export default async function FundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fund = await getFund(id);
  if (!fund) notFound();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/resources/funds" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
            ← Funds
          </Link>
          <h2 className="mt-1 text-lg font-medium text-gray-900">{fund.fund_name}</h2>
          <p className="text-sm text-gray-500">
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
          className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Add Expense
        </Link>
      </div>

      {fund.purpose && (
        <p className="mb-6 text-sm text-gray-600">
          <span className="font-medium">Purpose:</span> {fund.purpose}
        </p>
      )}

      {/* Fund card */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-500">Allocated</div>
          <div className="text-2xl font-bold text-sky-600">{formatTsh(fund.amount_allocated)}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-500">Used (Approved)</div>
          <div className="text-2xl font-bold text-rose-600">{formatTsh(fund.used)}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-500">Balance</div>
          <div className="text-2xl font-bold text-emerald-600">{formatTsh(fund.balance)}</div>
        </div>
      </div>

      {/* Expenses */}
      <h3 className="mb-2 text-base font-semibold text-gray-900">Expenses</h3>
      {fund.expenses.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
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
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Description</th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Amount</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {fund.expenses.map(
                (e: {
                  id: string;
                  description: string | null;
                  amount: number;
                  expense_date: string | null;
                  approval_status: string;
                }) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 text-sm">
                      <Link href={`/resources/expenses/${e.id}`} className="font-semibold text-indigo-600 hover:text-indigo-500">
                        {e.description || "Expense"}
                      </Link>
                    </td>
                    <td className="px-3 py-4 text-right text-sm text-gray-900">{formatTsh(e.amount)}</td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      {e.expense_date ? new Date(e.expense_date).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-3 py-4 text-sm">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
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

      <p className="mt-4 text-xs text-gray-400">
        Only approved expenses count toward used and balance. Balances are computed, never entered.
      </p>
    </div>
  );
}
