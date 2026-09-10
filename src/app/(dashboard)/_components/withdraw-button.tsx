"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Withdraw own submitted item (referrals.update holders). */
export default function WithdrawButton({ url }: { url: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    setError(null);
    if (typeof window !== "undefined" && !window.confirm("Withdraw this submission?")) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_status: "withdrawn" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to withdraw.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to withdraw.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && <div className="mb-1 text-xs text-red-600">{error}</div>}
      <button
        onClick={withdraw}
        disabled={busy}
        className="rounded-md bg-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
      >
        {busy ? "…" : "Withdraw"}
      </button>
    </div>
  );
}
