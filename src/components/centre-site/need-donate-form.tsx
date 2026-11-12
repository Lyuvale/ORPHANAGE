"use client";

import { useState } from "react";

const inputCls =
  "mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";
const labelCls = "block text-sm font-medium text-gray-700";

/**
 * Public "record my transfer" form.
 *
 * Submits a PENDING contribution with a bank / M-Pesa reference. It only
 * counts towards the need after the centre accountant verifies it.
 */
export default function NeedDonateForm({
  centreCode,
  needId,
}: {
  centreCode: string;
  needId: string;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [contributorName, setContributorName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (!reference.trim()) {
      setError("Enter the transaction reference.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/public/sites/${centreCode}/donate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          needId,
          amount: numericAmount,
          transaction_reference: reference.trim(),
          contributor_name: contributorName.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.details || json.error || "Could not submit contribution.");
      }
      setSuccess(true);
      setAmount("");
      setReference("");
      setContributorName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit contribution.");
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        Asante! Mchango wako unangoja uthibitisho wa mhasibu.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
      >
        Donate to this need
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-5 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <h4 className="text-sm font-semibold text-gray-900">
          Donate to this need
        </h4>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>

      {error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-3 space-y-3">
        <div>
          <label className={labelCls} htmlFor={`donate-amount-${needId}`}>
            Amount (TZS)
          </label>
          <input
            id={`donate-amount-${needId}`}
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
          <label className={labelCls} htmlFor={`donate-ref-${needId}`}>
            Transaction reference
          </label>
          <input
            id={`donate-ref-${needId}`}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className={inputCls}
            placeholder="Bank or M-Pesa reference"
            required
          />
        </div>
        <div>
          <label className={labelCls} htmlFor={`donate-name-${needId}`}>
            Your name
          </label>
          <input
            id={`donate-name-${needId}`}
            value={contributorName}
            onChange={(e) => setContributorName(e.target.value)}
            className={inputCls}
            placeholder="Optional, but helps us thank you"
          />
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Your contribution appears after the centre accountant verifies the
        reference.
      </p>

      <button
        type="submit"
        disabled={saving}
        className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? "Submitting…" : "Submit contribution"}
      </button>
    </form>
  );
}
