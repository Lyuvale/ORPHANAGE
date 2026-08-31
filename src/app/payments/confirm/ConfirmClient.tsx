"use client";

import { useState } from "react";

type Status = "idle" | "completing" | "success" | "error";

export default function ConfirmClient({ reference }: { reference: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setStatus("completing");
    setError(null);
    try {
      const res = await fetch("/api/public/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          status: "SUCCESSFUL",
          amount: 0, // server verifies the stored amount; the mock server accepts matches
        }),
      });
      const body = (await res.json()) as { error?: string; outcome?: string };
      if (!res.ok) {
        setError(body.error ?? "Payment could not be completed.");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setError("Something went wrong completing the payment.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm border">
        <h2 className="text-lg font-semibold text-green-700">Payment received</h2>
        <p className="mt-2 text-sm text-gray-600">
          Thank you! The centre has been notified. You can close this page.
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm border">
        <h2 className="text-lg font-semibold text-red-700">Payment not completed</h2>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        <button
          onClick={() => setStatus("idle")}
          className="mt-4 rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border">
      <p className="text-sm text-gray-600">Reference: {reference}</p>
      <button
        onClick={confirm}
        disabled={status === "completing"}
        className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {status === "completing" ? "Processing…" : "Confirm (mock payment)"}
      </button>
    </div>
  );
}