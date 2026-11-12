"use client";

import { useState } from "react";

interface Centre {
  id: string;
  name: string;
  code: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  status: string;
}

export default function CentreEditForm({ centre }: { centre: Centre }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: centre.name ?? "",
    code: centre.code ?? "",
    contact_email: centre.contact_email ?? "",
    contact_phone: centre.contact_phone ?? "",
    address_line1: centre.address_line1 ?? "",
    city: centre.city ?? "",
    country: centre.country ?? "",
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/platform/centres/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centre_id: centre.id, ...form }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to update centre.");
        return;
      }
      setSuccess("Centre updated successfully.");
      setEditing(false);
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h2 className="text-sm font-semibold text-zinc-900">Centre Details</h2>
          <button
            onClick={() => setEditing(true)}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Edit
          </button>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt className="text-gray-500">Name</dt>
          <dd className="text-gray-900">{centre.name}</dd>
          <dt className="text-gray-500">Code</dt>
          <dd className="text-gray-900">{centre.code ?? "—"}</dd>
          <dt className="text-gray-500">Email</dt>
          <dd className="text-gray-900">{centre.contact_email ?? "—"}</dd>
          <dt className="text-gray-500">Phone</dt>
          <dd className="text-gray-900">{centre.contact_phone ?? "—"}</dd>
          <dt className="text-gray-500">Address</dt>
          <dd className="text-gray-900">{centre.address_line1 ?? "—"}</dd>
          <dt className="text-gray-500">City</dt>
          <dd className="text-gray-900">{centre.city ?? "—"}</dd>
          <dt className="text-gray-500">Country</dt>
          <dd className="text-gray-900">{centre.country ?? "—"}</dd>
        </dl>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <h2 className="text-sm font-semibold text-zinc-900">Edit Centre</h2>
        <button
          onClick={() => { setEditing(false); setError(null); setSuccess(null); }}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      <form onSubmit={handleSave} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Code</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => updateField("code", e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={form.contact_email}
              onChange={(e) => updateField("contact_email", e.target.value)}
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="text"
              value={form.contact_phone}
              onChange={(e) => updateField("contact_phone", e.target.value)}
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <input
              type="text"
              value={form.address_line1}
              onChange={(e) => updateField("address_line1", e.target.value)}
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">City</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Country</label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => updateField("country", e.target.value)}
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </section>
  );
}
