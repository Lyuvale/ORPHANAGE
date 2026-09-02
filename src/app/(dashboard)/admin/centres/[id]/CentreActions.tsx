"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CentreActions({
  centreId,
  centreName,
  isActive,
}: {
  centreId: string;
  centreName: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setToggling(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/centres", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centre_id: centreId, is_active: !isActive }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to update.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/centres/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centre_id: centreId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to delete.");
        setDeleting(false);
        return;
      }
      router.push("/admin/centres");
    } catch {
      setError("Network error.");
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
          isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
        }`}
      >
        {isActive ? "Active" : "Deactivated"}
      </span>
      <button
        onClick={handleToggle}
        disabled={toggling}
        className="rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {toggling ? "..." : isActive ? "Deactivate" : "Activate"}
      </button>
      <button
        onClick={() => setShowDeleteConfirm(true)}
        className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        Delete
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete Centre?</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete <strong>{centreName}</strong>? This action cannot be undone.
              All staff, children, and data associated with this centre will be affected.
            </p>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setError(null); }}
                className="rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
