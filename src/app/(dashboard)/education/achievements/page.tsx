"use client";

import { useState, useEffect, useCallback } from "react";
import { useCaps } from "@/app/(dashboard)/_components/use-caps";
import { useStickyChild } from "@/app/(dashboard)/_components/use-sticky-child";
import { useSearchParams } from "next/navigation";
import type { EducationAchievement, EducationAchievementCategory } from "@/types/education";
import {
  EDUCATION_ACHIEVEMENT_CATEGORIES,
  getEducationAchievementCategoryDisplay,
} from "@/types/education";

interface ChildOption {
  id: string;
  first_name: string;
  last_name: string;
}

export default function EducationAchievementsPage() {
  const searchParams = useSearchParams();
  const queryChild = searchParams.get("child_id") ?? "";

  const [children, setChildren] = useState<ChildOption[]>([]);
  const [childId, setChildId] = useStickyChild(queryChild, children);
  const [achievements, setAchievements] = useState<EducationAchievement[]>([]);
  const [count, setCount] = useState(0);
  const [centreId, setCentreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Achievement management is the Records Officer's duty.
  const caps = useCaps();
  const canManageAchievements = caps.includes("education_development.achievements.manage");
  const [page, setPage] = useState(0);
  const limit = 20;

  const [form, setForm] = useState({
    title: "",
    category: "EDUCATIONAL" as EducationAchievementCategory,
    description: "",
    achievement_date: new Date().toISOString().slice(0, 10),
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

  const fetchAchievements = useCallback(async () => {
    if (!childId) {
      setAchievements([]);
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
      const res = await fetch(`/api/education/achievements?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load achievements");
      }
      const data = await res.json();
      setAchievements(data.data ?? []);
      setCount(data.count ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [childId, centreId, page]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const handleSubmit = async () => {
    if (!childId || !centreId) return;
    setError(null);
    try {
      const res = await fetch("/api/education/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centre_id: centreId,
          child_id: childId,
          title: form.title,
          category: form.category,
          description: form.description || null,
          achieved_date: form.achievement_date || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add achievement");
      }
      setShowForm(false);
      setForm({
        title: "",
        category: "EDUCATIONAL",
        description: "",
        achievement_date: new Date().toISOString().slice(0, 10),
      });
      setPage(0);
      fetchAchievements();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🏆 Achievements</h1>
          <p className="text-muted-foreground mt-1">
            Record notable milestones the child has reached
          </p>
        </div>
        {childId && canManageAchievements && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-500"
          >
            {showForm ? "Cancel" : "Add Achievement"}
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

      {showForm && childId && canManageAchievements && (
        <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">New Achievement</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Achievement Title *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="rounded-md border px-3 py-2.5 text-sm sm:col-span-2"
            />
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as EducationAchievementCategory })
              }
              className="rounded-md border px-3 py-2.5 text-sm"
            >
              {EDUCATION_ACHIEVEMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {getEducationAchievementCategoryDisplay(c)}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={form.achievement_date}
              onChange={(e) => setForm({ ...form, achievement_date: e.target.value })}
              className="rounded-md border px-3 py-2.5 text-sm"
            />
            <textarea
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="rounded-md border px-3 py-2.5 text-sm sm:col-span-2"
            />
          </div>
          <div className="mt-4">
            <button
              onClick={handleSubmit}
              disabled={!form.title}
              className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-500 disabled:opacity-50"
            >
              Save Achievement
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : !childId ? (
        <div className="py-8 text-center text-muted-foreground">
          Select a child to view achievements
        </div>
      ) : achievements.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">No achievements recorded yet</div>
      ) : (
        <div className="space-y-3">
          {achievements.map((a) => (
            <div key={a.id} className="rounded-lg border border-zinc-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{a.title}</h3>
                    <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                      {getEducationAchievementCategoryDisplay(a.category)}
                    </span>
                  </div>
                  {a.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
                  )}
                  {a.achievement_date && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Achieved: {new Date(a.achievement_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{count} total achievements</span>
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
