"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Edit guardian details (guardians.update holders: records, manager, social worker). */
export default function GuardianEditForm({
  guardian,
}: {
  guardian: {
    id: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    preferred_name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    occupation: string | null;
    notes: string | null;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState(guardian.first_name);
  const [middleName, setMiddleName] = useState(guardian.middle_name ?? "");
  const [lastName, setLastName] = useState(guardian.last_name);
  const [preferredName, setPreferredName] = useState(guardian.preferred_name ?? "");
  const [phone, setPhone] = useState(guardian.phone ?? "");
  const [email, setEmail] = useState(guardian.email ?? "");
  const [address, setAddress] = useState(guardian.address ?? "");
  const [occupation, setOccupation] = useState(guardian.occupation ?? "");
  const [notes, setNotes] = useState(guardian.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/guardians/${guardian.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          middle_name: middleName.trim() || null,
          last_name: lastName.trim(),
          preferred_name: preferredName.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          occupation: occupation.trim() || null,
          notes: notes.trim() || null,
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
      <h3 className="text-sm font-semibold text-gray-900">Edit guardian</h3>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">First name *</label>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Last name *</label>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Middle name</label>
          <input value={middleName} onChange={(e) => setMiddleName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Preferred name</label>
          <input value={preferredName} onChange={(e) => setPreferredName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Occupation</label>
          <input value={occupation} onChange={(e) => setOccupation(e.target.value)} className={inputCls} />
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
