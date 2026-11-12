import Link from "next/link";
import { formatTsh, getExpenseStatusDisplay, type SupportExpenseDetail } from "@/types/resources";
import ApproveRejectButtons from "@/app/(dashboard)/_components/approve-reject-buttons";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { can } from "@/lib/auth/authorization.service";
import { listExpenses } from "@/lib/resources/resources.service";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  let expenses: SupportExpenseDetail[] = [];
  let canApproveExp = false;
  let canCreateExp = false;
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as never, {
      allowInactiveSubscription: true,
    });
    const admin = createAdminClient();
    const [result, canApprove, canCreate] = await Promise.all([
      listExpenses(admin, ctx.centre.id, params.fund_id, params.status),
      can(supabase as never, ctx, "resources.approve"),
      can(supabase as never, ctx, "resources.manage"),
    ]);
    expenses = result.data;
    canApproveExp = canApprove;
    canCreateExp = canCreate;
  } catch {
    expenses = [];
    canApproveExp = false;
    canCreateExp = false;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-zinc-900">Expenses</h2>
          <p className="text-sm text-zinc-500">
            Spending against Funds — approval needed before counting toward balances
          </p>
        </div>
        {canCreateExp && (
          <Link
            href="/resources/expenses/new"
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-500"
          >
            Add Expense
          </Link>
        )}
      </div>

      <form className="mb-4 flex items-center gap-3">
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="block rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-zinc-50"
        >
          Filter
        </button>
      </form>

      {expenses.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white p-12 text-center">
          <p className="text-sm text-zinc-500">
            No expenses found.{" "}
            {canCreateExp && (
              <Link href="/resources/expenses/new" className="font-semibold text-indigo-600">
                Add the first expense
              </Link>
            )}
            .
          </p>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900">Description</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900">Fund</th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-zinc-900">Amount</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900">Status</th>
                {canApproveExp && (
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white">
              {expenses.map(
                (e: {
                  id: string;
                  description: string | null;
                  fund: { id: string; fund_name: string } | null;
                  amount: number;
                  approval_status: string;
                }) => (
                  <tr key={e.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-4 text-sm">
                      <Link href={`/resources/expenses/${e.id}`} className="font-semibold text-indigo-600 hover:text-indigo-500">
                        {e.description || "Expense"}
                      </Link>
                    </td>
                    <td className="px-3 py-4 text-sm text-zinc-500">
                      {e.fund ? (
                        <Link href={`/resources/funds/${e.fund.id}`} className="hover:text-indigo-600">
                          {e.fund.fund_name}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-4 text-right text-sm text-zinc-900">{formatTsh(e.amount)}</td>
                    <td className="px-3 py-4 text-sm">
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                        {getExpenseStatusDisplay(e.approval_status as never)}
                      </span>
                    </td>
                    {canApproveExp && (
                      <td className="px-3 py-4 text-sm">
                        {e.approval_status === "PENDING" ? (
                          <ApproveRejectButtons
                            url={`/api/resources/expenses/${e.id}/approval`}
                            method="POST"
                            approveBody={{ status: "APPROVED" }}
                            rejectBody={{ status: "REJECTED" }}
                            requireReasonOnReject
                          />
                        ) : (
                          <span className="text-zinc-400">—</span>
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
    </div>
  );
}
