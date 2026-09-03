"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PaymentActions({
  paymentId,
  currentStatus,
}: {
  paymentId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function sendReview(newStatus: string, reason?: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/payments/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_id: paymentId,
          status: newStatus,
          feedback: reason,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to update.");
        return;
      }
      setRejecting(false);
      setFeedback("");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  if (currentStatus !== "PENDING") {
    return null;
  }

  if (rejecting) {
    return (
      <div className="flex flex-col gap-2 text-left">
        <input
          type="text"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Feedback / sababu ya kurudisha"
          className="rounded-md border py-1 px-2 text-xs"
        />
        <div className="flex gap-1">
          <button
            onClick={() => sendReview("FAILED", feedback.trim() || undefined)}
            disabled={saving}
            className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-500 disabled:opacity-50"
          >
            {saving ? "..." : "Reject"}
          </button>
          <button
            onClick={() => { setRejecting(false); setFeedback(""); setError(null); }}
            className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <div className="flex gap-2">
        <button
          onClick={() => sendReview("SUCCESSFUL")}
          disabled={saving}
          className="text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
        >
          Approve
        </button>
        <button
          onClick={() => setRejecting(true)}
          disabled={saving}
          className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
