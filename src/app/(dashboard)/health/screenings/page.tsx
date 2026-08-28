"use client";

import { useState, useEffect, useCallback } from "react";
import type { HealthScreening, ScreeningType } from "@/types/health";
import { getScreeningTypeDisplay } from "@/types/health";

interface ChildOption {
  id: string;
  first_name: string;
  last_name: string;
}

export default function ScreeningsPage() {
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [childId, setChildId] = useState("");
  const [items, setItems] = useState<HealthScreening[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(0);
  const [centreId, setCentreId] = useState<string | null>(null);
  const limit = 20;

  const [form, setForm] = useState({
    screening_type: "" as ScreeningType | "",
    screening_date: new Date().toISOString().slice(0, 10),
    provider_name: "",
    result: "",
    outcome: "",
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

  const fetchData = useCallback(async () => {
    if (!childId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ child_id: childId, limit: String(limit), offset: String(page * limit) });
      const res = await fetch(`/api/health/screenings?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load screenings");
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
      const res = await fetch("/api/health/screenings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centre_id: resolvedCentre,
          child_id: childId,
          screening_type: form.screening_type,
          screening_date: form.screening_date,
          provider_name: form.provider_name || null,
          result: form.result || null,
          outcome: form.outcome || null,
          followup_required: form.followup_required,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create screening");
      }
      setShowForm(false);
      setForm({
        screening_type: "",
        screening_date: new Date().toISOString().slice(0, 10),
        provider_name: "",
        result: "",
        outcome: "",
        followup_required: false,
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
          <h1 className="text-2xl font-bold">Screenings</h1>
          <p className="text-muted-foreground mt-1">Track health screenings and outcomes per child</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          {showForm ? "Cancel" : "Add Screening"}
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
          <h2 className="mb-3 text-lg font-semibold">New Screening</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select
              value={form.screening_type}
              onChange={(e) => setForm({ ...form, screening_type: e.target.value as ScreeningType | "" })}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Type *</option>
              {(["general_health", "dental", "vision", "hearing", "growth_monitoring", "other"] as ScreeningType[]).map((t) => (
                <option key={t} value={t}>
                  {getScreeningTypeDisplay(t)}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={form.screening_date}
              onChange={(e) => setForm({ ...form, screening_date: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Provider Name"
              value={form.provider_name}
              onChange={(e) => setForm({ ...form, provider_name: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm sm:col-span-2"
            />
            <textarea
              placeholder="Result"
              value={form.result}
              onChange={(e) => setForm({ ...form, result: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm sm:col-span-2"
            />
            <textarea
              placeholder="Outcome"
              value={form.outcome}
              onChange={(e) => setForm({ ...form, outcome: e.target.value })}
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
              disabled={!form.screening_type}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Save Screening
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : !childId ? (
        <div className="py-8 text-center text-muted-foreground">Select a child to view screenings</div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">No screenings found</div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Provider</th>
                <th className="px-4 py-3 text-left font-medium">Result</th>
                <th className="px-4 py-3 text-left font-medium">Outcome</th>
                <th className="px-4 py-3 text-left font-medium">Follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((s) => (
                <tr key={s.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">{new Date(s.screening_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{getScreeningTypeDisplay(s.screening_type)}</td>
                  <td className="px-4 py-3">{s.provider_name || "-"}</td>
                  <td className="px-4 py-3">{s.result || "-"}</td>
                  <td className="px-4 py-3">{s.outcome || "-"}</td>
                  <td className="px-4 py-3">{s.followup_required ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{count} total screenings</span>
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
