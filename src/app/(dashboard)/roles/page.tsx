"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

type Role = {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  centre_id: string | null;
};

type Permission = {
  id: string;
  module: string;
  action: string;
  description: string | null;
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch("/api/roles"),
        fetch("/api/permissions"),
      ]);
      const rolesJson = await rolesRes.json();
      const permsJson = await permsRes.json();
      if (!rolesRes.ok) throw new Error(rolesJson.error || "Failed to load roles");
      setRoles(rolesJson.data ?? []);
      setPermissions(permsJson.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete role "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/roles/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete");
      setRoles((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(null);
    }
  }

  const systemRoles = roles.filter((r) => r.is_system);
  const customRoles = roles.filter((r) => !r.is_system);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-zinc-500">Loading roles…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Roles &amp; Permissions</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage system roles and create custom roles for your centre.
          </p>
        </div>
        <Link
          href="/roles/new"
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Custom Role
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Custom Roles */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Custom Roles ({customRoles.length})
        </h2>
        {customRoles.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
            <p className="text-sm text-zinc-500">No custom roles yet.</p>
            <p className="mt-1 text-xs text-zinc-400">
              Create a role to give staff specific access without giving them full manager rights.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {customRoles.map((role) => (
              <div
                key={role.id}
                className="rounded-xl border border-zinc-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{role.name}</p>
                    {role.description && (
                      <p className="mt-1 text-xs text-zinc-500">{role.description}</p>
                    )}
                  </div>
                  <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                    Custom
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Link
                    href={`/roles/${role.id}/edit`}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(role.id, role.name)}
                    disabled={deleting === role.id}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    {deleting === role.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* System Roles */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          System Roles ({systemRoles.length})
        </h2>
        <div className="rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs font-medium text-zinc-500 uppercase">
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {systemRoles.map((role) => (
                <tr key={role.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-3 font-medium text-zinc-900">{role.name}</td>
                  <td className="px-5 py-3 text-zinc-500">{role.description ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                      System
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
