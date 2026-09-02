"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = ["trial", "active", "expired", "suspended", "cancelled"];

interface Plan {
  id: string;
  name: string;
  price: number;
  billing_period: string;
}

interface ExistingSub {
  id: string;
  plan_id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
}

export default function CentreSubscriptionManager({
  centreId,
  centreName,
  plans,
  existingSub,
}: {
  centreId: string;
  centreName: string;
  plans: Plan[];
  existingSub: ExistingSub | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "create" | "edit">(existingSub ? "view" : "create");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [planId, setPlanId] = useState(existingSub?.plan_id ?? "");
  const [status, setStatus] = useState(existingSub?.status ?? "active");
  const [startDate, setStartDate] = useState(existingSub?.start_date?.split("T")[0] ?? new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(existingSub?.end_date?.split("T")[0] ?? "");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/platform/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centre_id: centreId,
          plan_id: planId,
          status,
          start_date: startDate || null,
          end_date: endDate || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to create subscription.");
        return;
      }
      setSuccess("Subscription created successfully.");
      setMode("view");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!existingSub) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/platform/subscriptions/${existingSub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          plan_id: planId,
          end_date: endDate || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to update subscription.");
        return;
      }
      setSuccess("Subscription updated.");
      setMode("view");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existingSub) return;
    if (!confirm("Delete this subscription?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform/subscriptions/${existingSub.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to delete.");
        return;
      }
      setSuccess("Subscription deleted.");
      setMode("create");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  const selectedPlan = plans.find((p) => p.id === planId);

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Subscription for {centreName}</h3>
        {mode === "view" && (
          <div className="flex gap-2">
            <button onClick={() => setMode("edit")} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
            <button onClick={handleDelete} disabled={saving} className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50">Delete</button>
          </div>
        )}
      </div>

      {error && <div className="mb-3 rounded-md bg-red-50 p-2 text-xs text-red-700">{error}</div>}
      {success && <div className="mb-3 rounded-md bg-green-50 p-2 text-xs text-green-700">{success}</div>}

      {mode === "view" && existingSub ? (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Plan:</span>
            <span className="text-gray-900 font-medium">{plans.find((p) => p.id === existingSub.plan_id)?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Status:</span>
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              existingSub.status === "active" ? "bg-green-100 text-green-700" :
              existingSub.status === "trial" ? "bg-blue-100 text-blue-700" :
              "bg-gray-100 text-gray-600"
            }`}>{existingSub.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Start:</span>
            <span className="text-gray-900">{existingSub.start_date ? new Date(existingSub.start_date).toLocaleDateString() : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">End:</span>
            <span className="text-gray-900">{existingSub.end_date ? new Date(existingSub.end_date).toLocaleDateString() : "—"}</span>
          </div>
        </div>
      ) : (
        <form onSubmit={mode === "create" ? handleCreate : handleUpdate} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700">Plan</label>
            <select value={planId} onChange={(e) => setPlanId(e.target.value)} required
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-xs">
              <option value="">Select plan...</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — TZS {p.price.toLocaleString()}/{p.billing_period.toLowerCase()}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-xs">
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-xs" />
            </div>
          </div>
          {selectedPlan && (
            <p className="text-xs text-gray-500">
              Selected: {selectedPlan.name} — TZS {selectedPlan.price.toLocaleString()}/{selectedPlan.billing_period.toLowerCase()}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={saving || !planId}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
              {saving ? "Saving..." : mode === "create" ? "Create Subscription" : "Update Subscription"}
            </button>
            {mode === "edit" && (
              <button type="button" onClick={() => setMode("view")}
                className="rounded-md border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
