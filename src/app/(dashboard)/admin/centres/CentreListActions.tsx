"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CentreListActions({
  centreId,
  centreName,
  isActive,
}: {
  centreId: string;
  centreName: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

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
        router.refresh();
      }
    } catch {
      setError("Update failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/centres/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centre_id: centreId }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(json?.error ?? "Failed to delete.");
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        disabled={loading}
        className={`rounded-md px-2.5 py-1 text-xs font-medium border hover:bg-gray-50 disabled:opacity-50 ${
          isActive ? "border-amber-200 text-amber-700" : "text-gray-700"
        }`}
      >
        {loading ? "Updating…" : isActive ? "Deactivate" : "Activate"}
      </button>
      <button
        onClick={() => setConfirming(true)}
        disabled={loading}
        className="rounded-md px-2.5 py-1 text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        Delete
      </button>
      {error ? (
        <button onClick={() => setError(null)} title="Dismiss" className="text-xs text-red-600 underline">
          {error}
        </button>
      ) : null}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete centre?</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to <strong>permanently delete</strong> <strong>{centreName}</strong>? This cannot
              be undone. All of its data, staff accounts and subscriptions will be removed and its code freed.
            </p>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setConfirming(false);
                  setError(null);
                }}
                className="rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {loading ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
