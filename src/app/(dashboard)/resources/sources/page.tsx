import Link from "next/link";
import { SUPPORT_SOURCE_TYPES, getSourceTypeDisplay, formatTsh } from "@/types/resources";
import { serverFetch } from "@/lib/server-fetch";

async function getSources(searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (searchParams.type && searchParams.type !== "ALL") params.set("type", searchParams.type);
  const res = await serverFetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/resources/sources?${params.toString()}`,
    { cache: "no-store" },
  );
  if (!res.ok) return { data: [], count: 0 };
  return res.json();
}

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { data: sources, count } = await getSources(params);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Sources</h2>
          <p className="text-sm text-gray-500">Where support / financial resources come from</p>
        </div>
        <Link
          href="/resources/sources/new"
          className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Add Source
        </Link>
      </div>

      <form className="mb-4 flex items-center gap-3">
        <select
          name="type"
          defaultValue={params.type ?? "ALL"}
          className="block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        >
          <option value="ALL">All Types</option>
          {SUPPORT_SOURCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {getSourceTypeDisplay(t)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Filter
        </button>
      </form>

      {sources.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-500">No sources found.</p>
          <Link
            href="/resources/sources/new"
            className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            Add the first source
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Source</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Type</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Amount</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sources.map(
                (s: {
                  id: string;
                  source_name: string;
                  source_type: string;
                  amount: number;
                  source_date: string | null;
                  purpose: string | null;
                }) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <Link href={`/resources/sources/${s.id}`} className="font-semibold text-indigo-600 hover:text-indigo-500">
                        {s.source_name}
                      </Link>
                      {s.purpose && <div className="text-xs text-gray-500">{s.purpose}</div>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                      {getSourceTypeDisplay(s.source_type as never)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                      {formatTsh(s.amount)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {s.source_date ? new Date(s.source_date).toLocaleDateString() : "-"}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-sm text-gray-500">
        {count} {count === 1 ? "source" : "sources"} total
      </p>
    </div>
  );
}
