import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatTsh,
  getAssetCategoryDisplay,
  getAssetStatusDisplay,
  getAssetConditionDisplay,
  getAssetCostTypeDisplay,
  getBenefitTypeDisplay,
  getAssetLocationDisplay,
} from "@/types/resources";
import AddCost from "./_components/add-cost";
import UpdateStatus from "./_components/update-status";
import DisposeAsset from "./_components/dispose-asset";

async function getAsset(id: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/resources/assets/${id}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await getAsset(id);
  if (!asset) notFound();

  const source = asset.source;
  const fund = asset.fund;
  const expense = asset.expense;
  const benefit = asset.benefit;

  return (
    <div>
      <div className="mb-4">
        <Link href="/resources/assets" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
          ← Assets
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium text-gray-900">{asset.asset_name}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <AddCost assetId={asset.id} />
            <UpdateStatus
              assetId={asset.id}
              initialStatus={asset.asset_status}
              initialCondition={asset.asset_condition}
              initialLocation={asset.location}
            />
            <DisposeAsset assetId={asset.id} alreadyDisposed={asset.asset_status === "DISPOSED"} />
          </div>
        </div>
        <p className="text-sm text-gray-500">
          {asset.asset_id ? `${asset.asset_id} · ` : ""}
          {getAssetCategoryDisplay(asset.asset_category)} · Qty {asset.quantity}
          {asset.date_acquired ? ` · Acquired ${new Date(asset.date_acquired).toLocaleDateString()}` : ""}
        </p>
      </div>

      {/* Summary badges */}
      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-green-100 px-3 py-1 font-medium text-green-700">
          {getAssetStatusDisplay(asset.asset_status)}
        </span>
        <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700">
          {getAssetConditionDisplay(asset.asset_condition)}
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">
          {asset.location ? getAssetLocationDisplay(asset.location) : "No location"}
        </span>
      </div>

      {/* Relationship chain: Source -> Fund -> Expense -> Asset -> Benefit -> Child */}
      <div className="mb-6 rounded-lg border bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Source → Fund → Expense → Asset{asset.benefit ? " → Benefit" : ""}
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {source ? (
            <Link href={`/resources/sources/${source.id}`} className="rounded-md bg-gray-100 px-3 py-1.5 text-gray-700 hover:bg-gray-200">
              {source.source_name}
            </Link>
          ) : asset.source_unknown ? (
            <span className="rounded-md bg-gray-100 px-3 py-1.5 text-gray-600">Existing Centre Asset / Unknown</span>
          ) : (
            <span className="text-gray-400">No source</span>
          )}
          <span className="text-gray-400">→</span>
          {fund ? (
            <Link href={`/resources/funds/${fund.id}`} className="rounded-md bg-gray-100 px-3 py-1.5 text-gray-700 hover:bg-gray-200">
              {fund.fund_name} ({formatTsh(fund.amount_allocated)})
            </Link>
          ) : (
            <span className="text-gray-400">No fund</span>
          )}
          <span className="text-gray-400">→</span>
          {expense ? (
            <Link href={`/resources/expenses/${expense.id}`} className="rounded-md bg-gray-100 px-3 py-1.5 text-gray-700 hover:bg-gray-200">
              {expense.description || "Expense"} ({formatTsh(expense.amount)})
            </Link>
          ) : (
            <span className="text-gray-400">No expense</span>
          )}
          <span className="text-gray-400">→</span>
          <span className="rounded-md bg-indigo-100 px-3 py-1.5 font-medium text-indigo-700">{asset.asset_name}</span>
          {benefit && (
            <>
              <span className="text-gray-400">→</span>
              <Link href={`/resources/benefits/${benefit.id}`} className="rounded-md bg-amber-100 px-3 py-1.5 font-medium text-amber-800 hover:bg-amber-200">
                {getBenefitTypeDisplay(benefit.benefit_type)}{" "}
                {benefit.children && benefit.children.length > 0 ? `(${benefit.children.length} children)` : ""}
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Costs */}
        <div className="rounded-lg border bg-white p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Asset Costs</h3>
          <dl className="mt-3 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <dt className="text-sm text-gray-600">Purchase Cost</dt>
              <dd className="text-sm font-medium text-gray-900">
                {asset.purchase_cost === null ? "Unknown" : formatTsh(asset.purchase_cost)}
              </dd>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <dt className="text-sm text-gray-600">Repair Cost</dt>
              <dd className="text-sm font-medium text-gray-900">{formatTsh(asset.repair_cost)}</dd>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <dt className="text-sm text-gray-600">Maintenance Cost</dt>
              <dd className="text-sm font-medium text-gray-900">{formatTsh(asset.maintenance_cost)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm font-semibold text-gray-900">Total Asset Cost</dt>
              <dd className="text-base font-bold text-indigo-700">{formatTsh(asset.total_cost)}</dd>
            </div>
          </dl>
          {asset.unknown_cost_count > 0 && (
            <p className="mt-2 text-xs text-amber-600">
              {asset.unknown_cost_count} cost record(s) have an unknown amount and are not added to the total.
            </p>
          )}
        </div>

        {/* Asset info */}
        <div className="rounded-lg border bg-white p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Details</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Category</dt>
              <dd className="font-medium text-gray-900">{getAssetCategoryDisplay(asset.asset_category)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Quantity</dt>
              <dd className="font-medium text-gray-900">{asset.quantity}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Status</dt>
              <dd className="font-medium text-gray-900">{getAssetStatusDisplay(asset.asset_status)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Condition</dt>
              <dd className="font-medium text-gray-900">{getAssetConditionDisplay(asset.asset_condition)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Location</dt>
              <dd className="font-medium text-gray-900">{getAssetLocationDisplay(asset.location)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Acquired</dt>
              <dd className="font-medium text-gray-900">
                {asset.date_acquired ? new Date(asset.date_acquired).toLocaleDateString() : "-"}
              </dd>
            </div>
          </dl>
          {asset.notes && (
            <p className="mt-3 border-t pt-3 text-sm text-gray-600">
              <span className="font-medium">Notes:</span> {asset.notes}
            </p>
          )}
        </div>
      </div>

      {/* Cost records */}
      <div className="mb-6 rounded-lg border bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Cost Records ({asset.costs.length})
        </h3>
        {asset.costs.length === 0 ? (
          <p className="text-sm text-gray-500">
            No repair or maintenance costs recorded. Use &quot;Record Cost&quot; to add one.
          </p>
        ) : (
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">Expense</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {asset.costs.map(
                  (c: { id: string; cost_type: string; amount: number | null; cost_date: string | null; expense_id: string | null; notes: string | null }) => (
                    <tr key={c.id}>
                      <td className="px-3 py-3 text-sm text-gray-900">{getAssetCostTypeDisplay(c.cost_type as never)}</td>
                      <td className="px-3 py-3 text-sm text-gray-900">
                        {c.amount === null ? "Unknown" : formatTsh(c.amount)}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-500">
                        {c.expense_id ? (
                          <Link href={`/resources/expenses/${c.expense_id}`} className="font-medium text-indigo-600 hover:text-indigo-500">
                            Linked expense
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-500">
                        {c.cost_date ? new Date(c.cost_date).toLocaleDateString() : "-"}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* History */}
      <div className="rounded-lg border bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          History ({asset.history.length})
        </h3>
        {asset.history.length === 0 ? (
          <p className="text-sm text-gray-500">No history recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {asset.history.map(
              (h: { id: string; event_type: string; description: string | null; previous_value: string | null; new_value: string | null; changed_at: string }) => (
                <li key={h.id} className="flex flex-wrap items-center gap-2 border-b pb-2 text-sm">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {h.event_type.replace(/_/g, " ")}
                  </span>
                  <span className="text-gray-600">
                    {h.previous_value ? `${h.previous_value.replace(/_/g, " ")} → ` : ""}
                    <span className="font-medium">{h.new_value ? h.new_value.replace(/_/g, " ") : h.description ?? ""}</span>
                  </span>
                  <span className="ml-auto text-xs text-gray-400">
                    {new Date(h.changed_at).toLocaleString()}
                  </span>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
