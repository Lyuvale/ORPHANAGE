"use client";

import { useEffect, useState } from "react";

interface PublicCentre {
  id: string;
  name: string;
  code: string | null;
  purpose_presets: string[];
  default_purpose: string;
}

type Step = "form" | "checkout";

export default function DonateClient() {
  const [centres, setCentres] = useState<PublicCentre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("form");
  const [centreId, setCentreId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/public/centres", { cache: "no-store" });
        const body = (await res.json()) as { data?: PublicCentre[] };
        setCentres(body.data ?? []);
      } catch {
        setError("Could not load centres. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  function selectCentre(id: string) {
    setCentreId(id);
    const c = centres.find((x) => x.id === id);
    setPurpose(c?.default_purpose ?? "");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/public/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centre_id: centreId,
          amount: Number(amount),
          purpose,
          contributor_name: name || undefined,
          contributor_email: email || undefined,
        }),
      });
      const body = (await res.json()) as {
        data?: { checkout_url: string };
        error?: string;
      };
      if (!res.ok || !body.data) {
        setError(body.error ?? "Could not start your contribution.");
        return;
      }
      setCheckoutUrl(body.data.checkout_url);
      setStep("checkout");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading centres…</p>;

  if (step === "checkout") {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm border">
        <h2 className="text-xl font-semibold text-gray-900">Continue to payment</h2>
        <p className="mt-2 text-sm text-gray-600">
          You&apos;ll be taken to a secure gateway to complete your contribution.
          No card details are stored by this platform.
        </p>
        <div className="mt-4 flex gap-3">
          <a
            href={checkoutUrl}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Continue
          </a>
          <button
            onClick={() => setStep("form")}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (centres.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Online contributions are not currently available.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm border">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div>
        <label className="block text-sm font-medium text-gray-700">Centre</label>
        <select
          value={centreId}
          onChange={(e) => selectCentre(e.target.value)}
          required
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Select a centre</option>
          {centres.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Purpose</label>
        <select
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          required
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
        >
          {centres
            .find((c) => c.id === centreId)
            ?.purpose_presets.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Amount (KES)</label>
        <input
          type="number"
          min="1"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Your name (optional)
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email (optional)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={200}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? "Starting…" : "Continue to payment"}
      </button>
    </form>
  );
}