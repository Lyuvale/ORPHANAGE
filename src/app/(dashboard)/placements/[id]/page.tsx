import Link from "next/link";

async function getPlacement(id: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/placements/${id}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    return null;
  }

  const result = await res.json();
  return result.data;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    transferred: "bg-purple-100 text-purple-800",
    discharged: "bg-gray-100 text-gray-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${colors[status] ?? "bg-gray-100 text-gray-800"}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default async function PlacementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const placement = await getPlacement(id);

  if (!placement) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">Placement not found.</p>
        <Link href="/placements" className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-500">
          Back to placements
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/placements" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Back to placements
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Placement</h1>
          <p className="text-sm text-gray-500 font-mono">{placement.reference_number}</p>
        </div>
        <StatusBadge status={placement.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Child ID</dt>
              <dd className="text-gray-900 font-mono">{placement.child_id.slice(0, 8)}...</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Type</dt>
              <dd className="text-gray-900">{placement.placement_type.charAt(0).toUpperCase() + placement.placement_type.slice(1)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Start Date</dt>
              <dd className="text-gray-900">{new Date(placement.start_date).toLocaleDateString()}</dd>
            </div>
            {placement.end_date && (
              <div className="flex justify-between">
                <dt className="text-gray-500">End Date</dt>
                <dd className="text-gray-900">{new Date(placement.end_date).toLocaleDateString()}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Location</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Bed Reference</dt>
              <dd className="text-gray-900">{placement.bed_reference ?? "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Room Number</dt>
              <dd className="text-gray-900">{placement.room_number ?? "-"}</dd>
            </div>
          </dl>
        </div>

        {placement.notes && (
          <div className="rounded-lg border border-gray-200 p-4 sm:col-span-2">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Notes</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{placement.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
