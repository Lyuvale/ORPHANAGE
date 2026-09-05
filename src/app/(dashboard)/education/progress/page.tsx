"use client";

import { useState, useEffect, useCallback } from "react";
import { useCaps } from "@/app/(dashboard)/_components/use-caps";
import { useSearchParams } from "next/navigation";
import type { EducationProgress, EducationGoal, EducationProgressStatus } from "@/types/education";
import {
  EDUCATION_PROGRESS_STATUSES,
  getEducationProgressStatusDisplay,
} from "@/types/education";

interface ChildOption {
  id: string;
  first_name: string;
  last_name: string;
}

export default function EducationProgressPage() {
  const searchParams = useSearchParams();
  const queryChild = searchParams.get("child_id") ?? "";

  const [children, setChildren] = useState<ChildOption[]>([]);
  const [childId, setChildId] = useState(queryChild);
  const [progress, setProgress] = useState<EducationProgress[]>([]);
  const [goals, setGoals] = useState<EducationGoal[]>([]);
  const [count, setCount] = useState(0);
  const [centreId, setCentreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Progress recording stays open to caregivers (attendance duty).
  const caps = useCaps();
  const canManageProgress = caps.includes("education_development.progress.manage");
  const [page, setPage] = useState(0);
  const limit = 20;

  const [form, setForm] = useState({
    goal_id: "",
    progress_status: "IN_PROGRESS" as EducationProgressStatus,
    observation: "",
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
      setProgress([]);
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

      const [goalsRes, progressRes] = await Promise.all([
        fetch(`/api/education/goals?child_id=${childId}&limit=200`),
        fetch(
          `/api/education/progress?child_id=${childId}&limit=${limit}&offset=${page * limit}`,
        ),
      ]);
      if (!goalsRes.ok || !progressRes.ok) {
        throw new Error("Failed to load goals or progress");
      }
      const goalsData = await goalsRes.json();
      const progressData = await progressRes.json();
      setGoals(goalsData.data ?? []);
      setProgress(progressData.data ?? []);
      setCount(progressData.count ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [childId, centreId, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async () => {
    if (!childId || !centreId || !form.goal_id) return;
    setError(null);
    try {
      const res = await fetch("/api/education/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centre_id: centreId,
          child_id: childId,
          goal_id: form.goal_id,
          progress_status: form.progress_status,
          observation: form.observation || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record progress");
      }
      setShowForm(false);
      setForm({
        goal_id: "",
        progress_status: "IN_PROGRESS",
        observation: "",
      });
      setPage(0);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const goalTitle = (id: string) => goals.find((g) => g.id === id)?.title ?? "Unknown goal";

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📈 Progress Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Record the child&apos;s progress towards a development goal
          </p>
        </div>
        {childId && canManageProgress && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            {showForm ? "Cancel" : "Update Progress"}
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

      {showForm && childId && canManageProgress && (
        <div className="mb-6 rounded-lg border p-4">
          <h2 className="mb-3 text-lg font-semibold">New Progress Update</h2>
          {goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No development goals yet. Add a goal first in the Goals section.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              <select
                value={form.goal_id}
                onChange={(e) => setForm({ ...form, goal_id: e.target.value })}
                className="rounded-md border px-3 py-2.5 text-sm"
              >
                <option value="">Related Goal *</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
              <select
                value={form.progress_status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    progress_status: e.target.value as EducationProgressStatus,
                  })
                }
                className="rounded-md border px-3 py-2.5 text-sm"
              >
                {EDUCATION_PROGRESS_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {getEducationProgressStatusDisplay(s)}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="Short observation (e.g. The child can now complete daily hygiene routines with minimal assistance)"
                value={form.observation}
                onChange={(e) => setForm({ ...form, observation: e.target.value })}
                className="rounded-md border px-3 py-2.5 text-sm"
              />
            </div>
          )}
          <div className="mt-4">
            <button
              onClick={handleSubmit}
              disabled={!form.goal_id}
              className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Save Progress Update
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : !childId ? (
        <div className="py-8 text-center text-muted-foreground">
          Select a child to view progress
        </div>
      ) : progress.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">No progress recorded yet</div>
      ) : (
        <div className="space-y-3">
          {progress.map((p) => (
            <div key={p.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {goalTitle(p.goal_id)}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                    p.progress_status === "COMPLETED"
                      ? "bg-green-100 text-green-800"
                      : p.progress_status === "IN_PROGRESS"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {getEducationProgressStatusDisplay(p.progress_status)}
                </span>
              </div>
              {p.observation && (
                <p className="mt-2 text-sm italic">{p.observation}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(p.progress_date).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{count} total updates</span>
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
