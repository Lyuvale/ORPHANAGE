"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Edit own expense details (resources.manage holders: accountant). */
export default function ExpenseEditForm({
  expense,
}: {
  expense: {
    id: string;
    description: string | null;
    amount: number;
    expense_date: string | null;
    notes: string | null;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(expense.description ?? "");
  const [amount, setAmount] = useState(String(expense.amount ?? ""));
  const [expenseDate, setExpenseDate] = useState(expense.expense_date ?? "");
  const [notes, setNotes] = useState(expense.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!amount || Number(amount) < 0) {
      setError("Please enter a valid amount.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/resources/expenses/${expense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim() || undefined,
          amount: Number(amount),
          expense_date: expenseDate || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to save.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full border border-gray-300 rounded-md px-3 py-2 text-sm";

  if (!open) {
    return (
      <button
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
      >
        Edit
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-lg border bg-white p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">Edit expense</h3>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Amount (TZS) *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputCls}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
          <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className={inputCls} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 border hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
