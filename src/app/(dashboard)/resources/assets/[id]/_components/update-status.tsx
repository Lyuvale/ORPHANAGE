"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ASSET_STATUSES,
  ASSET_CONDITIONS,
  ASSET_LOCATIONS,
  getAssetStatusDisplay,
  getAssetConditionDisplay,
  getAssetLocationDisplay,
} from "@/types/resources";

export default function UpdateStatus({
  assetId,
  initialStatus,
  initialCondition,
  initialLocation,
}: {
  assetId: string;
  initialStatus: string;
  initialCondition: string;
  initialLocation: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [asset_status, setAssetStatus] = useState(initialStatus);
  const [asset_condition, setAssetCondition] = useState(initialCondition);
  const [location, setLocation] = useState(initialLocation ?? "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch(`/api/resources/assets/${assetId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        asset_status,
        asset_condition,
        location: location || undefined,
        reason: reason || undefined,
      }),
    });
    const json = await res.json().catch(() => ({ error: "Unexpected error" }));
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Failed to update asset");
      return;
    }
    setOpen(false);
    setReason("");
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
      >
        Update Status / Location
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/40 p-4">
          <form onSubmit={save} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Update Asset Status / Location</h3>
            {error && <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={asset_status}
                    onChange={(e) => setAssetStatus(e.target.value)}
                    className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  >
                    {ASSET_STATUSES.filter((s) => s !== "DISPOSED").map((s) => (
                      <option key={s} value={s}>
                        {getAssetStatusDisplay(s)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Use the record button to dispose an asset.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Condition</label>
                  <select
                    value={asset_condition}
                    onChange={(e) => setAssetCondition(e.target.value)}
                    className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  >
                    {ASSET_CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {getAssetConditionDisplay(c)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                >
                  <option value="">No location</option>
                  {ASSET_LOCATIONS.map((l) => (
                    <option key={l} value={l}>
                      {getAssetLocationDisplay(l)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reason (optional)</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm font-semibold text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
