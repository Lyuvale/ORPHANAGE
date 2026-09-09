"use client";

import { useState, useEffect, useCallback } from "react";
import { useCaps } from "@/app/(dashboard)/_components/use-caps";
import { useSearchParams } from "next/navigation";
import { useStickyChild } from "@/app/(dashboard)/_components/use-sticky-child";
import type { EducationProfile, EducationStatus } from "@/types/education";
import {
  EDUCATION_STATUSES,
  getEducationStatusDisplay,
} from "@/types/education";

interface ChildOption {
  id: string;
  first_name: string;
  last_name: string;
}

export default function EducationProfilePage() {
  const searchParams = useSearchParams();
  const queryChild = searchParams.get("child_id") ?? "";

  const [children, setChildren] = useState<ChildOption[]>([]);
  const [childId, setChildId] = useStickyChild(queryChild, children);
  const [profile, setProfile] = useState<EducationProfile | null>(null);
  const [centreId, setCentreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Education record management is the Records Officer's duty.
  const caps = useCaps();
  const canManageEducation = caps.includes("education_development.education.manage");

  const [form, setForm] = useState({
    education_status: "" as EducationStatus | "",
    school_name: "",
    education_level: "",
    general_status: "",
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

  const fetchProfile = useCallback(async () => {
    if (!childId) {
      setProfile(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const childRes = await fetch(`/api/children/${childId}`);
      const childData = await childRes.json();
      setCentreId(childData?.data?.centre_id ?? null);

      const res = await fetch(`/api/education/profiles?child_id=${childId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load education profile");
      }
      const data = await res.json();
      setProfile(data.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    if (!childId || !centreId) return;
    setError(null);
    try {
      const body = {
        centre_id: centreId,
        child_id: childId,
        education_status: form.education_status,
        school_name: form.school_name || null,
        education_level: form.education_level || null,
        general_status: form.general_status || null,
        notes: form.notes || null,
      };

      const res = profile
        ? await fetch(`/api/education/profiles/${profile.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              education_status: form.education_status,
              school_name: body.school_name,
              education_level: body.education_level,
              general_status: body.general_status,
              notes: body.notes,
            }),
          })
        : await fetch("/api/education/profiles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save education information");
      }
      setShowForm(false);
      fetchProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🎓 Education</h1>
          <p className="text-muted-foreground mt-1">
            Record whether the child is attending school, and where
          </p>
        </div>
        {childId && canManageEducation && (
          <button
            onClick={() => {
              setForm({
                education_status: (profile?.education_status ?? "") as EducationStatus | "",
                school_name: profile?.school_name ?? "",
                education_level: profile?.education_level ?? "",
                general_status: profile?.general_status ?? "",
                notes: profile?.notes ?? "",
              });
              setShowForm((s) => !s);
            }}
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            {showForm ? "Cancel" : profile ? "Edit Education" : "Add Education Information"}
          </button>
        )}
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">{error}</div>}

      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium">Select Child</label>
        <select
          value={childId}
          onChange={(e) => setChildId(e.target.value)}
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

      {showForm && childId && canManageEducation && (
        <div className="mb-6 rounded-lg border p-4">
          <h2 className="mb-3 text-lg font-semibold">
            {profile ? "Edit Education Information" : "Add Education Information"}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select
              value={form.education_status}
              onChange={(e) =>
                setForm({ ...form, education_status: e.target.value as EducationStatus | "" })
              }
              className="rounded-md border px-3 py-2.5 text-sm"
            >
              <option value="">Education Status *</option>
              {EDUCATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {getEducationStatusDisplay(s)}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="School / Institution Name"
              value={form.school_name}
              onChange={(e) => setForm({ ...form, school_name: e.target.value })}
              className="rounded-md border px-3 py-2.5 text-sm"
            />
            <input
              type="text"
              placeholder="Education Level (e.g. Primary 5)"
              value={form.education_level}
              onChange={(e) => setForm({ ...form, education_level: e.target.value })}
              className="rounded-md border px-3 py-2.5 text-sm"
            />
            <input
              type="text"
              placeholder="General Status (e.g. Doing well)"
              value={form.general_status}
              onChange={(e) => setForm({ ...form, general_status: e.target.value })}
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
              onClick={handleSave}
              disabled={!form.education_status}
              className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : !childId ? (
        <div className="py-8 text-center text-muted-foreground">
          Select a child to view or add education information
        </div>
      ) : profile ? (
        <div className="rounded-lg border p-4">
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-semibold">
                {getEducationStatusDisplay(profile.education_status)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">School / Institution</dt>
              <dd className="font-semibold">{profile.school_name || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Education Level</dt>
              <dd className="font-semibold">{profile.education_level || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">General Status</dt>
              <dd className="font-semibold">{profile.general_status || "-"}</dd>
            </div>
            {profile.notes && (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="font-semibold">{profile.notes}</dd>
              </div>
            )}
          </dl>
        </div>
      ) : (
        <div className="py-8 text-center text-muted-foreground">
          No education information recorded yet. Click &quot;Add Education Information&quot; to begin.
        </div>
      )}
    </div>
  );
}
