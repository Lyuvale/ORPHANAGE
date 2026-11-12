import Link from "next/link";
import { formatTsh, type SupportFundDetail } from "@/types/resources";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { can } from "@/lib/auth/authorization.service";
import { listFunds } from "@/lib/resources/resources.service";

export default async function FundsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  let funds: SupportFundDetail[] = [];
  let canCreate = false;
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as never, {
      allowInactiveSubscription: true,
    });
    const admin = createAdminClient();
    const [result, allowed] = await Promise.all([
      listFunds(admin, ctx.centre.id, params.source_id),
      can(supabase as never, ctx, "resources.manage"),
    ]);
    funds = result.data;
    canCreate = allowed;
  } catch {
    funds = [];
    canCreate = false;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-zinc-900">Funds</h2>
          <p className="text-sm text-zinc-500">Money allocated from Sources for a specific purpose</p>
        </div>
        {canCreate && (
          <Link
            href="/resources/funds/new"
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-500"
          >
            Add Fund
          </Link>
        )}
      </div>

      {funds.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white p-12 text-center">
          <p className="text-sm text-zinc-500">
            No funds found.{" "}
            {canCreate && (
              <Link href="/resources/funds/new" className="font-semibold text-indigo-600">
                Add the first fund
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
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900">Fund</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900">Source</th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-zinc-900">Allocated</th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-zinc-900">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white">
              {funds.map(
                (f: {
                  id: string;
                  fund_name: string;
                  source: { id: string; source_name: string } | null;
                  amount_allocated: number;
                  balance: number;
                }) => (
                  <tr key={f.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-4 text-sm">
                      <Link href={`/resources/funds/${f.id}`} className="font-semibold text-indigo-600 hover:text-indigo-500">
                        {f.fund_name}
                      </Link>
                    </td>
                    <td className="px-3 py-4 text-sm text-zinc-500">
                      {f.source ? (
                        <Link href={`/resources/sources/${f.source.id}`} className="hover:text-indigo-600">
                          {f.source.source_name}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-4 text-right text-sm text-zinc-900">{formatTsh(f.amount_allocated)}</td>
                    <td className="px-3 py-4 text-right text-sm font-medium text-emerald-600">{formatTsh(f.balance)}</td>
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
