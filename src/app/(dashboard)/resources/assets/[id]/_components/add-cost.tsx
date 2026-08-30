"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ASSET_COST_TYPES, getAssetCostTypeDisplay } from "@/types/resources";

type ExpenseRow = { id: string; description: string | null };

export default function AddCost({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [cost_type, setCostType] = useState(ASSET_COST_TYPES[0]);
  const [amount_known, setAmountKnown] = useState(true);
  const [amount, setAmount] = useState("");
  const [cost_date, setCostDate] = useState("");
  const [expense_id, setExpenseId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    fetch("/api/resources/expenses?status=APPROVED")
      .then((r) => r.json())
      .then((json) => setExpenses(json.data ?? []))
      .catch(() => {});
  }, [open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch(`/api/resources/assets/${assetId}/costs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cost_type,
        amount: amount_known ? (amount ? Number(amount) : undefined) : null,
        cost_date: cost_date || undefined,
        expense_id: expense_id || undefined,
        notes: notes || undefined,
      }),
    });
    const json = await res.json().catch(() => ({ error: "Unexpected error" }));
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Failed to record cost");
      return;
    }
    setOpen(false);
    setCostType(ASSET_COST_TYPES[0]);
    setAmount("");
    setCostDate("");
    setExpenseId("");
    setNotes("");
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
      >
        Record Cost
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/40 p-4">
          <form onSubmit={save} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Record {getAssetCostTypeDisplay(cost_type)} Cost</h3>
            {error && <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Cost Type</label>
                <select
                  value={cost_type}
                  onChange={(e) => setCostType(e.target.value as never)}
                  className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                >
                  {ASSET_COST_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {getAssetCostTypeDisplay(t)}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={amount_known}
                  onChange={(e) => setAmountKnown(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Record amount
              </label>
              {amount_known && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount (Tsh)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  value={cost_date}
                  onChange={(e) => setCostDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Link to existing Expense (optional)</label>
                <select
                  value={expense_id}
                  onChange={(e) => setExpenseId(e.target.value)}
                  className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                >
                  <option value="">No existing expense</option>
                  {expenses.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.description || "Expense"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Cost"}
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
