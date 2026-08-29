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

  async function setStatus(status: "APPROVED" | "REJECTED" | "PENDING") {
    setError("");
    setBusy(status);
    const res = await fetch(`/api/resources/expenses/${expenseId}/approval`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json().catch(() => ({ error: "Unexpected error" }));
    setBusy("");
    if (!res.ok) {
      setError(json.error || "Failed to update status");
      return;
    }
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
            onClick={() => setStatus("REJECTED")}
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
    </div>
  );
}
