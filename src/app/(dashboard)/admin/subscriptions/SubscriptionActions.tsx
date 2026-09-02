"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = ["trial", "active", "expired", "suspended", "cancelled"];

export default function SubscriptionActions({
  subscriptionId,
  currentStatus,
  currentEndDate,
}: {
  subscriptionId: string;
  currentStatus: string;
  currentEndDate: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [newEndDate, setNewEndDate] = useState(currentEndDate ?? "");

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { status: newStatus };
      if (newEndDate !== currentEndDate) {
        payload.end_date = newEndDate || null;
      }
      const res = await fetch(`/api/platform/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to update.");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this subscription? This cannot be undone.")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform/subscriptions/${subscriptionId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to delete.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 text-left">
        <select
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
          className="rounded-md border py-1 px-2 text-xs"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <input
          type="date"
          value={newEndDate}
          onChange={(e) => setNewEndDate(e.target.value)}
          className="rounded-md border py-1 px-2 text-xs"
          placeholder="End date"
        />
        <div className="flex gap-1">
          <button onClick={handleSave} disabled={saving} className="rounded bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-500 disabled:opacity-50">
            {saving ? "..." : "Save"}
          </button>
          <button onClick={() => { setEditing(false); setNewStatus(currentStatus); setNewEndDate(currentEndDate ?? ""); setError(null); }} className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button onClick={() => setEditing(true)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
        Edit
      </button>
      <button onClick={handleDelete} disabled={saving} className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50">
        Delete
      </button>
    </div>
  );
}
