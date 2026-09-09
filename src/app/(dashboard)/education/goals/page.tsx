"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useStickyChild } from "@/app/(dashboard)/_components/use-sticky-child";
import { useCaps } from "@/app/(dashboard)/_components/use-caps";
import type { EducationGoal, EducationGoalStatus } from "@/types/education";
import {
  EDUCATION_GOAL_STATUSES,
  getEducationGoalStatusDisplay,
} from "@/types/education";

interface ChildOption {
  id: string;
  first_name: string;
  last_name: string;
}

export default function EducationGoalsPage() {
  const searchParams = useSearchParams();
  const queryChild = searchParams.get("child_id") ?? "";

  const [children, setChildren] = useState<ChildOption[]>([]);
  const [childId, setChildId] = useStickyChild(queryChild, children);
  const [goals, setGoals] = useState<EducationGoal[]>([]);
  const [count, setCount] = useState(0);
  const [centreId, setCentreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 20;

  // Goal management is the Records Officer's duty.
  const caps = useCaps();
  const canManageGoals = caps.includes("education_development.goals.manage");

  const [form, setForm] = useState({
    title: "",
    description: "",
    start_date: new Date().toISOString().slice(0, 10),
    target_date: "",
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

  const fetchGoals = useCallback(async () => {
    if (!childId) {
      setGoals([]);
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
      const res = await fetch(`/api/education/goals?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load goals");
      }
      const data = await res.json();
      setGoals(data.data ?? []);
      setCount(data.count ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [childId, centreId, page]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleSubmit = async () => {
    if (!childId || !centreId) return;
    setError(null);
    try {
      const res = await fetch("/api/education/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centre_id: centreId,
          child_id: childId,
          title: form.title,
          description: form.description || null,
          start_date: form.start_date || null,
          target_date: form.target_date || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add goal");
      }
      setShowForm(false);
      setForm({
        title: "",
        description: "",
        start_date: new Date().toISOString().slice(0, 10),
        target_date: "",
      });
      setPage(0);
      fetchGoals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleStatusChange = async (goal: EducationGoal, status: EducationGoalStatus) => {
    setError(null);
    try {
      const res = await fetch(`/api/education/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update goal status");
      }
      fetchGoals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🎯 Development Goals</h1>
          <p className="text-muted-foreground mt-1">
            Create simple personal-development goals for the child
          </p>
        </div>
        {childId && canManageGoals && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            {showForm ? "Cancel" : "Add Goal"}
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

      {showForm && childId && canManageGoals && (
        <div className="mb-6 rounded-lg border p-4">
          <h2 className="mb-3 text-lg font-semibold">New Development Goal</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Goal Title *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="rounded-md border px-3 py-2.5 text-sm sm:col-span-2"
            />
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="rounded-md border px-3 py-2.5 text-sm sm:col-span-2"
            />
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="rounded-md border px-3 py-2.5 text-sm"
            />
            <input
              type="date"
              placeholder="Target Date"
              value={form.target_date}
              onChange={(e) => setForm({ ...form, target_date: e.target.value })}
              className="rounded-md border px-3 py-2.5 text-sm"
            />
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Start date defaults to today. Leave the target date blank if not set.
            </p>
          </div>
          <div className="mt-4">
            <button
              onClick={handleSubmit}
              disabled={!form.title}
              className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Save Goal
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : !childId ? (
        <div className="py-8 text-center text-muted-foreground">
          Select a child to view development goals
        </div>
      ) : goals.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">No development goals found</div>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => (
            <div key={g.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{g.title}</h3>
                  {g.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{g.description}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {g.start_date && `Start: ${new Date(g.start_date).toLocaleDateString()}`}
                    {g.target_date &&
                      ` · Target: ${new Date(g.target_date).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      g.status === "COMPLETED"
                        ? "bg-green-100 text-green-800"
                        : g.status === "IN_PROGRESS"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {getEducationGoalStatusDisplay(g.status)}
                  </span>
                  {g.status !== "COMPLETED" && canManageGoals && (
                    <select
                      value={g.status}
                      onChange={(e) =>
                        handleStatusChange(g, e.target.value as EducationGoalStatus)
                      }
                      className="rounded-md border px-2 py-1.5 text-xs"
                    >
                      {EDUCATION_GOAL_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {getEducationGoalStatusDisplay(s)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{count} total goals</span>
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
