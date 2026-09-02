"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RemoveStaffButton({
  userId,
  centreId,
  roleName,
}: {
  userId: string;
  centreId: string;
  roleName: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    const confirmMsg =
      roleName === "CENTRE_MANAGER"
        ? "Remove this Centre Manager? The centre will need a new manager."
        : "Remove this staff member from the centre?";
    if (!confirm(confirmMsg)) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform/staff/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centre_id: centreId, action: "deactivate" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to remove.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        onClick={handleRemove}
        disabled={saving}
        className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
      >
        Remove
      </button>
    </div>
  );
}
