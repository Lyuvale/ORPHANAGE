"use client";

import { useState } from "react";

const inputCls =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";
const labelCls = "block text-sm font-medium text-zinc-700";

export default function ManualContributionForm({
  needs,
  onSaved,
  onCancel,
}: {
  needs: Array<{ id: string; title: string }>;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [needId, setNeedId] = useState(needs[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [contributorName, setContributorName] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!needId) {
      setError("Select a need.");
      return;
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/centre-site/needs/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          needId,
          amount: numericAmount,
          contributor_name: contributorName.trim() || null,
          transaction_reference: reference.trim() || null,
          note: note.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.details || json.error || "Failed to save contribution");
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save contribution");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 rounded-xl border border-zinc-200 bg-white p-5"
    >
      <div className="border-b border-gray-100 pb-4">
        <h3 className="text-sm font-semibold text-zinc-900">
          Log manual contribution
        </h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          Record money received offline (cash, bank or M-Pesa). It counts
          towards progress immediately because you are recording it.
        </p>
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="manual-need">
            Need
          </label>
          <select
            id="manual-need"
            value={needId}
            onChange={(e) => setNeedId(e.target.value)}
            className={inputCls}
          >
            {needs.map((need) => (
              <option key={need.id} value={need.id}>
                {need.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls} htmlFor="manual-amount">
            Amount (TZS)
          </label>
          <input
            id="manual-amount"
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputCls}
            placeholder="e.g. 50000"
            required
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="manual-name">
            Jina la Mchangiaji
          </label>
          <input
            id="manual-name"
            value={contributorName}
            onChange={(e) => setContributorName(e.target.value)}
            className={inputCls}
            placeholder="Hiari"
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="manual-ref">
            Jina la Muamala / Receipt No
          </label>
          <input
            id="manual-ref"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className={inputCls}
            placeholder="Bank au M-Pesa transaction code"
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="manual-note">
            Note
          </label>
          <input
            id="manual-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputCls}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save contribution"}
        </button>
      </div>
    </form>
  );
}
