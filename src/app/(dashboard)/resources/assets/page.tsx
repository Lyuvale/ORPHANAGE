import Link from "next/link";
import {
  getAssetCategoryDisplay,
  getAssetStatusDisplay,
  getAssetConditionDisplay,
  getAssetLocationDisplay,
  formatTsh,
} from "@/types/resources";

async function getAssets(searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (searchParams.category) params.set("category", searchParams.category);
  if (searchParams.status) params.set("status", searchParams.status);
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/resources/assets?${params.toString()}`,
    { cache: "no-store" },
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const assets = await getAssets(params);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Assets</h2>
          <p className="text-sm text-gray-500">
            Physical items owned/used by the centre, with costs and status tracking.
          </p>
        </div>
        <Link
          href="/resources/assets/new"
          className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Add Asset
        </Link>
      </div>

      {assets.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white p-12 text-center">
          <p className="text-sm text-gray-500">
            No assets found.{" "}
            <Link href="/resources/assets/new" className="font-semibold text-indigo-600">
              Add the first asset
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Asset</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Category</th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Qty</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Location</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Condition</th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {assets.map(
                (a: {
                  id: string;
                  asset_name: string;
                  asset_id: string | null;
                  asset_category: string;
                  quantity: number;
                  location: string | null;
                  asset_status: string;
                  asset_condition: string;
                  purchase_cost: number | null;
                  repair_cost?: number;
                  maintenance_cost?: number;
                  total_cost?: number;
                }) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 text-sm">
                      <Link href={`/resources/assets/${a.id}`} className="font-semibold text-indigo-600 hover:text-indigo-500">
                        {a.asset_name}
                      </Link>
                      {a.asset_id && <div className="text-xs text-gray-400">{a.asset_id}</div>}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      {getAssetCategoryDisplay(a.asset_category as never)}
                    </td>
                    <td className="px-3 py-4 text-right text-sm text-gray-900">{a.quantity}</td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      {getAssetLocationDisplay(a.location)}
                    </td>
                    <td className="px-3 py-4 text-sm">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(a.asset_status)}`}>
                        {getAssetStatusDisplay(a.asset_status as never)}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      {getAssetConditionDisplay(a.asset_condition as never)}
                    </td>
                    <td className="px-3 py-4 text-right text-sm font-semibold text-gray-900">
                      {a.purchase_cost === null || a.purchase_cost === undefined ? "Unknown" : formatTsh(a.purchase_cost)}
                    </td>
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

function statusClass(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-700";
    case "IN_USE":
      return "bg-blue-100 text-blue-700";
    case "MAINTENANCE":
      return "bg-amber-100 text-amber-700";
    case "DAMAGED":
      return "bg-orange-100 text-orange-700";
    case "LOST":
      return "bg-red-100 text-red-700";
    case "DISPOSED":
      return "bg-gray-200 text-gray-600";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
