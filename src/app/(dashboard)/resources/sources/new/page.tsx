"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SUPPORT_SOURCE_TYPES, getSourceTypeDisplay } from "@/types/resources";
import { parseMoneyInput, formatValidationDetails } from "@/lib/money";

export default function NewSourceForm() {
  const router = useRouter();

  useEffect(() => {
    // Source creation is the Accountant's duty. Anyone without
    // resources.manage is sent back (the API enforces the same rule).
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { permissions: [] }))
      .then((j) => {
        const perms: string[] = Array.isArray(j.permissions) ? j.permissions : [];
        if (!perms.includes("resources.manage")) {
          router.replace("/resources/sources");
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [sourceType, setSourceType] = useState(SUPPORT_SOURCE_TYPES[0]);
  const [sourceName, setSourceName] = useState("");
  const [amount, setAmount] = useState("");
  const [sourceDate, setSourceDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsedAmount = parseMoneyInput(amount);
    if (!parsedAmount.ok) {
      setError(parsedAmount.error);
      setSaving(false);
      return;
    }
    setSaving(true);
    const res = await fetch("/api/resources/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_type: sourceType,
        source_name: sourceName,
        amount: parsedAmount.value,
        source_date: sourceDate || undefined,
        purpose: purpose || undefined,
        notes: notes || undefined,
      }),
    });
    const json = await res.json().catch(() => ({ error: "Unexpected error" }));
    if (!res.ok) {
      setError(
        formatValidationDetails(json.details) ?? json.error ?? "Failed to create source",
      );
      setSaving(false);
      return;
    }
    router.push(`/resources/sources/${json.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-medium text-zinc-900">Add Source</h2>
        <p className="text-sm text-zinc-500">Where support / financial resources come from</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700">Source Type</label>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as never)}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          >
            {SUPPORT_SOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {getSourceTypeDisplay(t)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Source Name</label>
          <input
            type="text"
            required
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Amount (Tsh)</label>
          <input
            type="number"
            step="0.01"
            required
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Date</label>
          <input
            type="date"
            value={sourceDate}
            onChange={(e) => setSourceDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-zinc-700">Purpose</label>
          <input
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-zinc-700">Notes</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-500 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Source"}
        </button>
        <Link href="/resources/sources" className="text-sm font-semibold text-zinc-600 hover:text-zinc-900">
          Cancel
        </Link>
      </div>
    </form>
  );
}
