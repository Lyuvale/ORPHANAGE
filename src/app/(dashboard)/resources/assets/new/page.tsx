"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parseMoneyInput, formatValidationDetails } from "@/lib/money";
import {
  ASSET_CATEGORIES,
  ASSET_STATUSES,
  ASSET_CONDITIONS,
  ASSET_LOCATIONS,
  getAssetCategoryDisplay,
  getAssetStatusDisplay,
  getAssetConditionDisplay,
  getAssetLocationDisplay,
} from "@/types/resources";

type SourceRow = { id: string; source_name: string };
type FundRow = { id: string; fund_name: string };
type ExpenseRow = { id: string; description: string | null };
type BenefitRow = { id: string; benefit_type: string };

export default function NewAssetForm() {
  const router = useRouter();

  const [sources, setSources] = useState<SourceRow[]>([]);
  const [funds, setFunds] = useState<FundRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [benefits, setBenefits] = useState<BenefitRow[]>([]);

  const [asset_name, setAssetName] = useState("");
  const [asset_id, setAssetId] = useState("");
  const [asset_category, setAssetCategory] = useState(ASSET_CATEGORIES[0]);
  const [quantity, setQuantity] = useState("1");
  const [date_acquired, setDateAcquired] = useState("");
  const [location, setLocation] = useState("");
  const [asset_status, setAssetStatus] = useState(ASSET_STATUSES[0]);
  const [asset_condition, setAssetCondition] = useState(ASSET_CONDITIONS[0]);
  const [notes, setNotes] = useState("");

  // Source: ""=unknown, or a source id
  const [sourceChoice, setSourceChoice] = useState("__unknown");

  // Purchase cost
  const [purchase_known, setPurchaseKnown] = useState(true);
  const [purchase_cost, setPurchaseCost] = useState("");

  // Optional links to existing records
  const [expense_id, setExpenseId] = useState("");
  const [fund_id, setFundId] = useState("");
  const [benefit_id, setBenefitId] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Asset creation is the Accountant's duty. Anyone without
    // resources.assets.manage is sent back (the API enforces the same rule).
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { permissions: [] }))
      .then((j) => {
        const perms: string[] = Array.isArray(j.permissions) ? j.permissions : [];
        if (!perms.includes("resources.assets.manage")) {
          router.replace("/resources/assets");
        }
      })
      .catch(() => {});
    Promise.all([
      fetch("/api/resources/sources").then((r) => r.json()),
      fetch("/api/resources/funds").then((r) => r.json()),
      fetch("/api/resources/expenses?status=APPROVED").then((r) => r.json()),
      fetch("/api/resources/benefits").then((r) => r.json()),
    ])
      .then(([s, f, e, b]) => {
        setSources(s.data ?? []);
        setFunds(f.data ?? []);
        setExpenses(e.data ?? []);
        setBenefits(b.data ?? []);
      })
      .catch(() => {});
  }, []);

  // When an expense is selected, derive fund (and its source) automatically.
  async function handleExpenseChange(id: string) {
    setExpenseId(id);
    if (!id) return;
    try {
      const res = await fetch(`/api/resources/expenses/${id}`);
      const json = await res.json();
      const exp = json.data;
      if (exp?.fund) {
        setFundId(exp.fund.id);
        if (exp.fund.source_id) {
          setSourceChoice(exp.fund.source_id);
        } else {
          setSourceChoice("__none");
        }
      }
    } catch {
      /* ignore */
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    let quantityValue: number | undefined;
    if (quantity) {
      const parsedQty = parseMoneyInput(quantity);
      if (!parsedQty.ok) {
        setError(`Quantity: ${parsedQty.error}`);
        setSaving(false);
        return;
      }
      quantityValue = parsedQty.value;
    }
    let costValue: number | null | undefined;
    if (purchase_known && purchase_cost) {
      const parsedCost = parseMoneyInput(purchase_cost);
      if (!parsedCost.ok) {
        setError(`Purchase cost: ${parsedCost.error}`);
        setSaving(false);
        return;
      }
      costValue = parsedCost.value;
    } else if (!purchase_known) {
      costValue = null;
    }
    setSaving(true);
    const body = {
      asset_name,
      asset_id: asset_id || undefined,
      asset_category,
      quantity: quantityValue,
      date_acquired: date_acquired || undefined,
      location: location || undefined,
      asset_status,
      asset_condition,
      source_id: sourceChoice === "__unknown" || sourceChoice === "__none" ? undefined : sourceChoice,
      source_unknown: sourceChoice === "__unknown",
      fund_id: fund_id || undefined,
      expense_id: expense_id || undefined,
      benefit_id: benefit_id || undefined,
      purchase_cost: costValue,
      notes: notes || undefined,
    };
    const res = await fetch("/api/resources/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({ error: "Unexpected error" }));
    if (!res.ok) {
      setError(
        formatValidationDetails(json.details) ?? json.error ?? "Failed to create asset",
      );
      setSaving(false);
      return;
    }
    router.push(`/resources/assets/${json.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-medium text-zinc-900">Add Asset</h2>
        <p className="text-sm text-zinc-500">
          Record a physical item owned or used by the centre. Source and costs connect to existing
          records — never duplicated.
        </p>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {/* Asset details */}
      <fieldset className="rounded-lg border border-zinc-200 bg-white p-4 space-y-4">
        <legend className="px-2 text-sm font-semibold text-zinc-900">Asset Details</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-zinc-700">Asset Name</label>
            <input
              type="text"
              required
              value={asset_name}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="e.g. Dining tables"
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Category</label>
            <select
              value={asset_category}
              onChange={(e) => setAssetCategory(e.target.value as never)}
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
              {ASSET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {getAssetCategoryDisplay(c)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Quantity</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Asset ID (optional)</label>
            <input
              type="text"
              value={asset_id}
              onChange={(e) => setAssetId(e.target.value)}
              placeholder="e.g. AST-001"
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Date Acquired</label>
            <input
              type="date"
              value={date_acquired}
              onChange={(e) => setDateAcquired(e.target.value)}
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Location</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
              <option value="">Select location...</option>
              {ASSET_LOCATIONS.map((l) => (
                <option key={l} value={l}>
                  {getAssetLocationDisplay(l)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Status</label>
            <select
              value={asset_status}
              onChange={(e) => setAssetStatus(e.target.value as never)}
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
              {ASSET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {getAssetStatusDisplay(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Condition</label>
            <select
              value={asset_condition}
              onChange={(e) => setAssetCondition(e.target.value as never)}
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
              {ASSET_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {getAssetConditionDisplay(c)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      {/* Source */}
      <fieldset className="rounded-lg border border-zinc-200 bg-white p-4 space-y-4">
        <legend className="px-2 text-sm font-semibold text-zinc-900">Asset Source</legend>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-zinc-700">Source</label>
          <select
            value={sourceChoice}
            onChange={(e) => setSourceChoice(e.target.value)}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          >
            <option value="__unknown">Existing Centre Asset / Unknown</option>
            <option value="__none">(No source selected)</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.source_name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            Choose an existing Source when known. Choose &quot;Existing Centre Asset / Unknown&quot; if
            the asset predates the system.
          </p>
        </div>
      </fieldset>

      {/* Purchase cost */}
      <fieldset className="rounded-lg border border-zinc-200 bg-white p-4 space-y-4">
        <legend className="px-2 text-sm font-semibold text-zinc-900">Purchase Cost</legend>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={purchase_known}
            onChange={(e) => setPurchaseKnown(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Record purchase cost
        </label>
        {purchase_known && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Purchase Cost (Tsh)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={purchase_cost}
                onChange={(e) => setPurchaseCost(e.target.value)}
                className="mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Link to existing Expense (optional)</label>
              <select
                value={expense_id}
                onChange={(e) => handleExpenseChange(e.target.value)}
                className="mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              >
                <option value="">No existing expense</option>
                {expenses.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.description || "Expense"}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-500">
                Linking an existing Expense keeps the real transaction in the Expense system — no
                duplication.
              </p>
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-zinc-700">Fund (optional)</label>
          <select
            value={fund_id}
            onChange={(e) => setFundId(e.target.value)}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          >
            <option value="">No fund</option>
            {funds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.fund_name}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      {/* Optional benefit link */}
      <fieldset className="rounded-lg border border-zinc-200 bg-white p-4 space-y-4">
        <legend className="px-2 text-sm font-semibold text-zinc-900">Optional: Asset Benefit</legend>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Linked Benefit</label>
          <select
            value={benefit_id}
            onChange={(e) => setBenefitId(e.target.value)}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          >
            <option value="">No linked benefit</option>
            {benefits.map((b) => (
              <option key={b.id} value={b.id}>
                {b.benefit_type}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-zinc-700">Notes</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 block w-full rounded-md border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-500 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Asset"}
        </button>
        <Link href="/resources/assets" className="text-sm font-semibold text-zinc-600 hover:text-zinc-900">
          Cancel
        </Link>
      </div>
    </form>
  );
}
