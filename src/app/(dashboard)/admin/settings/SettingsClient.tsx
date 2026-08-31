"use client";

import { useState } from "react";

export default function SettingsClient({ masterEnabled }: { masterEnabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(masterEnabled);

  async function save(next: boolean) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ online_contributions_enabled: next }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Save failed");
      } else {
        setEnabled(next);
      }
    } catch {
      setError("Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => save(!enabled)}
        disabled={loading}
        className="rounded-md px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "Saving…" : enabled ? "Disable online contributions" : "Enable online contributions"}
      </button>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
        }`}
      >
        {enabled ? "Enabled" : "Disabled"}
      </span>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}