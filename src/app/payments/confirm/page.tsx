"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Outcome = "CONFIRMED" | "ALREADY" | "IGNORED";

function ConfirmClient() {
  const params = useSearchParams();
  const ref = params.get("ref") ?? "";
  const [state, setState] = useState<{
    loading: boolean;
    ok: boolean;
    text: string;
  }>({ loading: true, ok: false, text: "Confirming your contribution…" });

  useEffect(() => {
    let cancelled = false;
    async function confirm() {
      if (!ref) {
        if (!cancelled) setState({ loading: false, ok: false, text: "Missing reference." });
        return;
      }
      try {
        const res = await fetch("/api/public/payments/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: ref }),
        });
        const json = await res.json();
        const outcome = json?.data?.outcome as Outcome | undefined;
        if (outcome === "CONFIRMED") {
          if (!cancelled) setState({ loading: false, ok: true, text: "Thank you! Your contribution was received." });
        } else if (outcome === "ALREADY") {
          if (!cancelled) setState({ loading: false, ok: true, text: "This contribution was already confirmed." });
        } else {
          if (!cancelled) setState({ loading: false, ok: false, text: "We couldn't find that contribution. Please try again." });
        }
      } catch {
        if (!cancelled) setState({ loading: false, ok: false, text: "Something went wrong confirming your contribution. Please try again." });
      }
    }
    void confirm();
    return () => {
      cancelled = true;
    };
  }, [ref]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        {state.loading ? (
          <>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" aria-hidden="true" />
            <p className="mt-4 text-sm text-gray-500">{state.text}</p>
          </>
        ) : (
          <>
            <div
              className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
                state.ok ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
              }`}
              aria-hidden="true"
            >
              {state.ok ? "✓" : "!"}
            </div>
            <p className="mt-4 text-base font-medium text-gray-900">{state.text}</p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Back to home
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentConfirmPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <ConfirmClient />
    </Suspense>
  );
}