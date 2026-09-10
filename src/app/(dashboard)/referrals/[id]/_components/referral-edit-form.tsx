"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SOURCES = [
  "police",
  "court",
  "hospital",
  "school",
  "community",
  "government",
  "self_referral",
  "other",
];

const PRIORITIES = ["low", "medium", "high", "urgent"];

/** Edit own referral details (referrals.update holders: submitter side). */
export default function ReferralEditForm({
  referral,
}: {
  referral: {
    id: string;
    source: string;
    priority: string;
    reason: string;
    referrer_name: string | null;
    referrer_org: string | null;
    referrer_contact: string | null;
    notes: string | null;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState(referral.source);
  const [priority, setPriority] = useState(referral.priority);
  const [reason, setReason] = useState(referral.reason);
  const [referrerName, setReferrerName] = useState(referral.referrer_name ?? "");
  const [referrerOrg, setReferrerOrg] = useState(referral.referrer_org ?? "");
  const [referrerContact, setReferrerContact] = useState(referral.referrer_contact ?? "");
  const [notes, setNotes] = useState(referral.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!reason.trim()) {
      setError("Reason is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/referrals/${referral.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          priority,
          reason: reason.trim(),
          referrer_name: referrerName.trim() || null,
          referrer_org: referrerOrg.trim() || null,
          referrer_contact: referrerContact.trim() || null,
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
      <h3 className="text-sm font-semibold text-gray-900">Edit referral</h3>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
          <select value={source} onChange={(e) => setSource(e.target.value)} className={inputCls}>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Reason *</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={inputCls} required />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Referrer name</label>
          <input value={referrerName} onChange={(e) => setReferrerName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Organisation</label>
          <input value={referrerOrg} onChange={(e) => setReferrerOrg(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Contact</label>
          <input value={referrerContact} onChange={(e) => setReferrerContact(e.target.value)} className={inputCls} />
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
