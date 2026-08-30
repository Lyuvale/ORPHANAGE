"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DisposeAsset({ assetId, alreadyDisposed }: { assetId: string; alreadyDisposed: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function dispose(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch(`/api/resources/assets/${assetId}/dispose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason || undefined }),
    });
    const json = await res.json().catch(() => ({ error: "Unexpected error" }));
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Failed to dispose asset");
      return;
    }
    setOpen(false);
    setReason("");
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        disabled={alreadyDisposed}
        onClick={() => setOpen(true)}
        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
      >
        Dispose Asset
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/40 p-4">
          <form onSubmit={dispose} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Dispose Asset</h3>
            <p className="mt-1 text-sm text-gray-500">
              This marks the asset as Disposed. This cannot be undone except by changing the status.
            </p>
            {error && <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Reason (optional)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-red-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
              >
                {saving ? "Disposing..." : "Dispose Asset"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm font-semibold text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
