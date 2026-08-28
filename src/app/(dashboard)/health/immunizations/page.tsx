"use client";

import { useState, useEffect, useCallback } from "react";
import type { Immunization, ImmunizationStatus } from "@/types/health";
import { getImmunizationStatusDisplay } from "@/types/health";

interface ChildOption {
  id: string;
  first_name: string;
  last_name: string;
}

export default function ImmunizationsPage() {
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [childId, setChildId] = useState("");
  const [items, setItems] = useState<Immunization[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(0);
  const [centreId, setCentreId] = useState<string | null>(null);
  const limit = 20;

  const [form, setForm] = useState({
    vaccine: "",
    dose: "",
    administered_date: new Date().toISOString().slice(0, 10),
    provider_name: "",
    next_dose_date: "",
    status: "COMPLETED" as ImmunizationStatus,
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

  const fetchData = useCallback(async () => {
    if (!childId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ child_id: childId, limit: String(limit), offset: String(page * limit) });
      const res = await fetch(`/api/health/immunizations?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load immunizations");
      }
      const data = await res.json();
      setItems(data.data ?? []);
      setCount(data.count ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [childId, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      const res = await fetch("/api/health/immunizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centre_id: resolvedCentre,
          child_id: childId,
          vaccine: form.vaccine,
          dose: form.dose || null,
          administered_date: form.administered_date,
          provider_name: form.provider_name || null,
          next_dose_date: form.next_dose_date || null,
          status: form.status,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create immunization");
      }
      setShowForm(false);
      setForm({
        vaccine: "",
        dose: "",
        administered_date: new Date().toISOString().slice(0, 10),
        provider_name: "",
        next_dose_date: "",
        status: "COMPLETED",
      });
      setPage(0);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Immunizations</h1>
          <p className="text-muted-foreground mt-1">Track vaccinations and due/overdue doses per child</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          {showForm ? "Cancel" : "Add Immunization"}
        </button>
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

      {showForm && childId && (
        <div className="mb-6 rounded-lg border p-4">
          <h2 className="mb-3 text-lg font-semibold">New Immunization</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Vaccine *"
              value={form.vaccine}
              onChange={(e) => setForm({ ...form, vaccine: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Dose"
              value={form.dose}
              onChange={(e) => setForm({ ...form, dose: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={form.administered_date}
              onChange={(e) => setForm({ ...form, administered_date: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={form.next_dose_date}
              onChange={(e) => setForm({ ...form, next_dose_date: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Provider Name"
              value={form.provider_name}
              onChange={(e) => setForm({ ...form, provider_name: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ImmunizationStatus })}
              className="rounded-md border px-3 py-2 text-sm"
            >
              {(["COMPLETED", "DUE", "OVERDUE"] as ImmunizationStatus[]).map((s) => (
                <option key={s} value={s}>
                  {getImmunizationStatusDisplay(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4">
            <button
              onClick={handleSubmit}
              disabled={!form.vaccine}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Save Immunization
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : !childId ? (
        <div className="py-8 text-center text-muted-foreground">Select a child to view immunizations</div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">No immunizations found</div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Vaccine</th>
                <th className="px-4 py-3 text-left font-medium">Dose</th>
                <th className="px-4 py-3 text-left font-medium">Administered</th>
                <th className="px-4 py-3 text-left font-medium">Next Dose</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((i) => (
                <tr key={i.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{i.vaccine}</td>
                  <td className="px-4 py-3">{i.dose || "-"}</td>
                  <td className="px-4 py-3">{new Date(i.administered_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {i.next_dose_date ? new Date(i.next_dose_date).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        i.status === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : i.status === "OVERDUE"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {getImmunizationStatusDisplay(i.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{count} total immunizations</span>
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
