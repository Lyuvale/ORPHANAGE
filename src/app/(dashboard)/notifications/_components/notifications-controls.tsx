"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NotificationsControls({ unreadCount }: { unreadCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function markAll() {
    if (unreadCount === 0) return;
    setError("");
    setBusy(true);
    const res = await fetch("/api/notifications/read-all", { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({ error: "Failed to mark all read" }));
      setError(json.error || "Failed to mark all read");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={markAll}
        disabled={unreadCount === 0 || busy}
        className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
      >
        {busy ? "Marking…" : "Mark all as read"}
      </button>
    </div>
  );
}
