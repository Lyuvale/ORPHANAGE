"use client";

import { useState, useEffect, useCallback } from "react";
import { useCaps } from "@/app/(dashboard)/_components/use-caps";
import type { HealthAppointment, AppointmentType, AppointmentStatus } from "@/types/health";
import { getAppointmentTypeDisplay, getAppointmentStatusDisplay } from "@/types/health";

interface ChildOption {
  id: string;
  first_name: string;
  last_name: string;
}

export default function AppointmentsPage() {
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [childId, setChildId] = useState("");
  const [appointments, setAppointments] = useState<HealthAppointment[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const caps = useCaps();
  const canManage = caps.includes("health.appointments.manage");
  const [page, setPage] = useState(0);
  const [centreId, setCentreId] = useState<string | null>(null);
  const limit = 20;

  const [form, setForm] = useState({
    appointment_type: "" as AppointmentType | "",
    provider_name: "",
    appointment_date: new Date().toISOString().slice(0, 10),
    appointment_time: "",
    location: "",
    purpose: "",
    followup_required: false,
  });

  const loadChildren = useCallback(async () => {
    try {
      const res = await fetch("/api/children?limit=200");
      if (!res.ok) throw new Error("Failed to load children");
      const data = await res.json();
      setChildren(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }, []);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  const fetchAppointments = useCallback(async () => {
    if (!childId) {
      setAppointments([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ child_id: childId, limit: String(limit), offset: String(page * limit) });
      const res = await fetch(`/api/health/appointments?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load appointments");
      }
      const data = await res.json();
      setAppointments(data.data ?? []);
      setCount(data.count ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [childId, page]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const resolveCentre = async () => {
    if (centreId) return centreId;
    const childRes = await fetch(`/api/children/${childId}`);
    const childData = await childRes.json();
    const resolved = childData?.data?.centre_id ?? null;
    setCentreId(resolved);
    return resolved;
  };

  const handleSubmit = async () => {
    if (!childId) return;
    setError(null);
    try {
      const resolvedCentre = await resolveCentre();
      const res = await fetch("/api/health/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centre_id: resolvedCentre,
          child_id: childId,
          appointment_type: form.appointment_type,
          provider_name: form.provider_name || null,
          appointment_date: form.appointment_date,
          appointment_time: form.appointment_time || null,
          location: form.location || null,
          purpose: form.purpose || null,
          followup_required: form.followup_required,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create appointment");
      }
      setShowForm(false);
      setForm({
        appointment_type: "",
        provider_name: "",
        appointment_date: new Date().toISOString().slice(0, 10),
        appointment_time: "",
        location: "",
        purpose: "",
        followup_required: false,
      });
      setPage(0);
      fetchAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleStatusChange = async (appt: HealthAppointment, status: AppointmentStatus) => {
    setError(null);
    try {
      const res = await fetch(`/api/health/appointments/${appt.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update appointment");
      }
      fetchAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-muted-foreground mt-1">Track healthcare appointments per child</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            {showForm ? "Cancel" : "Add Appointment"}
          </button>
        )}
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">{error}</div>}

      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium">Select Child</label>
        <select
          value={childId}
          onChange={(e) => {
            setChildId(e.target.value);
            setPage(0);
          }}
          className="rounded-md border px-3 py-2 text-sm w-full max-w-md"
        >
          <option value="">Choose a child...</option>
          {children.map((c) => (
            <option key={c.id} value={c.id}>
              {c.first_name} {c.last_name}
            </option>
          ))}
        </select>
      </div>

      {showForm && childId && canManage && (
        <div className="mb-6 rounded-lg border p-4">
          <h2 className="mb-3 text-lg font-semibold">New Appointment</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select
              value={form.appointment_type}
              onChange={(e) => setForm({ ...form, appointment_type: e.target.value as AppointmentType | "" })}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Type *</option>
              {(["clinic", "hospital", "doctor_consultation", "dental", "specialist", "therapy", "followup", "other"] as AppointmentType[]).map((t) => (
                <option key={t} value={t}>
                  {getAppointmentTypeDisplay(t)}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={form.appointment_date}
              onChange={(e) => setForm({ ...form, appointment_date: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              type="time"
              value={form.appointment_time}
              onChange={(e) => setForm({ ...form, appointment_time: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Provider Name"
              value={form.provider_name}
              onChange={(e) => setForm({ ...form, provider_name: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Purpose"
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm sm:col-span-2"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.followup_required}
                onChange={(e) => setForm({ ...form, followup_required: e.target.checked })}
              />
              Follow-up required
            </label>
          </div>
          <div className="mt-4">
            <button
              onClick={handleSubmit}
              disabled={!form.appointment_type}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Save Appointment
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : !childId ? (
        <div className="py-8 text-center text-muted-foreground">Select a child to view appointments</div>
      ) : appointments.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">No appointments found</div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Time</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Provider</th>
                <th className="px-4 py-3 text-left font-medium">Location</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {appointments.map((a) => (
                <tr key={a.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">{new Date(a.appointment_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{a.appointment_time || "-"}</td>
                  <td className="px-4 py-3">{getAppointmentTypeDisplay(a.appointment_type)}</td>
                  <td className="px-4 py-3">{a.provider_name || "-"}</td>
                  <td className="px-4 py-3">{a.location || "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        a.status === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : a.status === "CANCELLED" || a.status === "MISSED"
                            ? "bg-red-100 text-red-800"
                            : a.status === "RESCHEDULED"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {getAppointmentStatusDisplay(a.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value=""
                      onChange={(e) => {
                        const status = e.target.value as AppointmentStatus;
                        if (status) handleStatusChange(a, status);
                      }}
                      className="rounded-md border px-2 py-1 text-xs"
                    >
                      <option value="">Change...</option>
                      {(["COMPLETED", "CANCELLED", "MISSED", "RESCHEDULED"] as AppointmentStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {getAppointmentStatusDisplay(s)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{count} total appointments</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm">{page + 1} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
