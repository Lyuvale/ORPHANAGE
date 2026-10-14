"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SUPPORT_BENEFIT_TYPES, getBenefitTypeDisplay } from "@/types/resources";

type ChildRow = { id: string; first_name: string; last_name: string; reference_number: string | null };

export default function NewBenefitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetExpenseId = searchParams.get("expense_id") ?? "";

  const [expenses, setExpenses] = useState<{ id: string; description: string | null }[]>([]);
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [expenseId, setExpenseId] = useState(presetExpenseId);
  const [benefitType, setBenefitType] = useState(SUPPORT_BENEFIT_TYPES[0]);
  const [description, setDescription] = useState("");
  const [benefitDate, setBenefitDate] = useState("");
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/resources/expenses?status=APPROVED")
      .then((r) => r.json())
      .then((json) => {
        setExpenses(json.data ?? []);
        if (!presetExpenseId && json.data?.length) setExpenseId(json.data[0].id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const q = new URLSearchParams();
    q.set("limit", "200");
    if (search) q.set("search", search);
    fetch(`/api/children?${q.toString()}`)
      .then((r) => r.json())
      .then((json) => setChildren(json.data ?? []))
      .catch(() => {});
  }, [search]);

  function toggleChild(id: string) {
    setSelectedChildren((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/resources/benefits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expense_id: expenseId,
        benefit_type: benefitType,
        description: description || undefined,
        benefit_date: benefitDate || undefined,
        child_ids: selectedChildren,
      }),
    });
    const json = await res.json().catch(() => ({ error: "Unexpected error" }));
    if (!res.ok) {
      setError(json.error || "Failed to create benefit");
      setSaving(false);
      return;
    }
    router.push(`/resources/benefits/${json.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-medium text-zinc-900">Add Benefit</h2>
        <p className="text-sm text-zinc-500">
          Record support delivered to children. Children are existing records — never duplicated.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-zinc-700">Expense</label>
          <select
            required
            value={expenseId}
            onChange={(e) => setExpenseId(e.target.value)}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          >
            <option value="">Select an approved expense...</option>
            {expenses.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.description || "Expense"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Benefit Type</label>
          <select
            value={benefitType}
            onChange={(e) => setBenefitType(e.target.value as never)}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          >
            {SUPPORT_BENEFIT_TYPES.map((t) => (
              <option key={t} value={t}>
                {getBenefitTypeDisplay(t)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Date</label>
          <input
            type="date"
            value={benefitDate}
            onChange={(e) => setBenefitDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-zinc-700">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. School uniforms and books"
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>
      </div>

      {/* Children selection */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900">
            Children Benefited ({selectedChildren.length} selected)
          </h3>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search children..."
          className="mt-3 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        />
        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
          {children.length === 0 && (
            <p className="text-sm text-zinc-400">No children available for this centre.</p>
          )}
          {children.map((c) => {
            const checked = selectedChildren.includes(c.id);
            return (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-zinc-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleChild(c.id)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-zinc-900">
                  {c.first_name} {c.last_name}
                </span>
                {c.reference_number && (
                  <span className="text-xs text-zinc-400">{c.reference_number}</span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-500 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Benefit"}
        </button>
        <Link href="/resources/benefits" className="text-sm font-semibold text-zinc-600 hover:text-zinc-900">
          Cancel
        </Link>
      </div>
    </form>
  );
}
