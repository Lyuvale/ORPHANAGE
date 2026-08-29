"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type {
  EducationSupportNeed,
  EducationSupportType,
  EducationSupportPriority,
  EducationSupportStatus,
} from "@/types/education";
import {
  EDUCATION_SUPPORT_TYPES,
  EDUCATION_SUPPORT_PRIORITIES,
  EDUCATION_SUPPORT_STATUSES,
  getEducationSupportTypeDisplay,
  getEducationSupportPriorityDisplay,
  getEducationSupportStatusDisplay,
} from "@/types/education";

interface ChildOption {
  id: string;
  first_name: string;
  last_name: string;
}

export default function EducationSupportNeedsPage() {
  const searchParams = useSearchParams();
  const queryChild = searchParams.get("child_id") ?? "";

  const [children, setChildren] = useState<ChildOption[]>([]);
  const [childId, setChildId] = useState(queryChild);
  const [needs, setNeeds] = useState<EducationSupportNeed[]>([]);
  const [count, setCount] = useState(0);
  const [centreId, setCentreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 20;

  const [form, setForm] = useState({
    support_type: "" as EducationSupportType | "",
    description: "",
    identified_date: new Date().toISOString().slice(0, 10),
    priority: "MEDIUM" as EducationSupportPriority,
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

  const fetchNeeds = useCallback(async () => {
    if (!childId) {
      setNeeds([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (!centreId) {
        const childRes = await fetch(`/api/children/${childId}`);
        const childData = await childRes.json();
        setCentreId(childData?.data?.centre_id ?? null);
      }
      const params = new URLSearchParams({
        child_id: childId,
        limit: String(limit),
        offset: String(page * limit),
      });
      const res = await fetch(`/api/education/support-needs?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load support needs");
      }
      const data = await res.json();
      setNeeds(data.data ?? []);
      setCount(data.count ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [childId, centreId, page]);

  useEffect(() => {
    fetchNeeds();
  }, [fetchNeeds]);

  const handleSubmit = async () => {
    if (!childId || !centreId) return;
    setError(null);
    try {
      const res = await fetch("/api/education/support-needs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centre_id: centreId,
          child_id: childId,
          support_type: form.support_type,
          description: form.description || null,
          identified_date: form.identified_date,
          priority: form.priority,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add support need");
      }
      setShowForm(false);
      setForm({
        support_type: "",
        description: "",
        identified_date: new Date().toISOString().slice(0, 10),
        priority: "MEDIUM",
        notes: "",
      });
      setPage(0);
      fetchNeeds();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleStatusChange = async (need: EducationSupportNeed, status: EducationSupportStatus) => {
    setError(null);
    try {
      const res = await fetch(`/api/education/support-needs/${need.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }
      fetchNeeds();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📚 Education Support Needs</h1>
          <p className="text-muted-foreground mt-1">
            Record the supports a child needs for their education
          </p>
        </div>
        {childId && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            {showForm ? "Cancel" : "Add Support Need"}
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
          className="rounded-md border px-3 py-2.5 text-sm w-full max-w-md"
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
          <h2 className="mb-3 text-lg font-semibold">New Support Need</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select
              value={form.support_type}
              onChange={(e) =>
                setForm({ ...form, support_type: e.target.value as EducationSupportType | "" })
              }
              className="rounded-md border px-3 py-2.5 text-sm"
            >
              <option value="">Support Type *</option>
              {EDUCATION_SUPPORT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {getEducationSupportTypeDisplay(t)}
                </option>
              ))}
            </select>
            <select
              value={form.priority}
              onChange={(e) =>
                setForm({ ...form, priority: e.target.value as EducationSupportPriority })
              }
              className="rounded-md border px-3 py-2.5 text-sm"
            >
              {EDUCATION_SUPPORT_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {getEducationSupportPriorityDisplay(p)} Priority
                </option>
              ))}
            </select>
            <input
              type="date"
              value={form.identified_date}
              onChange={(e) => setForm({ ...form, identified_date: e.target.value })}
              className="rounded-md border px-3 py-2.5 text-sm"
            />
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="rounded-md border px-3 py-2.5 text-sm"
            />
            <textarea
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="rounded-md border px-3 py-2.5 text-sm sm:col-span-2"
            />
          </div>
          <div className="mt-4">
            <button
              onClick={handleSubmit}
              disabled={!form.support_type}
              className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Save Support Need
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : !childId ? (
        <div className="py-8 text-center text-muted-foreground">
          Select a child to view support needs
        </div>
      ) : needs.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">No support needs found</div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-left font-medium">Priority</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {needs.map((n) => (
                <tr key={n.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">
                    {getEducationSupportTypeDisplay(n.support_type)}
                  </td>
                  <td className="px-4 py-3">{n.description || "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        n.priority === "HIGH"
                          ? "bg-red-100 text-red-800"
                          : n.priority === "MEDIUM"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {getEducationSupportPriorityDisplay(n.priority)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={n.status}
                      onChange={(e) => handleStatusChange(n, e.target.value as EducationSupportStatus)}
                      className="rounded-md border px-2 py-1.5 text-xs"
                    >
                      {EDUCATION_SUPPORT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {getEducationSupportStatusDisplay(s)}
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
          <span className="text-sm text-muted-foreground">{count} total needs</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm">
              {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
