"use client";

import { useState, useEffect } from "react";

interface StaffOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Assignment {
  id: string;
  caregiver_id: string;
  start_date: string;
  end_date: string | null;
  status: string;
  notes: string | null;
  caregiver?: { id: string; first_name: string; last_name: string; email: string };
}

export default function CaregiverAssignment({
  childId,
  currentUserId,
}: {
  childId: string;
  currentUserId: string;
}) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [caregiverId, setCaregiverId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  async function loadAssignments() {
    try {
      const res = await fetch(`/api/caregivers?child_id=${childId}`);
      if (res.ok) {
        const json = await res.json();
        setAssignments(json.data ?? []);
      }
    } catch {
      // silent
    }
  }

  async function loadStaff() {
    try {
      // Caregiver user accounts (login users holding the CAREGIVER role) —
      // the only valid assignees. If none exist yet, create them in Team.
      const res = await fetch("/api/caregivers/available");
      if (res.ok) {
        const json = await res.json();
        setStaff(json.data ?? []);
      }
    } catch {
      // silent
    }
  }

  useEffect(() => {
    loadAssignments();
    loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/caregivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id: childId,
          caregiver_id: caregiverId,
          start_date: startDate,
          notes: notes || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to assign caregiver.");
        return;
      }

      setSuccess("Caregiver assigned successfully.");
      setShowForm(false);
      setCaregiverId("");
      setNotes("");
      await loadAssignments();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnd(assignmentId: string) {
    if (!confirm("End this caregiver assignment?")) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/caregivers/${assignmentId}/end`, {
        method: "PATCH",
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to end assignment.");
        return;
      }

      setSuccess("Assignment ended.");
      await loadAssignments();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Caregiver Assignment</h3>
        {assignments.filter((a) => a.status === "active").length === 0 && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            {showForm ? "Cancel" : "Assign Caregiver"}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-3 rounded-md bg-green-50 p-2 text-sm text-green-700">{success}</div>
      )}

      {showForm && (
        <form onSubmit={handleAssign} className="mb-4 space-y-3 rounded-md bg-gray-50 p-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Caregiver</label>
            <select
              value={caregiverId}
              onChange={(e) => setCaregiverId(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
              <option value="">Select a caregiver...</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </option>
              ))}
            </select>
            {staff.length === 0 && (
              <p className="mt-1 text-xs text-gray-500">
                No caregiver accounts yet — create them first in Team, then assign here.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !caregiverId}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? "Assigning..." : "Assign"}
          </button>
        </form>
      )}

      {assignments.length === 0 ? (
        <p className="text-sm text-gray-500">No caregiver assigned yet.</p>
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => (
            <div
              key={a.id}
              className={`flex items-center justify-between rounded-md p-2 text-sm ${
                a.status === "active" ? "bg-green-50" : "bg-gray-50"
              }`}
            >
              <div>
                <span className="font-medium text-gray-900">
                  {a.caregiver
                    ? `${a.caregiver.first_name} ${a.caregiver.last_name}`
                    : "Unknown"}
                </span>
                <span className="ml-2 text-gray-500">
                  ({a.start_date}
                  {a.end_date ? ` → ${a.end_date}` : ""})
                </span>
                {a.status === "ended" && (
                  <span className="ml-2 inline-block rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                    Ended
                  </span>
                )}
              </div>
              {a.status === "active" && (
                <button
                  type="button"
                  onClick={() => handleEnd(a.id)}
                  disabled={loading}
                  className="text-xs font-medium text-red-600 hover:text-red-500 disabled:opacity-50"
                >
                  End
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
