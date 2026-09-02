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

  async function handleStatusChange(newStatus: string) {
    if (!confirm(`Change payment status to ${newStatus}?`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/payments/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: paymentId, status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to update.");
        return;
      }
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

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        onClick={() => handleStatusChange("SUCCESSFUL")}
        disabled={saving}
        className="text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
      >
        Approve
      </button>
      <button
        onClick={() => handleStatusChange("FAILED")}
        disabled={saving}
        className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}
