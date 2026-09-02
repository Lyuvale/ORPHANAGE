"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CentreOption = { id: string; name: string; code: string };

const FLOW_TYPES = ["SUBSCRIPTION", "CONTRIBUTION"];
const STATUS_OPTIONS = ["PENDING", "SUCCESSFUL", "FAILED", "CANCELLED"];

export default function RecordPaymentButton({
  centres,
}: {
  centres: CentreOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [centreId, setCentreId] = useState("");
  const [flowType, setFlowType] = useState("SUBSCRIPTION");
  const [purpose, setPurpose] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [status, setStatus] = useState("PENDING");
  const [contributorName, setContributorName] = useState("");
  const [contributorEmail, setContributorEmail] = useState("");
  const [contributorContact, setContributorContact] = useState("");
  const [providerReference, setProviderReference] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!centreId) {
      setError("Please select a centre.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/platform/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centre_id: centreId,
          flow_type: flowType,
          purpose: purpose || null,
          amount: Number(amount),
          currency,
          status,
          contributor_name: contributorName || null,
          contributor_email: contributorEmail || null,
          contributor_contact: contributorContact || null,
          provider_reference: providerReference || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to record payment.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
      >
        Record Payment
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Record Manual Payment</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Centre *</label>
                  <select
                    value={centreId}
                    onChange={(e) => setCentreId(e.target.value)}
                    className="mt-1 w-full rounded-md border py-1.5 px-2 text-sm"
                    required
                  >
                    <option value="">Select centre</option>
                    {centres.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Flow Type *</label>
                  <select
                    value={flowType}
                    onChange={(e) => setFlowType(e.target.value)}
                    className="mt-1 w-full rounded-md border py-1.5 px-2 text-sm"
                  >
                    {FLOW_TYPES.map((f) => (
                      <option key={f} value={f}>{f.charAt(0) + f.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600">Purpose</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Subscription - Standard, Education Fund"
                  className="mt-1 w-full rounded-md border py-1.5 px-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Amount *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 w-full rounded-md border py-1.5 px-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Currency</label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="mt-1 w-full rounded-md border py-1.5 px-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="mt-1 w-full rounded-md border py-1.5 px-2 text-sm"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Contributor Name</label>
                  <input
                    type="text"
                    value={contributorName}
                    onChange={(e) => setContributorName(e.target.value)}
                    className="mt-1 w-full rounded-md border py-1.5 px-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Contributor Email</label>
                  <input
                    type="email"
                    value={contributorEmail}
                    onChange={(e) => setContributorEmail(e.target.value)}
                    className="mt-1 w-full rounded-md border py-1.5 px-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Contact</label>
                  <input
                    type="text"
                    value={contributorContact}
                    onChange={(e) => setContributorContact(e.target.value)}
                    className="mt-1 w-full rounded-md border py-1.5 px-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600">Reference (optional)</label>
                <input
                  type="text"
                  value={providerReference}
                  onChange={(e) => setProviderReference(e.target.value)}
                  placeholder="Auto-generated if left blank"
                  className="mt-1 w-full rounded-md border py-1.5 px-2 text-sm"
                />
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
