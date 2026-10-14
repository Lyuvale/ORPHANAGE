"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useStickyChild } from "@/app/(dashboard)/_components/use-sticky-child";
import ReportExportDialog from "@/app/(dashboard)/_components/report-export-dialog";

const REPORT_OPTIONS = [
  { value: "medical-records", label: "Medical Records" },
  { value: "appointments", label: "Appointments" },
  { value: "followups", label: "Follow-Ups" },
  { value: "screenings", label: "Screenings" },
  { value: "immunizations", label: "Immunizations" },
  { value: "summary", label: "Summary" },
];

interface ChildOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface HealthOverviewData {
  alert_count: number;
  active_medication_count: number;
  upcoming_appointment_count: number;
  open_followup_count: number;
  recent_events_count: number;
}

export default function HealthOverviewPage() {
  const searchParams = useSearchParams();
  const queryChild = searchParams.get("child_id") ?? "";
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedChild, setSelectedChild] = useStickyChild(queryChild, children);
  const [overview, setOverview] = useState<HealthOverviewData | null>(null);
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
      const res = await fetch(`/api/health/overview?child_id=${childId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load health overview");
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

  const cards = [
    { label: "Active Alerts", value: overview?.alert_count, color: "bg-red-50 text-red-700" },
    { label: "Active Medications", value: overview?.active_medication_count, color: "bg-blue-50 text-blue-700" },
    { label: "Upcoming Appointments", value: overview?.upcoming_appointment_count, color: "bg-green-50 text-green-700" },
    { label: "Open Follow-Ups", value: overview?.open_followup_count, color: "bg-yellow-50 text-yellow-700" },
    { label: "Recent Events", value: overview?.recent_events_count, color: "bg-purple-50 text-purple-700" },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Health & Medical Overview</h1>
          <p className="text-muted-foreground mt-1">
            Select a child to view their health, medication and follow-up snapshot
          </p>
        </div>
        <ReportExportDialog
          apiPath="/api/reports/health"
          title="Report / Export"
          description="Export health records for this centre."
          options={REPORT_OPTIONS}
          fileName="health"
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

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : selectedChild ? (
        overview ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {cards.map((card) => (
                <div key={card.label} className={`rounded-lg p-4 ${card.color}`}>
                  <div className="text-2xl font-bold">{card.value ?? 0}</div>
                  <div className="text-sm">{card.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              <a
                href="/health/medical-records"
                className="rounded-md bg-indigo-600 px-3.5 py-2.5 font-semibold text-white hover:bg-zinc-500"
              >
                Medical Records
              </a>
              <a
                href="/health/medications"
                className="rounded-md bg-indigo-600 px-3.5 py-2.5 font-semibold text-white hover:bg-zinc-500"
              >
                Medications
              </a>
              <a
                href="/health/appointments"
                className="rounded-md bg-indigo-600 px-3.5 py-2.5 font-semibold text-white hover:bg-zinc-500"
              >
                Appointments
              </a>
              <a
                href="/health/immunizations"
                className="rounded-md bg-indigo-600 px-3.5 py-2.5 font-semibold text-white hover:bg-zinc-500"
              >
                Immunizations
              </a>
              <a
                href="/health/screenings"
                className="rounded-md bg-indigo-600 px-3.5 py-2.5 font-semibold text-white hover:bg-zinc-500"
              >
                Screenings
              </a>
              <a
                href="/health/documents"
                className="rounded-md bg-indigo-600 px-3.5 py-2.5 font-semibold text-white hover:bg-zinc-500"
              >
                Documents
              </a>
              <a
                href="/health/emergency"
                className="rounded-md bg-red-600 px-3.5 py-2.5 font-semibold text-white hover:bg-red-500"
              >
                Emergency View
              </a>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No health record found for this child.
          </div>
        )
      ) : (
        <div className="py-8 text-center text-muted-foreground">
          Select a child to see their health overview
        </div>
      )}
    </div>
  );
}
