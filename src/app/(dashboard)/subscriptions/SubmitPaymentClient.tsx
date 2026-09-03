"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Plan = { id: string; name: string; price: number | string; billing_period: string };
type PaymentRequest = {
  id: string;
  plan_id: string | null;
  amount: number;
  currency: string;
  status: string;
  provider_reference: string;
  review_feedback: string | null;
  purpose: string | null;
  created_at: string;
  reviewed_at: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  SUCCESSFUL: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  REFUNDED: "bg-purple-100 text-purple-700",
};

export default function SubmitPaymentClient({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const [planId, setPlanId] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [requests, setRequests] = useState<PaymentRequest[]>([]);

  async function loadRequests() {
    try {
      const res = await fetch("/api/subscriptions/payments", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setRequests(json.data ?? []);
      }
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!planId) {
      setMessage({ ok: false, text: "Please choose a plan." });
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setMessage({ ok: false, text: "Please enter a valid amount." });
      return;
    }
    if (!reference.trim()) {
      setMessage({ ok: false, text: "Please enter the transaction reference (rejea ya muamala)." });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/subscriptions/pay-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: planId,
          amount: Number(amount),
          provider_reference: reference.trim(),
          notes: notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ ok: false, text: json.error || "Failed to submit." });
        return;
      }
      setMessage({ ok: true, text: json.data?.message || "Payment request submitted for review." });
      setPlanId("");
      setAmount("");
      setReference("");
      setNotes("");
      loadRequests();
      router.refresh();
    } catch {
      setMessage({ ok: false, text: "Network error." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Submit payment form */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Submit a Subscription Payment</h3>
        <p className="text-sm text-gray-500 mb-4">
          Choose a plan, enter the amount you paid and the transaction reference. The platform admin
          will review and approve your subscription.
        </p>

        {message && (
          <div
            className={`rounded-md px-4 py-3 text-sm mb-4 ${
              message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Plan</label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Choose plan…</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.price} / {p.billing_period.toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Amount (KES)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 250"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Transaction Reference *
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Rejea ya muamala"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional detail"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Submitting…" : "Submit Payment"}
            </button>
          </div>
        </form>
      </div>

      {/* Payment history */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">My Payment Requests</h3>
        </div>
        {requests.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500">No payment requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feedback</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {r.purpose ?? "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {r.currency} {Number(r.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-500">
                      {r.provider_reference}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          STATUS_STYLES[r.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {r.status === "SUCCESSFUL" ? "APPROVED" : r.status === "FAILED" ? "REJECTED" : r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {r.review_feedback ?? "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(r.created_at).toLocaleDateString("en-GB")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
