import Link from "next/link";
import { notFound } from "next/navigation";
import { getSourceTypeDisplay, formatTsh } from "@/types/resources";
import { serverFetch } from "@/lib/server-fetch";

async function getSource(id: string) {
  const res = await serverFetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/resources/sources/${id}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

export default async function SourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const source = await getSource(id);
  if (!source) notFound();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/resources/sources" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
            ← Sources
          </Link>
          <h2 className="mt-1 text-lg font-medium text-gray-900">{source.source_name}</h2>
          <p className="text-sm text-gray-500">{getSourceTypeDisplay(source.source_type)}</p>
        </div>
      </div>

      {/* Source card */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-500">Amount</div>
          <div className="text-2xl font-bold text-emerald-600">{formatTsh(source.amount)}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-500">Allocated to Funds</div>
          <div className="text-2xl font-bold text-sky-600">{formatTsh(source.allocated)}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-500">Used (Approved)</div>
          <div className="text-2xl font-bold text-rose-600">{formatTsh(source.used)}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-500">Remaining</div>
          <div className="text-2xl font-bold text-indigo-600">{formatTsh(source.remaining)}</div>
        </div>
      </div>

      {source.purpose && (
        <p className="mb-6 text-sm text-gray-600">
          <span className="font-medium">Purpose:</span> {source.purpose}
        </p>
      )}
      {source.notes && (
        <p className="mb-6 text-sm text-gray-600">
          <span className="font-medium">Notes:</span> {source.notes}
        </p>
      )}

      {/* Source -> Fund flow */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Funds from this Source</h3>
        <Link
          href={`/resources/funds/new?source_id=${source.id}`}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Allocate Fund
        </Link>
      </div>

      {source.funds.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            No funds allocated yet.{" "}
            <Link href={`/resources/funds/new?source_id=${source.id}`} className="font-semibold text-indigo-600">
              Allocate the first fund
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Fund</th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Allocated</th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Used</th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {source.funds.map(
                (f: {
                  id: string;
                  fund_name: string;
                  amount_allocated: number;
                  used: number;
                  balance: number;
                }) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 text-sm">
                      <Link href={`/resources/funds/${f.id}`} className="font-semibold text-indigo-600 hover:text-indigo-500">
                        {f.fund_name}
                      </Link>
                    </td>
                    <td className="px-3 py-4 text-right text-sm text-gray-900">{formatTsh(f.amount_allocated)}</td>
                    <td className="px-3 py-4 text-right text-sm text-gray-900">{formatTsh(f.used)}</td>
                    <td className="px-3 py-4 text-right text-sm font-medium text-gray-900">{formatTsh(f.balance)}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-400">
        Balances are computed automatically from approved expenses. Remaining = amount − allocated.
      </p>
    </div>
  );
}
