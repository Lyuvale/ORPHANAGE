"use client";

import { useState } from "react";

export default function CentreToggle({
  centreId,
  isActive,
}: {
  centreId: string;
  isActive: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/centres", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centre_id: centreId, is_active: !isActive }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Update failed");
      } else {
        window.location.reload();
      }
    } catch {
      setError("Update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        disabled={loading}
        className="rounded-md px-2.5 py-1 text-xs font-medium border text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? "Updating…" : isActive ? "Deactivate" : "Activate"}
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}