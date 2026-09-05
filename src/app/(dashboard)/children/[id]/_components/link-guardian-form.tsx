"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const RELATIONSHIP_TYPES = [
  "mother",
  "father",
  "grandparent",
  "sibling",
  "aunt",
  "uncle",
  "legal_guardian",
  "foster_caregiver",
  "other_relative",
  "other_authorised",
];

type GuardianOption = {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
};

/** Link an existing centre guardian to this child (relationship managers). */
export default function LinkGuardianForm({ childId }: { childId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [guardians, setGuardians] = useState<GuardianOption[]>([]);
  const [guardianId, setGuardianId] = useState("");
  const [relationship, setRelationship] = useState("mother");
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/guardians?limit=200", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => setGuardians(j.data ?? []))
      .catch(() => setGuardians([]));
  }, [open ]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!guardianId) {
      setMessage({ ok: false, text: "Please choose a guardian." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/guardians/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id: childId,
          guardian_id: guardianId,
          relationship_type: relationship,
          is_primary: isPrimary,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ ok: false, text: json.error ?? "Failed to link guardian." });
        return;
      }
      setOpen(false);
      setGuardianId("");
      router.refresh();
    } catch {
      setMessage({ ok: false, text: "Network error." });
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full border border-gray-300 rounded-md px-3 py-2 text-sm";

  return (
    <div className="px-4 py-4 sm:px-6">
      {!open ? (
        <button
          onClick={() => {
            setMessage(null);
            setOpen(true);
          }}
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
        >
          + Link guardian
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Link guardian</h3>
          {message && !message.ok && <p className="text-sm text-red-600">{message.text}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Guardian *</label>
              <select value={guardianId} onChange={(e) => setGuardianId(e.target.value)} className={inputCls} required>
                <option value="">Choose guardian…</option>
                {guardians.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.first_name}
                    {g.middle_name ? ` ${g.middle_name}` : ""} {g.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Relationship *</label>
              <select value={relationship} onChange={(e) => setRelationship(e.target.value)} className={inputCls}>
                {RELATIONSHIP_TYPES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
            Primary contact
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Linking…" : "Link guardian"}
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
      )}
    </div>
  );
}
