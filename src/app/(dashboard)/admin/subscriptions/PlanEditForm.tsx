"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_period: string;
  is_active: boolean;
}

export default function PlanEditForm({ plan }: { plan: Plan }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description ?? "");
  const [price, setPrice] = useState(String(plan.price));
  const [billingPeriod, setBillingPeriod] = useState(plan.billing_period);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: plan.id,
          name,
          description: description || null,
          price: parseFloat(price),
          billing_period: billingPeriod,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to update plan.");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle() {
    setSaving(true);
    try {
      await fetch("/api/platform/plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: plan.id, is_active: !plan.is_active }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <button onClick={() => setEditing(true)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
        <button onClick={handleToggle} disabled={saving}
          className={`text-xs font-medium disabled:opacity-50 ${plan.is_active ? "text-amber-600 hover:text-amber-800" : "text-green-600 hover:text-green-800"}`}>
          {plan.is_active ? "Deactivate" : "Activate"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Plan name"
          className="rounded-md border py-1 px-2 text-xs" />
        <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="Price"
          className="rounded-md border py-1 px-2 text-xs" />
      </div>
      <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)"
        className="w-full rounded-md border py-1 px-2 text-xs" />
      <select value={billingPeriod} onChange={(e) => setBillingPeriod(e.target.value)}
        className="rounded-md border py-1 px-2 text-xs">
        <option value="MONTHLY">Monthly</option>
        <option value="QUARTERLY">Quarterly</option>
        <option value="YEARLY">Yearly</option>
      </select>
      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="rounded-md bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-500 disabled:opacity-50">
          {saving ? "..." : "Save"}
        </button>
        <button type="button" onClick={() => { setEditing(false); setName(plan.name); setDescription(plan.description ?? ""); setPrice(String(plan.price)); setBillingPeriod(plan.billing_period); }}
          className="rounded-md border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  );
}
