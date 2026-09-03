"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Shared Approve / Reject buttons for in-module review queues
 * (referrals, admissions, visits, expenses). The caller decides visibility
 * via its own approval permission; each endpoint enforces it again.
 */
export default function ApproveRejectButtons({
  url,
  method = "PATCH",
  approveBody,
  rejectBody,
  showApprove = true,
  showReject = true,
  small = true,
}: {
  url: string;
  method?: "PATCH" | "POST";
  approveBody: Record<string, unknown>;
  rejectBody: Record<string, unknown>;
  showApprove?: boolean;
  showReject?: boolean;
  small?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(kind: "approve" | "reject") {
    setError(null);
    setBusy(kind);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kind === "approve" ? approveBody : rejectBody),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Action failed.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  const size = small ? "px-2.5 py-1 text-xs" : "px-3 py-2 text-sm";

  return (
    <div>
      {error && <div className="mb-1 text-xs text-red-600">{error}</div>}
      <div className="flex gap-2">
        {showApprove && (
          <button
            onClick={() => act("approve")}
            disabled={busy !== null}
            className={`rounded-md bg-emerald-600 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 ${size}`}
          >
            {busy === "approve" ? "…" : "Approve"}
          </button>
        )}
        {showReject && (
          <button
            onClick={() => act("reject")}
            disabled={busy !== null}
            className={`rounded-md bg-rose-600 font-semibold text-white hover:bg-rose-500 disabled:opacity-50 ${size}`}
          >
            {busy === "reject" ? "…" : "Reject"}
          </button>
        )}
      </div>
    </div>
  );
}
