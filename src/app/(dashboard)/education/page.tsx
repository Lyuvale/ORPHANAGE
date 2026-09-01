"use client";

import { useState, useEffect, useCallback } from "react";
import type { EducationStatus } from "@/types/education";
import { getEducationStatusDisplay } from "@/types/education";
import ReportExportDialog from "@/app/(dashboard)/_components/report-export-dialog";
import EducationAttendanceWidget from "./_components/education-attendance-widget";

const REPORT_OPTIONS = [
  { value: "profiles", label: "Enrolment / Profiles" },
  { value: "goals", label: "Development Goals" },
  { value: "progress", label: "Progress" },
  { value: "support-needs", label: "Support Needs" },
  { value: "achievements", label: "Achievements" },
  { value: "summary", label: "Summary" },
];

interface ChildOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface EducationOverviewData {
  profile: {
    education_status: EducationStatus | null;
    school_name: string | null;
  } | null;
  active_support_needs: number;
  high_priority_needs: number;
  active_goals: number;
  completed_goals: number;
  most_recent_progress: string | null;
  recent_achievements_count: number;
}

export default function EducationOverviewPage() {
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedChild, setSelectedChild] = useState("");
  const [overview, setOverview] = useState<EducationOverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChildren = useCallback(async () => {
    try {
      const res = await fetch("/api/children?limit=200");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load children");
      }
      const data = await res.json();
      setChildren(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }, []);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  const fetchOverview = useCallback(async (childId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/education/overview?child_id=${childId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load education overview");
      }
      const data = await res.json();
      setOverview(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChild) {
      fetchOverview(selectedChild);
    } else {
      setOverview(null);
    }
  }, [selectedChild, fetchOverview]);

  const sectionLink = (href: string) =>
    selectedChild ? `${href}?child_id=${selectedChild}` : href;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Education &amp; Development</h1>
          <p className="text-muted-foreground mt-1">
            Track each child&apos;s education and personal development in one place
          </p>
        </div>
        <ReportExportDialog
          apiPath="/api/reports/education"
          title="Report / Export"
          description="Export education & development records for this centre."
          options={REPORT_OPTIONS}
          fileName="education"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">{error}</div>
      )}

      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium">Select Child</label>
        <select
          value={selectedChild}
          onChange={(e) => setSelectedChild(e.target.value)}
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

      {selectedChild && (
        <>
          {/* Five quick-action cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <a
              href={sectionLink("/education/profile")}
              className="rounded-lg border p-4 text-center shadow-sm hover:bg-gray-50"
            >
              <div className="text-3xl">🎓</div>
              <div className="mt-2 text-sm font-semibold">Education</div>
            </a>
            <a
              href={sectionLink("/education/support-needs")}
              className="rounded-lg border p-4 text-center shadow-sm hover:bg-gray-50"
            >
              <div className="text-3xl">📚</div>
              <div className="mt-2 text-sm font-semibold">Support Needs</div>
            </a>
            <a
              href={sectionLink("/education/goals")}
              className="rounded-lg border p-4 text-center shadow-sm hover:bg-gray-50"
            >
              <div className="text-3xl">🎯</div>
              <div className="mt-2 text-sm font-semibold">Goals</div>
            </a>
            <a
              href={sectionLink("/education/progress")}
              className="rounded-lg border p-4 text-center shadow-sm hover:bg-gray-50"
            >
              <div className="text-3xl">📈</div>
              <div className="mt-2 text-sm font-semibold">Progress</div>
            </a>
            <a
              href={sectionLink("/education/achievements")}
              className="rounded-lg border p-4 text-center shadow-sm hover:bg-gray-50"
            >
              <div className="text-3xl">🏆</div>
              <div className="mt-2 text-sm font-semibold">Achievements</div>
            </a>
          </div>
        </>
      )}

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : selectedChild ? (
        overview ? (
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Education summary */}
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Education
              </h3>
              {overview.profile ? (
                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="font-medium">
                      {overview.profile.education_status
                        ? getEducationStatusDisplay(overview.profile.education_status)
                        : "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">School / Institution</dt>
                    <dd className="font-medium">{overview.profile.school_name || "-"}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No education information yet.
                </p>
              )}
            </div>

            {/* Support needs summary */}
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Support Needs
              </h3>
              <div className="mt-3 text-sm">
                <div>
                  Active:{" "}
                  <span className="font-semibold">{overview.active_support_needs}</span>
                </div>
                <div>
                  High-priority:{" "}
                  <span className="font-semibold text-red-600">
                    {overview.high_priority_needs}
                  </span>
                </div>
              </div>
            </div>

            {/* Goals summary */}
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Goals
              </h3>
              <div className="mt-3 text-sm">
                <div>
                  Active: <span className="font-semibold">{overview.active_goals}</span>
                </div>
                <div>
                  Completed:{" "}
                  <span className="font-semibold text-green-600">
                    {overview.completed_goals}
                  </span>
                </div>
              </div>
            </div>

            {/* Progress summary */}
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Progress
              </h3>
              <p className="mt-3 text-sm italic line-clamp-3">
                {overview.most_recent_progress || "No progress recorded yet."}
              </p>
            </div>

            {/* Achievements summary */}
            <div className="rounded-lg border p-4 md:col-span-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Achievements
              </h3>
              <p className="mt-3 text-sm">
                Total recorded:{" "}
                <span className="font-semibold">{overview.recent_achievements_count}</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No education &amp; development record found for this child.
          </div>
        )
      ) : (
        <div className="py-8 text-center text-muted-foreground">
          Select a child to see their education &amp; development overview
        </div>
      )}
      {selectedChild && (
        <div className="mt-6">
          <EducationAttendanceWidget childId={selectedChild} mode="child" />
        </div>
      )}

      {/* All-children attendance view when no child selected */}
      {!selectedChild && (
        <div className="mt-6">
          <EducationAttendanceWidget mode="list" />
        </div>
      )}
    </div>
  );
}
