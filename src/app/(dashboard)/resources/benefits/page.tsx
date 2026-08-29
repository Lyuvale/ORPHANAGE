import Link from "next/link";
import { getBenefitTypeDisplay } from "@/types/resources";

async function getBenefits(searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (searchParams.expense_id) params.set("expense_id", searchParams.expense_id);
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/resources/benefits?${params.toString()}`,
    { cache: "no-store" },
  );
  if (!res.ok) return { data: [] };
  return res.json();
}

export default async function BenefitsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { data: benefits } = await getBenefits(params);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Benefits</h2>
          <p className="text-sm text-gray-500">Support delivered to children, funded by expenses</p>
        </div>
        <Link
          href="/resources/benefits/new"
          className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Add Benefit
        </Link>
      </div>

      {benefits.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white p-12 text-center">
          <p className="text-sm text-gray-500">
            No benefits found.{" "}
            <Link href="/resources/benefits/new" className="font-semibold text-indigo-600">
              Add the first benefit
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Type</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Description</th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Children</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {benefits.map(
                (b: { id: string; benefit_type: string; description: string | null; children: unknown[] }) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 text-sm">
                      <Link href={`/resources/benefits/${b.id}`} className="font-semibold text-indigo-600 hover:text-indigo-500">
                        {getBenefitTypeDisplay(b.benefit_type as never)}
                      </Link>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">{b.description || "-"}</td>
                    <td className="px-3 py-4 text-right text-sm text-gray-900">{b.children?.length ?? 0}</td>
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
