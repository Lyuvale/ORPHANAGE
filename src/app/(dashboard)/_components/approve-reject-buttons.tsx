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
  approveLabel = "Approve",
  rejectLabel = "Reject",
  confirmMessage,
  requireReasonOnReject = false,
  reasonLabel = "Reason (required)",
}: {
  url: string;
  method?: "PATCH" | "POST";
  approveBody: Record<string, unknown>;
  rejectBody: Record<string, unknown>;
  showApprove?: boolean;
  showReject?: boolean;
  small?: boolean;
  approveLabel?: string;
  rejectLabel?: string;
  confirmMessage?: string;
  requireReasonOnReject?: boolean;
  reasonLabel?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [askingReason, setAskingReason] = useState(false);
  const [reason, setReason] = useState("");

  async function act(kind: "approve" | "reject", reasonText?: string) {
    setError(null);
    if (confirmMessage && typeof window !== "undefined") {
      if (!window.confirm(confirmMessage)) return;
    }
    setBusy(kind);
    try {
      const base = kind === "approve" ? approveBody : rejectBody;
      const body =
        kind === "reject" && reasonText?.trim()
          ? { ...base, reason: reasonText.trim() }
          : base;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Action failed.");
      setAskingReason(false);
      setReason("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  function onRejectClick() {
    if (requireReasonOnReject) {
      setError(null);
      setAskingReason(true);
      return;
    }
    act("reject");
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
            {busy === "approve" ? "…" : approveLabel}
          </button>
        )}
        {showReject && (
          <button
            onClick={onRejectClick}
            disabled={busy !== null}
            className={`rounded-md bg-rose-600 font-semibold text-white hover:bg-rose-500 disabled:opacity-50 ${size}`}
          >
            {busy === "reject" ? "…" : rejectLabel}
          </button>
        )}
      </div>
      {askingReason && (
        <div className="mt-2 space-y-2">
          <label className="block text-xs font-medium text-gray-700">
            {reasonLabel}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs"
          />
          <div className="flex gap-2">
            <button
              onClick={() => act("reject", reason)}
              disabled={busy !== null || !reason.trim()}
              className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
            >
              {busy === "reject" ? "…" : `Confirm ${rejectLabel}`}
            </button>
            <button
              onClick={() => {
                setAskingReason(false);
                setReason("");
              }}
              className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-gray-700 border hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
