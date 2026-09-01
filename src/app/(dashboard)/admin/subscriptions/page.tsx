"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_period: string;
  is_active: boolean;
}

interface Subscription {
  id: string;
  centre_id: string;
  plan_id: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  trial_ends_at: string | null;
  payment_status: string | null;
  created_at: string;
  centres: { id: string; name: string; centre_code: string } | null;
  plans: { id: string; name: string; price: number; billing_period: string } | null;
}

interface Centre {
  id: string;
  name: string;
  centre_code: string;
  status: string;
}

const STATUS_OPTIONS = ["trial", "active", "expired", "suspended", "cancelled"];
const STATUS_COLORS: Record<string, string> = {
  trial: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  expired: "bg-gray-100 text-gray-800",
  suspended: "bg-amber-100 text-amber-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"subscriptions" | "plans">("subscriptions");
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showSubForm, setShowSubForm] = useState(false);

  // Plan form
  const [planName, setPlanName] = useState("");
  const [planDesc, setPlanDesc] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [planPeriod, setPlanPeriod] = useState("MONTHLY");

  // Subscription form
  const [subCentreId, setSubCentreId] = useState("");
  const [subPlanId, setSubPlanId] = useState("");
  const [subStatus, setSubStatus] = useState("active");
  const [subEndDate, setSubEndDate] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, subsRes, centresRes] = await Promise.all([
        fetch("/api/platform/plans"),
        fetch("/api/platform/subscriptions"),
        fetch("/api/platform/centres"),
      ]);

      if (plansRes.ok) {
        const json = await plansRes.json();
        setPlans(json.data ?? []);
      }
      if (subsRes.ok) {
        const json = await subsRes.json();
        setSubscriptions(json.data ?? []);
      }
      if (centresRes.ok) {
        const json = await centresRes.json();
        setCentres(json.data ?? []);
      }
    } catch {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSavePlan(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        id: editingPlan?.id,
        name: planName,
        description: planDesc || null,
        price: parseFloat(planPrice),
        billing_period: planPeriod,
      };
      const method = editingPlan ? "PATCH" : "POST";
      const res = await fetch("/api/platform/plans", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to save plan.");
        return;
      }
      setSuccess(editingPlan ? "Plan updated." : "Plan created.");
      setShowPlanForm(false);
      setEditingPlan(null);
      resetPlanForm();
      await loadData();
    } catch {
      setError("Network error.");
    }
  }

  async function handleTogglePlan(plan: Plan) {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/platform/plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: plan.id, is_active: !plan.is_active }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to toggle plan.");
        return;
      }
      setSuccess(`Plan ${plan.is_active ? "deactivated" : "activated"}.`);
      await loadData();
    } catch {
      setError("Network error.");
    }
  }

  async function handleCreateSubscription(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/platform/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centre_id: subCentreId,
          plan_id: subPlanId,
          status: subStatus,
          end_date: subEndDate || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to create subscription.");
        return;
      }
      setSuccess("Subscription created.");
      setShowSubForm(false);
      resetSubForm();
      await loadData();
    } catch {
      setError("Network error.");
    }
  }

  async function handleUpdateSubStatus(sub: Subscription, newStatus: string) {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/platform/subscriptions/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to update subscription.");
        return;
      }
      setSuccess(`Subscription status changed to ${newStatus}.`);
      await loadData();
    } catch {
      setError("Network error.");
    }
  }

  function resetPlanForm() {
    setPlanName("");
    setPlanDesc("");
    setPlanPrice("");
    setPlanPeriod("MONTHLY");
  }

  function resetSubForm() {
    setSubCentreId("");
    setSubPlanId("");
    setSubStatus("active");
    setSubEndDate("");
  }

  function startEditPlan(plan: Plan) {
    setEditingPlan(plan);
    setPlanName(plan.name);
    setPlanDesc(plan.description ?? "");
    setPlanPrice(String(plan.price));
    setPlanPeriod(plan.billing_period);
    setShowPlanForm(true);
  }

  const activePlans = plans.filter((p) => p.is_active);
  const centresWithoutActiveSub = centres.filter((c) => {
    if (c.status !== "active") return false;
    return !subscriptions.some(
      (s) => s.centre_id === c.id && ["trial", "active"].includes(s.status),
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Subscription Management</h1>
          <p className="text-sm text-gray-500">Manage subscription plans and centre subscriptions</p>
        </div>
        <Link
          href="/admin"
          className="rounded-md bg-white border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Admin
        </Link>
      </div>

      <nav className="flex gap-2">
        <button
          onClick={() => setActiveTab("subscriptions")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            activeTab === "subscriptions"
              ? "bg-indigo-600 text-white"
              : "bg-white border text-gray-700 hover:bg-gray-50"
          }`}
        >
          Subscriptions ({subscriptions.length})
        </button>
        <button
          onClick={() => setActiveTab("plans")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            activeTab === "plans"
              ? "bg-indigo-600 text-white"
              : "bg-white border text-gray-700 hover:bg-gray-50"
          }`}
        >
          Plans ({plans.length})
        </button>
      </nav>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : activeTab === "subscriptions" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                resetSubForm();
                setShowSubForm(!showSubForm);
              }}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              {showSubForm ? "Cancel" : "Create Subscription"}
            </button>
          </div>

          {showSubForm && (
            <form
              onSubmit={handleCreateSubscription}
              className="rounded-lg border bg-white p-4 space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Centre</label>
                  <select
                    value={subCentreId}
                    onChange={(e) => setSubCentreId(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                  >
                    <option value="">Select centre...</option>
                    {centresWithoutActiveSub.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.centre_code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Plan</label>
                  <select
                    value={subPlanId}
                    onChange={(e) => setSubPlanId(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                  >
                    <option value="">Select plan...</option>
                    {activePlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — KES {p.price}/{p.billing_period.toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={subStatus}
                    onChange={(e) => setSubStatus(e.target.value)}
                    className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date (optional)</label>
                  <input
                    type="date"
                    value={subEndDate}
                    onChange={(e) => setSubEndDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={!subCentreId || !subPlanId}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                Create
              </button>
            </form>
          )}

          {subscriptions.length === 0 ? (
            <p className="text-sm text-gray-500">No subscriptions yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                    <th className="px-4 py-2">Centre</th>
                    <th className="px-4 py-2">Plan</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Start</th>
                    <th className="px-4 py-2">End</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subscriptions.map((sub) => (
                    <tr key={sub.id}>
                      <td className="px-4 py-2 text-gray-900">
                        {sub.centres?.name ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-900">
                        {sub.plans?.name ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_COLORS[sub.status] ?? "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {sub.start_date ? new Date(sub.start_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {sub.end_date ? new Date(sub.end_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          {sub.status !== "active" && sub.status !== "cancelled" && (
                            <button
                              onClick={() => handleUpdateSubStatus(sub, "active")}
                              className="text-xs text-green-600 hover:text-green-800"
                            >
                              Activate
                            </button>
                          )}
                          {sub.status === "active" && (
                            <button
                              onClick={() => handleUpdateSubStatus(sub, "suspended")}
                              className="text-xs text-amber-600 hover:text-amber-800"
                            >
                              Suspend
                            </button>
                          )}
                          {sub.status !== "cancelled" && (
                            <button
                              onClick={() => handleUpdateSubStatus(sub, "cancelled")}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                resetPlanForm();
                setEditingPlan(null);
                setShowPlanForm(!showPlanForm);
              }}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              {showPlanForm ? "Cancel" : "Create Plan"}
            </button>
          </div>

          {showPlanForm && (
            <form
              onSubmit={handleSavePlan}
              className="rounded-lg border bg-white p-4 space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price (KES)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={planPrice}
                    onChange={(e) => setPlanPrice(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={planDesc}
                  onChange={(e) => setPlanDesc(e.target.value)}
                  className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Billing Period</label>
                <select
                  value={planPeriod}
                  onChange={(e) => setPlanPeriod(e.target.value)}
                  className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
                >
                  {["MONTHLY", "QUARTERLY", "YEARLY"].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                {editingPlan ? "Update Plan" : "Create Plan"}
              </button>
            </form>
          )}

          {plans.length === 0 ? (
            <p className="text-sm text-gray-500">No plans yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Price</th>
                    <th className="px-4 py-2">Period</th>
                    <th className="px-4 py-2">Active</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {plans.map((plan) => (
                    <tr key={plan.id}>
                      <td className="px-4 py-2 text-gray-900 font-medium">{plan.name}</td>
                      <td className="px-4 py-2 text-gray-900">
                        KES {plan.price.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-gray-500">{plan.billing_period}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            plan.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {plan.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditPlan(plan)}
                            className="text-xs text-indigo-600 hover:text-indigo-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleTogglePlan(plan)}
                            className={`text-xs ${
                              plan.is_active
                                ? "text-amber-600 hover:text-amber-800"
                                : "text-green-600 hover:text-green-800"
                            }`}
                          >
                            {plan.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
