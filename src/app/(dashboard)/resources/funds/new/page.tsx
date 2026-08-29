"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function NewFundForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetSourceId = searchParams.get("source_id") ?? "";

  const [sources, setSources] = useState<
    { id: string; source_name: string; remaining: number }[]
  >([]);
  const [sourceId, setSourceId] = useState(presetSourceId);
  const [fundName, setFundName] = useState("");
  const [amountAllocated, setAmountAllocated] = useState("");
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/resources/sources")
      .then((r) => r.json())
      .then((json) => {
        setSources(json.data ?? []);
        if (!presetSourceId && json.data?.length) setSourceId(json.data[0].id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = sources.find((s) => s.id === sourceId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/resources/funds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_id: sourceId,
        fund_name: fundName,
        amount_allocated: amountAllocated ? Number(amountAllocated) : undefined,
        purpose: purpose || undefined,
      }),
    });
    const json = await res.json().catch(() => ({ error: "Unexpected error" }));
    if (!res.ok) {
      setError(json.error || "Failed to create fund");
      setSaving(false);
      return;
    }
    router.push(`/resources/funds/${json.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900">Add Fund</h2>
        <p className="text-sm text-gray-500">Allocate money from a Source for a specific purpose</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Source</label>
          <select
            required
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          >
            <option value="">Select a source...</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.source_name} ({s.remaining?.toLocaleString?.() ?? "-"} remaining)
              </option>
            ))}
          </select>
          {selected && selected.remaining !== undefined && (
            <p className="mt-1 text-xs text-gray-500">
              This source has {selected.remaining.toLocaleString()} remaining to allocate.
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Fund Name</label>
          <input
            type="text"
            required
            value={fundName}
            onChange={(e) => setFundName(e.target.value)}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Amount Allocated (Tsh)</label>
          <input
            type="number"
            step="0.01"
            required
            min="0"
            value={amountAllocated}
            onChange={(e) => setAmountAllocated(e.target.value)}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Purpose</label>
          <input
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Fund"}
        </button>
        <Link href="/resources/funds" className="text-sm font-semibold text-gray-600 hover:text-gray-900">
          Cancel
        </Link>
      </div>
    </form>
  );
}
