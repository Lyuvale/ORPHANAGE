"use client";

import { useState, useEffect, useCallback } from "react";
import { useCaps } from "@/app/(dashboard)/_components/use-caps";
import type { Medication, MedicationAdminStatus } from "@/types/health";
import { getMedicationStatusDisplay, getMedicationAdminStatusDisplay } from "@/types/health";

interface ChildOption {
  id: string;
  first_name: string;
  last_name: string;
}

export default function MedicationsPage() {
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [childId, setChildId] = useState("");
  const [meds, setMeds] = useState<Medication[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const caps = useCaps();
  const canManage = caps.includes("health.medications.manage");
  const [page, setPage] = useState(0);
  const [centreId, setCentreId] = useState<string | null>(null);
  const limit = 20;

  const [form, setForm] = useState({
    medication_name: "",
    dosage: "",
    frequency: "",
    route: "",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: "",
    prescribed_by: "",
    notes: "",
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

  const fetchMeds = useCallback(async () => {
    if (!childId) {
      setMeds([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ child_id: childId, limit: String(limit), offset: String(page * limit) });
      const res = await fetch(`/api/health/medications?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load medications");
      }
      const data = await res.json();
      setMeds(data.data ?? []);
      setCount(data.count ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [childId, page]);

  useEffect(() => {
    fetchMeds();
  }, [fetchMeds]);

  const handleSubmit = async () => {
    if (!childId) return;
    setError(null);
    try {
      let resolvedCentre = centreId;
      if (!resolvedCentre) {
        const childRes = await fetch(`/api/children/${childId}`);
        const childData = await childRes.json();
        resolvedCentre = childData?.data?.centre_id ?? null;
        setCentreId(resolvedCentre);
      }
      const res = await fetch("/api/health/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centre_id: resolvedCentre,
          child_id: childId,
          medication_name: form.medication_name,
          dosage: form.dosage || null,
          frequency: form.frequency || null,
          route: form.route || null,
          start_date: form.start_date,
          end_date: form.end_date || null,
          prescribed_by: form.prescribed_by || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create medication");
      }
      setShowForm(false);
      setForm({
        medication_name: "",
        dosage: "",
        frequency: "",
        route: "",
        start_date: new Date().toISOString().slice(0, 10),
        end_date: "",
        prescribed_by: "",
        notes: "",
      });
      setPage(0);
      fetchMeds();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleAdminister = async (med: Medication, status: MedicationAdminStatus) => {
    setError(null);
    try {
      const now = new Date();
      const scheduledTime = `${now.toISOString().slice(0, 10)}T${now.toTimeString().slice(0, 8)}.000Z`;
      const res = await fetch("/api/health/medication-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centre_id: med.centre_id,
          child_id: med.child_id,
          medication_id: med.id,
          scheduled_time: scheduledTime,
          status,
          not_administered_reason:
            status === "GIVEN" ? null : `Marked as ${status}`,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record administration");
      }
      fetchMeds();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Medications</h1>
          <p className="text-muted-foreground mt-1">Track prescriptions and administrations per child</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-500"
          >
            {showForm ? "Cancel" : "Add Medication"}
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
        <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">New Medication</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Medication Name *"
              value={form.medication_name}
              onChange={(e) => setForm({ ...form, medication_name: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Dosage"
              value={form.dosage}
              onChange={(e) => setForm({ ...form, dosage: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Frequency"
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Route"
              value={form.route}
              onChange={(e) => setForm({ ...form, route: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Prescribed by"
              value={form.prescribed_by}
              onChange={(e) => setForm({ ...form, prescribed_by: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div className="mt-4">
            <button
              onClick={handleSubmit}
              disabled={!form.medication_name}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-500 disabled:opacity-50"
            >
              Save Medication
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : !childId ? (
        <div className="py-8 text-center text-muted-foreground">Select a child to view medications</div>
      ) : meds.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">No medications found</div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Dosage</th>
                <th className="px-4 py-3 text-left font-medium">Frequency</th>
                <th className="px-4 py-3 text-left font-medium">Start</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Administer</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {meds.map((m) => (
                <tr key={m.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{m.medication_name}</td>
                  <td className="px-4 py-3">{m.dosage || "-"}</td>
                  <td className="px-4 py-3">{m.frequency || "-"}</td>
                  <td className="px-4 py-3">{new Date(m.start_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        m.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : m.status === "COMPLETED"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-zinc-100 text-gray-800"
                      }`}
                    >
                      {getMedicationStatusDisplay(m.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {m.status === "ACTIVE" && (
                      <select
                        value=""
                        onChange={(e) => {
                          const status = e.target.value as MedicationAdminStatus;
                          if (status) handleAdminister(m, status);
                        }}
                        className="rounded-md border px-2 py-1 text-xs"
                      >
                        <option value="">Record...</option>
                        {(["GIVEN", "MISSED", "REFUSED", "NOT_AVAILABLE", "OTHER_APPROVED"] as MedicationAdminStatus[]).map((s) => (
                          <option key={s} value={s}>
                            {getMedicationAdminStatusDisplay(s)}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{count} total medications</span>
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

