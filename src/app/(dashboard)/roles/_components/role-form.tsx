"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Permission = {
  id: string;
  module: string;
  action: string;
  description: string | null;
};

type RoleFormData = {
  id?: string;
  name: string;
  description: string;
  permission_ids: string[];
};

const MODULE_LABELS: Record<string, string> = {
  children: "Watoto",
  cases: "Kesi",
  finance: "Fedha",
  reports: "Ripoti",
  audit: "Ufuatiliaji",
  centres: "Vituo",
  subscriptions: "Usajili",
  platform: "Jukwaa la Msingi",
  online_contributions: "Michango Mtandaoni",
  payments: "Malipo",
  documents: "Nyaraka",
  referrals: "Rufaa",
  admissions: "Kupokea",
  placements: "Kuwekwa",
  safeguarding: "Ulinzi wa Watoto",
  staff: "Wafanyakazi",
  daily_care: "Huduma za Kila Siku",
  presence: "Uwepo",
  guardians: "Walezi",
  visits: "Ziara",
  health: "Afya",
  education_development: "Elimu na Maendeleo",
  resources: "Rasilimali",
  notifications: "Arifa",
  site: "Tovuti ya Kituo",
  roles: "Majukumu",
};

export default function RoleForm({ initial }: { initial?: RoleFormData }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initial?.permission_ids ?? []),
  );
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/permissions")
      .then((r) => r.json())
      .then((json) => {
        const perms = (json.data ?? []) as Permission[];
        setPermissions(perms);
        // Expand first few modules by default
        const modules = [...new Set(perms.map((p) => p.module))];
        setExpanded(new Set(modules.slice(0, 5)));
      })
      .catch(() => setError("Failed to load permissions"))
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of permissions) {
      if (!map.has(p.module)) map.set(p.module, []);
      map.get(p.module)!.push(p);
    }
    return map;
  }, [permissions]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleModule(module: string) {
    const perms = grouped.get(module) ?? [];
    const allSelected = perms.every((p) => selected.has(p.id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of perms) {
        if (allSelected) next.delete(p.id);
        else next.add(p.id);
      }
      return next;
    });
  }

  function toggleExpand(module: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError("Role name must be at least 2 characters");
      return;
    }
    if (selected.size === 0) {
      setError("Select at least one permission");
      return;
    }

    setSaving(true);
    try {
      const url = initial?.id ? `/api/roles/${initial.id}` : "/api/roles";
      const method = initial?.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          permission_ids: [...selected],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save role");
      router.push("/roles");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-zinc-500">Loading permissions…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900">Role Details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
              Role Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. NURSE, VOLUNTEER, KITCHEN_STAFF"
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
            <p className="mt-1 text-xs text-zinc-400">
              Letters, numbers, underscores. Converted to UPPER_CASE automatically.
            </p>
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-zinc-700">
              Description
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this role does"
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Permissions</h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                {selected.size} of {permissions.length} selected
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelected(new Set(permissions.map((p) => p.id)))}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-zinc-100">
          {[...grouped.entries()].map(([module, perms]) => {
            const allSelected = perms.every((p) => selected.has(p.id));
            const someSelected = perms.some((p) => selected.has(p.id));
            const isExpanded = expanded.has(module);
            const count = perms.filter((p) => selected.has(p.id)).length;

            return (
              <div key={module}>
                <button
                  type="button"
                  onClick={() => toggleExpand(module)}
                  className="flex w-full items-center justify-between px-6 py-3 text-left transition hover:bg-zinc-50"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={() => toggleModule(module)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                    <span className="text-sm font-medium text-zinc-900">
                      {MODULE_LABELS[module] ?? module}
                    </span>
                    <span className="text-xs text-zinc-400">{module}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">
                      {count}/{perms.length}
                    </span>
                    <svg
                      className={`h-4 w-4 text-zinc-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="grid gap-1 px-6 pb-3 pl-12">
                    {perms.map((p) => (
                      <label
                        key={p.id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 transition hover:bg-zinc-50"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggle(p.id)}
                          className="mt-0.5 h-4 w-4 rounded border-zinc-300"
                        />
                        <div>
                          <span className="text-sm text-zinc-700">
                            {p.description ?? `${p.module}.${p.action}`}
                          </span>
                          <span className="ml-2 text-xs text-zinc-400 font-mono">
                            {p.module}.{p.action}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || selected.size === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : initial?.id ? "Update Role" : "Create Role"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
