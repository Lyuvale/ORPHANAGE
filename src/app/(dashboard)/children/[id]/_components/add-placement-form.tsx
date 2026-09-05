"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLACEMENT_TYPES = ["residential", "foster", "adoption", "transitional", "temporary"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Inline placement recording on the child profile (placements.create holders). */
export default function AddPlacementForm({ childId }: { childId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [placementType, setPlacementType] = useState("residential");
  const [startDate, setStartDate] = useState(todayIso());
  const [bedRef, setBedRef] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!startDate) {
      setMessage({ ok: false, text: "Start date is required." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/placements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id: childId,
          placement_type: placementType,
          start_date: startDate,
          bed_reference: bedRef.trim() || undefined,
          room_number: roomNo.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ ok: false, text: json.error ?? "Failed to record placement." });
        return;
      }
      setOpen(false);
      setBedRef("");
      setRoomNo("");
      setNotes("");
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
          + Record placement
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Record placement</h3>
          {message && !message.ok && <p className="text-sm text-red-600">{message.text}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
              <select value={placementType} onChange={(e) => setPlacementType(e.target.value)} className={inputCls}>
                {PLACEMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Start date *</label>
              <input type="date" value={startDate} max={todayIso()} onChange={(e) => setStartDate(e.target.value)} className={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Bed reference</label>
              <input value={bedRef} onChange={(e) => setBedRef(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Room number</label>
              <input value={roomNo} onChange={(e) => setRoomNo(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save placement"}
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
