"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Manager-only archive (delete) of a child record, with confirmation. */
export default function DeleteChildButton({
  childId,
  childName,
}: {
  childId: string;
  childName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Archive (delete) the record of ${childName}? This deactivates the record but preserves history.`,
      )
    ) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/children/${childId}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to delete.");
      router.push("/children");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && <div className="mb-1 text-xs text-red-600">{error}</div>}
      <button
        onClick={remove}
        disabled={busy}
        className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-red-700 shadow-sm ring-1 ring-inset ring-red-300 hover:bg-red-50 disabled:opacity-50"
      >
        {busy ? "…" : "Delete"}
      </button>
    </div>
  );
}
