"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApprovalActions({
  expenseId,
  currentStatus,
}: {
  expenseId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState("");
  const [askingReason, setAskingReason] = useState(false);
  const [reason, setReason] = useState("");

  async function setStatus(status: "APPROVED" | "REJECTED" | "PENDING", reasonText?: string) {
    setError("");
    setBusy(status);
    const res = await fetch(`/api/resources/expenses/${expenseId}/approval`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        reasonText?.trim() ? { status, reason: reasonText.trim() } : { status },
      ),
    });
    const json = await res.json().catch(() => ({ error: "Unexpected error" }));
    setBusy("");
    if (!res.ok) {
      setError(json.error || "Failed to update status");
      return;
    }
    setAskingReason(false);
    setReason("");
    router.refresh();
  }

  return (
    <div>
      {error && <div className="mb-2 text-sm text-red-600">{error}</div>}
      <div className="flex flex-wrap gap-2">
        {currentStatus !== "APPROVED" && (
          <button
            onClick={() => setStatus("APPROVED")}
            disabled={!!busy}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy === "APPROVED" ? "Saving..." : "Approve"}
          </button>
        )}
        {currentStatus !== "REJECTED" && (
          <button
            onClick={() => {
              setError("");
              setAskingReason(true);
            }}
            disabled={!!busy}
            className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
          >
            {busy === "REJECTED" ? "Saving..." : "Reject"}
          </button>
        )}
        {currentStatus !== "PENDING" && (
          <button
            onClick={() => setStatus("PENDING")}
            disabled={!!busy}
            className="rounded-md bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
          >
            {busy === "PENDING" ? "Saving..." : "Back to Pending"}
          </button>
        )}
      </div>
      {askingReason && (
        <div className="mt-2 space-y-2">
          <label className="block text-xs font-medium text-gray-700">
            Reason (required)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setStatus("REJECTED", reason)}
              disabled={!!busy || !reason.trim()}
              className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
            >
              {busy === "REJECTED" ? "Saving..." : "Confirm Reject"}
            </button>
            <button
              onClick={() => {
                setAskingReason(false);
                setReason("");
              }}
              className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 border hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
