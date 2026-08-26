import Link from "next/link";

async function getChildren(searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (searchParams.status) params.set("status", searchParams.status);
  if (searchParams.search) params.set("search", searchParams.search);
  if (searchParams.limit) params.set("limit", searchParams.limit);
  if (searchParams.offset) params.set("offset", searchParams.offset);

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/children?${params.toString()}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    return { data: [], count: 0 };
  }

  return res.json();
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    transferred: "bg-blue-100 text-blue-800",
    graduated: "bg-purple-100 text-purple-800",
    alumni: "bg-gray-100 text-gray-800",
    deactivated: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-800"}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default async function ChildrenListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { data: children, count } = await getChildren(params);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Children</h1>
        <Link
          href="/children/new"
          className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Add Child
        </Link>
      </div>

      {/* Search and filter */}
      <form className="mb-6 flex gap-3">
        <input
          type="text"
          name="search"
          placeholder="Search by name or reference..."
          defaultValue={params.search ?? ""}
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        />
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="block rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="transferred">Transferred</option>
          <option value="graduated">Graduated</option>
          <option value="alumni">Alumni</option>
          <option value="deactivated">Deactivated</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Search
        </button>
      </form>

      {/* Children table */}
      {children.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No children found.</p>
          <Link
            href="/children/new"
            className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            Add the first child
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Reference
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Name
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Admission Date
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Date of Birth
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {children.map(
                (child: {
                  id: string;
                  reference_number: string;
                  first_name: string;
                  last_name: string;
                  middle_name: string | null;
                  status: string;
                  admission_date: string;
                  date_of_birth: string;
                }) => (
                  <tr key={child.id}>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-mono text-gray-500">
                      <Link
                        href={`/children/${child.id}`}
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        {child.reference_number}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                      <Link
                        href={`/children/${child.id}`}
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        {child.first_name}
                        {child.middle_name ? ` ${child.middle_name}` : ""}{" "}
                        {child.last_name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <StatusBadge status={child.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(child.admission_date).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(child.date_of_birth).toLocaleDateString()}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-sm text-gray-500">
        {count} {count === 1 ? "child" : "children"} total
      </p>
    </div>
  );
}
