"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { parseMoneyInput, formatValidationDetails } from "@/lib/money";

export default function NewExpenseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetFundId = searchParams.get("fund_id") ?? "";

  const [funds, setFunds] = useState<{ id: string; fund_name: string; balance: number }[]>([]);
  const [fundId, setFundId] = useState(presetFundId);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Expense creation is the Accountant's duty. Anyone without
    // resources.manage is sent back (the API enforces the same rule).
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { permissions: [] }))
      .then((j) => {
        const perms: string[] = Array.isArray(j.permissions) ? j.permissions : [];
        if (!perms.includes("resources.manage")) {
          router.replace("/resources/expenses");
        }
      })
      .catch(() => {});
    fetch("/api/resources/funds")
      .then((r) => r.json())
      .then((json) => {
        setFunds(json.data ?? []);
        if (!presetFundId && json.data?.length) setFundId(json.data[0].id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = funds.find((f) => f.id === fundId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsedAmount = parseMoneyInput(amount);
    if (!parsedAmount.ok) {
      setError(parsedAmount.error);
      setSaving(false);
      return;
    }
    setSaving(true);
    const res = await fetch("/api/resources/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fund_id: fundId,
        description: description,
        amount: parsedAmount.value,
        expense_date: expenseDate || undefined,
        notes: notes || undefined,
      }),
    });
    const json = await res.json().catch(() => ({ error: "Unexpected error" }));
    if (!res.ok) {
      setError(
        formatValidationDetails(json.details) ?? json.error ?? "Failed to create expense",
      );
      setSaving(false);
      return;
    }
    router.push(`/resources/expenses/${json.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900">Add Expense</h2>
        <p className="text-sm text-gray-500">
          Record spending against a fund. Approval is required before it counts toward balances.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Fund</label>
          <select
            required
            value={fundId}
            onChange={(e) => setFundId(e.target.value)}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          >
            <option value="">Select a fund...</option>
            {funds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.fund_name} ({f.balance?.toLocaleString?.() ?? "-"} balance)
              </option>
            ))}
          </select>
          {selected && selected.balance !== undefined && (
            <p className="mt-1 text-xs text-gray-500">
              This fund has {selected.balance.toLocaleString()} available balance.
            </p>
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Monthly food supply"
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Amount (Tsh)</label>
          <input
            type="number"
            step="0.01"
            required
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Expense"}
        </button>
        <Link href="/resources/expenses" className="text-sm font-semibold text-gray-600 hover:text-gray-900">
          Cancel
        </Link>
      </div>
    </form>
  );
}
