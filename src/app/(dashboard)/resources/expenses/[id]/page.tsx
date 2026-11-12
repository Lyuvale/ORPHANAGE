import Link from "next/link";
import { notFound } from "next/navigation";
import { formatTsh, getExpenseStatusDisplay, getBenefitTypeDisplay } from "@/types/resources";
import ApprovalActions from "./_components/approval-actions";
import ExpenseEditForm from "./_components/expense-edit-form";
import AuditHistory from "../../../_components/audit-history";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { can } from "@/lib/auth/authorization.service";
import { getExpenseDetail } from "@/lib/resources/resources.service";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let expense: Awaited<ReturnType<typeof getExpenseDetail>> = null;
  let canManage = false;
  let canApprove = false;
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as never, {
      allowInactiveSubscription: true,
    });
    const admin = createAdminClient();
    const [detail, manage, approve] = await Promise.all([
      getExpenseDetail(admin, id, ctx.centre.id),
      can(supabase as never, ctx, "resources.manage"),
      can(supabase as never, ctx, "resources.approve"),
    ]);
    expense = detail;
    canManage = manage;
    canApprove = approve;
  } catch {
    expense = null;
    canManage = false;
    canApprove = false;
  }
  if (!expense) notFound();

  return (
    <div>
      <div className="mb-4">
        <Link href="/resources/expenses" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
          ← Expenses
        </Link>
        <h2 className="mt-1 text-lg font-medium text-zinc-900">{expense.description || "Expense"}</h2>
        <p className="text-sm text-zinc-500">
          Fund:{" "}
          {expense.fund ? (
            <Link href={`/resources/funds/${expense.fund.id}`} className="font-semibold text-indigo-600 hover:text-indigo-500">
              {expense.fund.fund_name}
            </Link>
          ) : (
            "-"
          )}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="text-sm text-zinc-500">Amount</div>
          <div className="text-2xl font-bold text-zinc-900">{formatTsh(expense.amount)}</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="text-sm text-zinc-500">Status</div>
          <span className="mt-1 inline-block rounded-full bg-zinc-100 px-2.5 py-1 text-sm font-medium text-zinc-700">
            {getExpenseStatusDisplay(expense.approval_status)}
          </span>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="text-sm text-zinc-500">Date</div>
          <div className="text-lg font-semibold text-zinc-900">
            {expense.expense_date ? new Date(expense.expense_date).toLocaleDateString() : "-"}
          </div>
        </div>
      </div>

      {expense.notes && (
        <p className="mb-4 text-sm text-zinc-600">
          <span className="font-medium">Notes:</span> {expense.notes}
        </p>
      )}

      <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-zinc-900">Approval</h3>
          {canManage && <ExpenseEditForm expense={expense} />}
        </div>
        {canApprove ? (
          <ApprovalActions expenseId={expense.id} currentStatus={expense.approval_status} />
        ) : (
          <p className="text-sm text-zinc-500">
            Only an authorised approver can approve or reject this expense.
          </p>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-900">Benefits from this Expense</h3>
        {canManage && (
          <Link
            href={`/resources/benefits/new?expense_id=${expense.id}`}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-zinc-500"
          >
            Add Benefit
          </Link>
        )}
      </div>

      {expense.benefits.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white p-8 text-center">
          <p className="text-sm text-zinc-500">
            No benefits recorded for this expense yet.{" "}
            {canManage && (
              <Link href={`/resources/benefits/new?expense_id=${expense.id}`} className="font-semibold text-indigo-600">
                Add the first benefit
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
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900">Type</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900">Description</th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-zinc-900">Children</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white">
              {expense.benefits.map(
                (b: { id: string; benefit_type: string; description: string | null; children: unknown[] }) => (
                  <tr key={b.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-4 text-sm">
                      <Link href={`/resources/benefits/${b.id}`} className="font-semibold text-indigo-600 hover:text-indigo-500">
                        {getBenefitTypeDisplay(b.benefit_type as never)}
                      </Link>
                    </td>
                    <td className="px-3 py-4 text-sm text-zinc-500">{b.description || "-"}</td>
                    <td className="px-3 py-4 text-right text-sm text-zinc-900">{b.children?.length ?? 0}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-zinc-400">
        Only approved expenses count toward fund/source balances.
      </p>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white">
        <div className="px-4 py-4">
          <h3 className="text-base font-semibold text-zinc-900">Activity History</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Audit trail of changes made to this expense record.
          </p>
        </div>
        <AuditHistory entityType="support_expense" entityId={expense.id} />
      </div>
    </div>
  );
}
