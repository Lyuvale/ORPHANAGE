"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SiteDonationBlock } from "@/types/centre-site";

const QUICK_AMOUNTS = [20000, 50000, 100000, 250000];

interface PresetEntry {
  code: string;
  purpose_presets?: string[];
  default_purpose?: string;
}

export default function DonationBlock({
  centreCode,
  block,
}: {
  centreCode: string;
  block: SiteDonationBlock;
}) {
  const router = useRouter();

  const [purposes, setPurposes] = useState<string[]>(["General Support"]);
  const [defaultPurpose, setDefaultPurpose] = useState("General Support");
  const [purpose, setPurpose] = useState("");
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/public/centres", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        const entry = (json.data ?? []).find(
          (c: PresetEntry) => c.code === centreCode,
        ) as PresetEntry | undefined;
        if (!entry || cancelled) return;
        const presets = Array.isArray(entry.purpose_presets)
          ? (entry.purpose_presets as string[])
          : ["General Support"];
        const def = typeof entry.default_purpose === "string" ? entry.default_purpose : "General Support";
        setPurposes(presets);
        setDefaultPurpose(def);
        setPurpose(def);
      } catch {
        // keep defaults when offline / not enrolled
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [centreCode]);

  const effectivePurpose = purpose || defaultPurpose;

  async function donate() {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a donation amount.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/sites/${encodeURIComponent(centreCode)}/donate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numericAmount,
          purpose: effectivePurpose,
          name: name.trim() || undefined,
          email: email.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to start donation.");
      }
      router.push(json?.data?.checkoutUrl ?? "/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start donation.");
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">
        {block.data.title || "Support this centre"}
      </h3>
      {block.data.description ? (
        <p className="mt-1 text-sm text-gray-500">{block.data.description}</p>
      ) : null}

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700">Donate to</label>
        <select
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
          value={effectivePurpose}
          onChange={(e) => setPurpose(e.target.value)}
        >
          {purposes.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700">Amount (TZS)</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmount(String(a))}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                Number(amount) === a
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {a.toLocaleString()}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={1}
          max={100000000}
          className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Or enter any amount"
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
        />
        <input
          type="email"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
        />
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={donate}
        disabled={submitting}
        className="mt-4 w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
      >
        {submitting ? "Starting…" : "Donate"}
      </button>
    </div>
  );
}