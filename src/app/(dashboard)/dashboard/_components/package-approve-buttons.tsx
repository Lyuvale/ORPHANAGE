"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Approve / Reject an intake package (referral + its admission) as ONE thing.
 * Approval admits the referral and approves the admission together; rejection
 * rejects/denies both. Guardians travel with the package (shown alongside)
 * and need no decision — they link automatically at registration.
 */
export default function PackageApproveButtons({
  referralId,
  admissionId,
}: {
  referralId: string;
  admissionId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(url: string, body: Record<string, unknown>) {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "Action failed.");
  }

  async function act(kind: "approve" | "reject") {
    setError(null);
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        kind === "approve"
          ? "Approve this referral, admission and guardian package?"
          : "Reject this referral, admission and guardian package?",
      )
    ) {
      return;
    }
    setBusy(kind);
    try {
      if (kind === "approve") {
        await call(`/api/referrals/${referralId}`, { new_status: "admitted" });
        if (admissionId) {
          await call(`/api/admissions/${admissionId}`, { new_status: "approved" });
        }
      } else {
        await call(`/api/referrals/${referralId}`, { new_status: "rejected" });
        if (admissionId) {
          await call(`/api/admissions/${admissionId}`, { new_status: "denied" });
        }
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {error && <div className="mb-1 text-xs text-red-600">{error}</div>}
      <div className="flex gap-2">
        <button
          onClick={() => act("approve")}
          disabled={busy !== null}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy === "approve" ? "…" : "Approve all"}
        </button>
        <button
          onClick={() => act("reject")}
          disabled={busy !== null}
          className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
        >
          {busy === "reject" ? "…" : "Reject all"}
        </button>
      </div>
    </div>
  );
}
