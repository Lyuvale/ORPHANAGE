"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import RoleForm from "../../_components/role-form";

export default function EditRolePage() {
  const params = useParams<{ id: string }>();
  const [initial, setInitial] = useState<{
    id: string;
    name: string;
    description: string;
    permission_ids: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/roles/${params.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.data) throw new Error(json.error || "Role not found");
        setInitial({
          id: json.data.id,
          name: json.data.name,
          description: json.data.description ?? "",
          permission_ids: json.data.permission_ids ?? [],
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-zinc-500">Loading role…</p>
      </div>
    );
  }

  if (error || !initial) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error || "Role not found"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Edit Role: {initial.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Update the permissions for this custom role.
        </p>
      </div>
      <RoleForm initial={initial} />
    </div>
  );
}
