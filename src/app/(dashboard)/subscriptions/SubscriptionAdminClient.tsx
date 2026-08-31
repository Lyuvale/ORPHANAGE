"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSubscriptionStatusDisplay,
  getSubscriptionStatusBadge,
  formatPlanDate,
} from "@/types/subscription";

// ─── Inline data shapes (mirror API responses) ────────────────

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  billing_period: string;
  is_active: boolean;
  features?: { feature_key: string; enabled: boolean }[];
};

type Centre = { id: string; name: string; code: string; status?: string };

type Subscription = {
  id: string;
  centre_id: string;
  plan_id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  trial_ends_at: string | null;
  centre?: { id: string; name: string; code: string } | null;
  plan?: Plan | null;
};

export interface SubscriptionAdminData {
  subscriptions: Subscription[];
  plans: Plan[];
  centres: Centre[];
}

export default function SubscriptionAdminClient({
  subscriptions,
  plans,
  centres,
}: {
  subscriptions: Subscription[];
  plans: Plan[];
  centres: Centre[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [assignCentre, setAssignCentre] = useState("");
  const [assignPlan, setAssignPlan] = useState("");
  const [assignStatus, setAssignStatus] = useState("trial");
  const [assignTrialDays, setAssignTrialDays] = useState(14);

  async function api(path: string, init?: RequestInit) {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || "Request failed");
    }
    return json;
  }

  async function assignSubscription(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const trialEndsAt = assignStatus === "trial"
        ? new Date(Date.now() + assignTrialDays * 86400000).toISOString().slice(0, 10)
        : null;
      await api("/api/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          centre_id: assignCentre,
          plan_id: assignPlan,
          status: assignStatus,
          trial_ends_at: trialEndsAt,
        }),
      });
      setMessage({ ok: true, text: "Subscription assigned." });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Failed" });
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(id: string, status: string) {
    setBusy(true);
    setMessage(null);
    try {
      await api(`/api/subscriptions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setMessage({ ok: true, text: "Status updated." });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Failed" });
    } finally {
      setBusy(false);
    }
  }

  async function extend(id: string, endDate: string) {
    setBusy(true);
    setMessage(null);
    try {
      await api(`/api/subscriptions/${id}/extend`, {
        method: "PATCH",
        body: JSON.stringify({ end_date: endDate }),
      });
      setMessage({ ok: true, text: "Subscription extended." });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Failed" });
    } finally {
      setBusy(false);
    }
  }

  const activePlans = plans.filter((p) => p.is_active);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Subscriptions</h2>
        <p className="text-sm text-gray-500 mt-1">
          Platform administration — assign plans to centres and manage subscription
          status. Normal centre staff cannot access this area.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Assign plan to centre */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Assign subscription to a centre
        </h3>
        <form onSubmit={assignSubscription} className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Centre</label>
            <select
              value={assignCentre}
              onChange={(e) => setAssignCentre(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select centre…</option>
              {centres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Plan</label>
            <select
              value={assignPlan}
              onChange={(e) => setAssignPlan(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select plan…</option>
              {activePlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={assignStatus}
              onChange={(e) => setAssignStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Trial days (if trial)
            </label>
            <input
              type="number"
              min={1}
              value={assignTrialDays}
              onChange={(e) => setAssignTrialDays(Number(e.target.value))}
              disabled={assignStatus !== "trial"}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="mt-2 w-full bg-blue-600 text-white rounded-md px-3 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Assign
            </button>
          </div>
        </form>
      </div>

      {/* Subscriptions list */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">All subscriptions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Centre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valid Until</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    No subscriptions yet.
                  </td>
                </tr>
              ) : (
                subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {s.centre?.name ?? s.centre_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {s.plan?.name ?? "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSubscriptionStatusBadge(s.status as never)}`}>
                        {getSubscriptionStatusDisplay(s.status as never)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatPlanDate(s.status === "trial" ? s.trial_ends_at : s.end_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-wrap gap-2">
                        {s.status !== "active" && (
                          <button
                            onClick={() => changeStatus(s.id, "active")}
                            disabled={busy}
                            className="text-xs font-semibold text-green-600 hover:text-green-800 disabled:opacity-40"
                          >
                            Activate
                          </button>
                        )}
                        {s.status !== "suspended" && (
                          <button
                            onClick={() => changeStatus(s.id, "suspended")}
                            disabled={busy}
                            className="text-xs font-semibold text-yellow-600 hover:text-yellow-800 disabled:opacity-40"
                          >
                            Suspend
                          </button>
                        )}
                        {s.status !== "cancelled" && (
                          <button
                            onClick={() => changeStatus(s.id, "cancelled")}
                            disabled={busy}
                            className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-40"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const nd = window.prompt("New end date (YYYY-MM-DD):", s.end_date ?? "");
                            if (nd) extend(s.id, nd);
                          }}
                          disabled={busy}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-40"
                        >
                          Extend
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plans */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">Plans</h3>
          <p className="text-xs text-gray-500 mt-1">
            Plans control centre-level service access (what the centre can use).
          </p>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-3">
          {plans.length === 0 ? (
            <p className="text-sm text-gray-500">No plans defined.</p>
          ) : (
            plans.map((p) => (
              <div key={p.id} className={`border rounded-lg p-4 ${p.is_active ? "border-gray-200" : "border-gray-100 bg-gray-50 opacity-70"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-gray-900">{p.name}</span>
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                      p.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {p.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">{p.description || "—"}</p>
                <p className="mt-2 text-sm font-medium text-gray-900">
                  {p.price} / {p.billing_period.toLowerCase()}
                </p>
                <button
                  onClick={() =>
                    setMessage({ ok: true, text: "Edit plans via the plans API." })
                  }
                  className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  Manage plan
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
