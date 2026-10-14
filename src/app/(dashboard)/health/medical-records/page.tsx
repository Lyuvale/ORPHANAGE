"use client";

import { useState, useEffect, useCallback } from "react";
import { useCaps } from "@/app/(dashboard)/_components/use-caps";
import type { MedicalRecord, MedicalRecordType } from "@/types/health";
import { getMedicalRecordTypeDisplay } from "@/types/health";

interface ChildOption {
  id: string;
  first_name: string;
  last_name: string;
}

export default function MedicalRecordsPage() {
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [childId, setChildId] = useState("");
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const caps = useCaps();
  const canManage = caps.includes("health.medical_records.create");
  const [page, setPage] = useState(0);
  const limit = 20;

  const [form, setForm] = useState({
    record_type: "" as MedicalRecordType | "",
    record_date: new Date().toISOString().slice(0, 10),
    provider_name: "",
    reason: "",
    findings: "",
    treatment: "",
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

  const fetchRecords = useCallback(async () => {
    if (!childId) {
      setRecords([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ child_id: childId, limit: String(limit), offset: String(page * limit) });
      const res = await fetch(`/api/health/medical-records?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load records");
      }
      const data = await res.json();
      setRecords(data.data ?? []);
      setCount(data.count ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [childId, page]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSubmit = async () => {
    if (!childId) return;
    setError(null);
    try {
      const { data: child } = await (await fetch(`/api/children/${childId}`)).json();
      const centreId = child?.centre_id;
      const res = await fetch("/api/health/medical-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centre_id: centreId,
          child_id: childId,
          record_type: form.record_type,
          record_date: form.record_date,
          provider_name: form.provider_name || null,
          reason: form.reason || null,
          findings: form.findings || null,
          treatment: form.treatment || null,
          outcome: form.outcome || null,
          followup_required: form.followup_required,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create record");
      }
      setShowForm(false);
      setForm({
        record_type: "",
        record_date: new Date().toISOString().slice(0, 10),
        provider_name: "",
        reason: "",
        findings: "",
        treatment: "",
        outcome: "",
        followup_required: false,
      });
      setPage(0);
      fetchRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Medical Records</h1>
          <p className="text-muted-foreground mt-1">Append-only, traceable medical history per child</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-500"
          >
            {showForm ? "Cancel" : "Add Record"}
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
          <h2 className="mb-3 text-lg font-semibold">New Medical Record</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select
              value={form.record_type}
              onChange={(e) => setForm({ ...form, record_type: e.target.value as MedicalRecordType | "" })}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Type *</option>
              {(["diagnosis", "treatment", "surgery", "lab_result", "referral", "other"] as MedicalRecordType[]).map((t) => (
                <option key={t} value={t}>
                  {getMedicalRecordTypeDisplay(t)}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={form.record_date}
              onChange={(e) => setForm({ ...form, record_date: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Provider Name"
              value={form.provider_name}
              onChange={(e) => setForm({ ...form, provider_name: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm sm:col-span-2"
            />
            <input
              type="text"
              placeholder="Reason"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm sm:col-span-2"
            />
            <textarea
              placeholder="Findings"
              value={form.findings}
              onChange={(e) => setForm({ ...form, findings: e.target.value })}
              className="rounded-md border px-3 py-2 text-sm sm:col-span-2"
            />
            <textarea
              placeholder="Treatment"
              value={form.treatment}
              onChange={(e) => setForm({ ...form, treatment: e.target.value })}
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
              disabled={!form.record_type}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-500 disabled:opacity-50"
            >
              Save Record
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : !childId ? (
        <div className="py-8 text-center text-muted-foreground">Select a child to view medical records</div>
      ) : records.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">No medical records found</div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Provider</th>
                <th className="px-4 py-3 text-left font-medium">Reason</th>
                <th className="px-4 py-3 text-left font-medium">Follow-up</th>
                <th className="px-4 py-3 text-left font-medium">Version</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">{new Date(r.record_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{getMedicalRecordTypeDisplay(r.record_type)}</td>
                  <td className="px-4 py-3">{r.provider_name || "-"}</td>
                  <td className="px-4 py-3">{r.reason || "-"}</td>
                  <td className="px-4 py-3">{r.followup_required ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">v{r.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{count} total records</span>
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
