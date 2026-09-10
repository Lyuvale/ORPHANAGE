"use client";

import { useState, useEffect, useCallback } from "react";
import type { Visit, VisitStatus, VisitType } from "@/types/visit";
import { getVisitStatusDisplay, getVisitTypeDisplay } from "@/types/visit";
import ReportExportDialog from "@/app/(dashboard)/_components/report-export-dialog";
import ApproveRejectButtons from "@/app/(dashboard)/_components/approve-reject-buttons";

const REPORT_OPTIONS = [
  { value: "summary", label: "Summary by Status" },
  { value: "history", label: "Visit History" },
  { value: "upcoming", label: "Upcoming Visits" },
  { value: "by-status", label: "By Status" },
];

export default function VisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: "" as VisitStatus | "",
    visit_type: "" as VisitType | "",
    upcoming: "",
    search: "",
  });
  const [page, setPage] = useState(0);
  const [perms, setPerms] = useState<string[]>([]);
  const limit = 20;

  // Own approval rights (visibility only — the endpoint enforces again).
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { permissions: [] }))
      .then((j) => setPerms(Array.isArray(j.permissions) ? j.permissions : []))
      .catch(() => setPerms([]));
  }, []);

  const canApproveVisit = perms.includes("visits.approve");
  const canRejectVisit = perms.includes("visits.reject");

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.visit_type) params.set("visit_type", filters.visit_type);
      if (filters.upcoming) params.set("upcoming", filters.upcoming);
      if (filters.search) params.set("search", filters.search);
      params.set("limit", limit.toString());
      params.set("offset", (page * limit).toString());

      const res = await fetch(`/api/visits?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch visits");
      }
      const data = await res.json();
      setVisits(data.data);
      setCount(data.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Visits & Family Contact</h1>
          <p className="text-muted-foreground mt-1">
            Manage authorised visits and family contact records
          </p>
        </div>
        <ReportExportDialog
          apiPath="/api/reports/visits"
          title="Report / Export"
          options={REPORT_OPTIONS}
          fileName="visits"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search visits..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="rounded-md border px-3 py-2 text-sm"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value as VisitStatus | "" })}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="requested">Requested</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="scheduled">Scheduled</option>
          <option value="checked_in">Checked In</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="rejected">Rejected</option>
          <option value="no_show">No Show</option>
        </select>
        <select
          value={filters.visit_type}
          onChange={(e) => setFilters({ ...filters, visit_type: e.target.value as VisitType | "" })}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          <option value="in_person">In Person</option>
          <option value="phone">Phone</option>
          <option value="video">Video</option>
          <option value="off_site">Off Site</option>
          <option value="other_approved">Other Approved</option>
        </select>
        <select
          value={filters.upcoming}
          onChange={(e) => setFilters({ ...filters, upcoming: e.target.value })}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">All Visits</option>
          <option value="true">Upcoming</option>
        </select>
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : visits.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          No visits found
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Reference</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Purpose</th>
                <th className="px-4 py-3 text-left font-medium">Supervised</th>
                <th className="px-4 py-3 text-left font-medium">Outcome</th>
                {(canApproveVisit || canRejectVisit) && (
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {visits.map((v) => (
                <tr key={v.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-mono text-xs">
                    {v.reference_number}
                  </td>
                  <td className="px-4 py-3">
                    {getVisitTypeDisplay(v.visit_type)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(v.scheduled_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        v.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : v.status === "checked_in"
                            ? "bg-blue-100 text-blue-800"
                            : v.status === "cancelled" || v.status === "rejected"
                              ? "bg-gray-100 text-gray-800"
                              : v.status === "no_show"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {getVisitStatusDisplay(v.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate">
                    {v.purpose}
                  </td>
                  <td className="px-4 py-3">
                    {v.supervised ? (
                      <span className="text-yellow-600 font-medium">Yes</span>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {v.outcome || "-"}
                  </td>
                  {(canApproveVisit || canRejectVisit) && (
                    <td className="px-4 py-3">
                      {v.status === "requested" || v.status === "pending_approval" ? (
                        <ApproveRejectButtons
                          url={`/api/visits/${v.id}/status`}
                          approveBody={{ new_status: "approved" }}
                          rejectBody={{ new_status: "rejected" }}
                          showApprove={canApproveVisit}
                          showReject={canRejectVisit}
                          requireReasonOnReject
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {count} total visits
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm">
              {page + 1} of {totalPages}
            </span>
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
