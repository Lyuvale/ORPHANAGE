"use client";

import { useState } from "react";

const inputCls =
  "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25";
const labelCls = "block text-xs font-medium text-gray-700";

const QUICK_AMOUNTS = [10000, 25000, 50000, 100000];

/**
 * Public "record my transfer" form.
 *
 * Submits a PENDING contribution with a bank / M-Pesa Jina la Muamala.
 * It only counts towards the need after the accountant verifies it.
 */
export default function NeedDonateForm({
  centreCode,
  needId,
  onDone,
}: {
  centreCode: string;
  needId: string;
  onDone?: () => void;
}) {
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
      setError("Weka kiasi cha mchango kwanza.");
      return;
    }
    if (!reference.trim()) {
      setError("Weka jina la muamala.");
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit contribution.");
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <div
        className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-center"
        role="status"
        aria-live="polite"
      >
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white">
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
            <path
              d="M5.5 13.5l4.2 4.2L18.5 9"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <p className="mt-4 text-lg font-semibold text-emerald-900">
          Asante! Shukrani nyingi.
        </p>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-emerald-800">
          Mchango wako unangoja uthibitisho wa mhasibu wa kituo. Utaonekana
          kwenye ukurasa huu mara baada ya Jina la Muamala kuhakikiwa.
        </p>
        {onDone ? (
          <button
            type="button"
            onClick={onDone}
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Sawa, nimeelewa
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
        Fomu ya Mchango
      </p>

      {error ? (
        <p
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-3">
        <span className={labelCls}>Chagua kiasi (TZS)</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((quick) => {
            const active = Number(amount) === quick;
            return (
              <button
                key={quick}
                type="button"
                aria-pressed={active}
                onClick={() => setAmount(String(quick))}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 ${
                  active
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-emerald-200 bg-white text-emerald-900 hover:border-emerald-400"
                }`}
              >
                {quick.toLocaleString()}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex rounded-lg shadow-sm">
          <span className="inline-flex select-none items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-xs font-semibold text-gray-500">
            TZS
          </span>
          <input
            id={`donate-amount-${needId}`}
            type="number"
            min="1"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${inputCls} rounded-l-none rounded-r-lg`}
            placeholder="au weka kiasi chochote"
            aria-label="Kiasi cha mchango (TZS)"
            required
          />
        </div>
      </div>

      <div className="mt-3">
        <label className={labelCls} htmlFor={`donate-ref-${needId}`}>
          Jina la Muamala / Receipt No
        </label>
        <input
          id={`donate-ref-${needId}`}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          className={`${inputCls} mt-1.5`}
          placeholder="Bank au M-Pesa transaction code"
          autoComplete="off"
          required
        />
      </div>

      <div className="mt-3">
        <label className={labelCls} htmlFor={`donate-name-${needId}`}>
          Jina la Mchangiaji
        </label>
        <input
          id={`donate-name-${needId}`}
          value={contributorName}
          onChange={(e) => setContributorName(e.target.value)}
          className={`${inputCls} mt-1.5`}
          placeholder="Hiari, lakini hutusaidia kushukuru"
          autoComplete="name"
        />
      </div>

      <p className="mt-3 text-[11px] leading-5 text-emerald-900/70">
        Mchango wako utaonekana baada ya mhasibu wa kituo kuthibitisha jina la
        muamala.
      </p>

      <button
        type="submit"
        disabled={saving}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60"
      >
        {saving ? "Inatuma…" : "Tuma Mchango"}
      </button>
    </form>
  );
}
