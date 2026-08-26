import Link from "next/link";

async function getGuardian(id: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/guardians/${id}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    return null;
  }

  const result = await res.json();
  return result.data;
}

async function getGuardianRelationships(guardianId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/guardians/relationships?guardian_id=${guardianId}`,
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
    inactive: "bg-gray-100 text-gray-800",
    deceased: "bg-red-100 text-red-800",
    unknown: "bg-yellow-100 text-yellow-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${colors[status] ?? "bg-gray-100 text-gray-800"}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default async function GuardianDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const guardian = await getGuardian(id);

  if (!guardian) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">Guardian not found.</p>
        <Link href="/guardians" className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-500">
          Back to guardians
        </Link>
      </div>
    );
  }

  const relationships = await getGuardianRelationships(id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/guardians" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Back to guardians
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            {guardian.preferred_name || guardian.first_name}
            {guardian.middle_name ? ` ${guardian.middle_name}` : ""}{" "}
            {guardian.last_name}
          </h1>
        </div>
        <StatusBadge status={guardian.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Personal Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Full Name</dt>
              <dd className="text-gray-900">
                {guardian.first_name}
                {guardian.middle_name ? ` ${guardian.middle_name}` : ""}{" "}
                {guardian.last_name}
              </dd>
            </div>
            {guardian.preferred_name && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Preferred Name</dt>
                <dd className="text-gray-900">{guardian.preferred_name}</dd>
              </div>
            )}
            {guardian.gender && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Gender</dt>
                <dd className="text-gray-900">{guardian.gender.charAt(0).toUpperCase() + guardian.gender.slice(1)}</dd>
              </div>
            )}
            {guardian.date_of_birth && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Date of Birth</dt>
                <dd className="text-gray-900">{new Date(guardian.date_of_birth).toLocaleDateString()}</dd>
              </div>
            )}
            {guardian.occupation && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Occupation</dt>
                <dd className="text-gray-900">{guardian.occupation}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Contact Information</h2>
          <dl className="space-y-2 text-sm">
            {guardian.phone && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Phone</dt>
                <dd className="text-gray-900">{guardian.phone}</dd>
              </div>
            )}
            {guardian.alternative_phone && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Alt. Phone</dt>
                <dd className="text-gray-900">{guardian.alternative_phone}</dd>
              </div>
            )}
            {guardian.email && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Email</dt>
                <dd className="text-gray-900">{guardian.email}</dd>
              </div>
            )}
            {guardian.address && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Address</dt>
                <dd className="text-gray-900 text-right max-w-xs">{guardian.address}</dd>
              </div>
            )}
            {guardian.id_reference && (
              <div className="flex justify-between">
                <dt className="text-gray-500">ID Reference</dt>
                <dd className="text-gray-900 font-mono">{guardian.id_reference}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-lg border border-gray-200 p-4 sm:col-span-2">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Connected Children</h2>
          {relationships.data.length === 0 ? (
            <p className="text-sm text-gray-500">No relationships recorded.</p>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase">Child</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase">Relationship</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase">Primary</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {relationships.data.map(
                    (rel: {
                      id: string;
                      child_id: string;
                      relationship_type: string;
                      is_primary: boolean;
                      is_active: boolean;
                      start_date: string;
                    }) => (
                      <tr key={rel.id}>
                        <td className="py-2 text-sm text-indigo-600">
                          <Link href={`/children/${rel.child_id}`}>
                            {rel.child_id.slice(0, 8)}...
                          </Link>
                        </td>
                        <td className="py-2 text-sm text-gray-900">
                          {rel.relationship_type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                        </td>
                        <td className="py-2 text-sm">
                          {rel.is_primary ? (
                            <span className="text-green-600 font-medium">Yes</span>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </td>
                        <td className="py-2 text-sm">
                          {rel.is_active ? (
                            <span className="text-green-600">Active</span>
                          ) : (
                            <span className="text-gray-400">Ended</span>
                          )}
                        </td>
                        <td className="py-2 text-sm text-gray-500">
                          {new Date(rel.start_date).toLocaleDateString()}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {guardian.notes && (
          <div className="rounded-lg border border-gray-200 p-4 sm:col-span-2">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Notes</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{guardian.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
