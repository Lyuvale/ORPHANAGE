"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ChildRow = { id: string; first_name: string; last_name: string; reference_number: string | null };

export default function ManageChildren({
  benefitId,
  initialChildren,
}: {
  benefitId: string;
  initialChildren: ChildRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [allChildren, setAllChildren] = useState<ChildRow[]>([]);
  const [selected, setSelected] = useState<string[]>(initialChildren.map((c) => c.id));
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || loaded) return;
    const q = new URLSearchParams();
    q.set("limit", "200");
    fetch(`/api/children?${q.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        setAllChildren(json.data ?? []);
        setLoaded(true);
      })
      .catch(() => {});
  }, [open, loaded]);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch(`/api/resources/benefits/${benefitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ child_ids: selected }),
    });
    const json = await res.json().catch(() => ({ error: "Unexpected error" }));
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Failed to update children");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  const filtered = allChildren.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.first_name.toLowerCase().includes(s) ||
      c.last_name.toLowerCase().includes(s) ||
      (c.reference_number ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        {open ? "Cancel" : "Manage Children"}
      </button>

      {open && (
        <form onSubmit={save} className="mt-4 rounded-lg border bg-gray-50 p-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search children..."
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {!loaded && <p className="text-sm text-gray-400">Loading children...</p>}
            {loaded && filtered.length === 0 && (
              <p className="text-sm text-gray-400">No children match.</p>
            )}
            {filtered.map((c) => {
              const checked = selected.includes(c.id);
              return (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-gray-100"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(c.id)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-900">
                    {c.first_name} {c.last_name}
                  </span>
                  {c.reference_number && (
                    <span className="text-xs text-gray-400">{c.reference_number}</span>
                  )}
                </label>
              );
            })}
          </div>
          {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
          <button
            type="submit"
            disabled={saving}
            className="mt-3 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Children"}
          </button>
        </form>
      )}
    </div>
  );
}
