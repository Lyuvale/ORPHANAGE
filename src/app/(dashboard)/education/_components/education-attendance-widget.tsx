"use client";

import { useState, useEffect } from "react";
import { useCaps } from "@/app/(dashboard)/_components/use-caps";
import { useStickyChild } from "@/app/(dashboard)/_components/use-sticky-child";

interface AttendanceRecord {
  id: string;
  child_id: string;
  attendance_date: string;
  status: string;
  arrival_time: string | null;
  departure_time: string | null;
  notes: string | null;
  child?: { id: string; first_name: string; last_name: string; reference_number: string };
}

interface ChildOption {
  id: string;
  first_name: string;
  last_name: string;
  reference_number: string;
}

const STATUS_OPTIONS = [
  { value: "present", label: "Present", color: "bg-green-100 text-green-800" },
  { value: "absent", label: "Absent", color: "bg-red-100 text-red-800" },
  { value: "late", label: "Late", color: "bg-amber-100 text-amber-800" },
  { value: "excused", label: "Excused", color: "bg-blue-100 text-blue-800" },
  { value: "holiday", label: "Holiday", color: "bg-purple-100 text-purple-800" },
];

export default function EducationAttendanceWidget({
  childId,
  mode = "child",
}: {
  childId?: string;
  mode?: "child" | "list";
}) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Attendance recording stays open to caregivers (attendance duty) and the
  // records officer; viewers without progress.manage see records only.
  const caps = useCaps();
  const canRecordAttendance = caps.includes("education_development.progress.manage");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formChildId, setFormChildId] = useStickyChild(childId ?? "", children);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("present");
  const [arrivalTime, setArrivalTime] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [notes, setNotes] = useState("");

  async function loadRecords() {
    try {
      const url = childId
        ? `/api/education/attendance?child_id=${childId}`
        : `/api/education/attendance`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setRecords(json.data ?? []);
      }
    } catch {
      // silent
    }
  }

  async function loadChildren() {
    if (mode !== "list") return;
    try {
      const res = await fetch("/api/children");
      if (res.ok) {
        const json = await res.json();
        setChildren(json.data ?? []);
      }
    } catch {
      // silent
    }
  }

  useEffect(() => {
    loadRecords();
    loadChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, mode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/education/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id: formChildId,
          attendance_date: attendanceDate,
          status,
          arrival_time: arrivalTime || null,
          departure_time: departureTime || null,
          notes: notes || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to record attendance.");
        return;
      }

      setSuccess("Attendance recorded.");
      setShowForm(false);
      setNotes("");
      await loadRecords();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function getStatusStyle(s: string) {
    return STATUS_OPTIONS.find((o) => o.value === s)?.color ?? "bg-gray-100 text-gray-800";
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">School Attendance</h3>
        {canRecordAttendance && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            {showForm ? "Cancel" : "Record Attendance"}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-3 rounded-md bg-green-50 p-2 text-sm text-green-700">{success}</div>
      )}

      {showForm && canRecordAttendance && (
        <form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-md bg-gray-50 p-3">
          {mode === "list" && !childId && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Child</label>
              <select
                value={formChildId}
                onChange={(e) => setFormChildId(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              >
                <option value="">Select a child...</option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} ({c.reference_number})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Arrival Time</label>
              <input
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Departure Time</label>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
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
            disabled={loading || (!childId && !formChildId)}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </form>
      )}

      {records.length === 0 ? (
        <p className="text-sm text-gray-500">No attendance records yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-medium text-gray-500 uppercase">
                {mode === "list" && <th className="px-2 py-1">Child</th>}
                <th className="px-2 py-1">Date</th>
                <th className="px-2 py-1">Status</th>
                <th className="px-2 py-1">Arrival</th>
                <th className="px-2 py-1">Departure</th>
                <th className="px-2 py-1">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.slice(0, 30).map((r) => (
                <tr key={r.id}>
                  {mode === "list" && (
                    <td className="px-2 py-1 text-gray-900">
                      {r.child ? `${r.child.first_name} ${r.child.last_name}` : "—"}
                    </td>
                  )}
                  <td className="px-2 py-1 text-gray-900">
                    {new Date(r.attendance_date).toLocaleDateString()}
                  </td>
                  <td className="px-2 py-1">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getStatusStyle(r.status)}`}>
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-gray-500">{r.arrival_time ?? "—"}</td>
                  <td className="px-2 py-1 text-gray-500">{r.departure_time ?? "—"}</td>
                  <td className="px-2 py-1 text-gray-500 max-w-[200px] truncate">{r.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
