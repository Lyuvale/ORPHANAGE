"use client";

import { useState, useEffect, useCallback } from "react";
import type { Case, CaseStatus, CaseType, CasePriority } from "@/types/case";
import { getCaseStatusDisplay, getCaseTypeDisplay, getCasePriorityDisplay } from "@/types/case";
import ReportExportDialog from "@/app/(dashboard)/_components/report-export-dialog";

const REPORT_OPTIONS = [
  { value: "summary", label: "Summary by Status" },
  { value: "open-cases", label: "Open Cases" },
  { value: "by-status", label: "By Status" },
];

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: "" as CaseStatus | "",
    case_type: "" as CaseType | "",
    priority: "" as CasePriority | "",
    search: "",
  });
  const [page, setPage] = useState(0);
  const limit = 20;

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.case_type) params.set("case_type", filters.case_type);
      if (filters.priority) params.set("priority", filters.priority);
      if (filters.search) params.set("search", filters.search);
      params.set("limit", limit.toString());
      params.set("offset", (page * limit).toString());

      const res = await fetch(`/api/cases?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch cases");
      }
      const data = await res.json();
      setCases(data.data);
      setCount(data.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cases</h1>
          <p className="text-muted-foreground mt-1">
            Manage child protection and welfare cases
          </p>
        </div>
        <ReportExportDialog
          apiPath="/api/reports/cases"
          title="Report / Export"
          options={REPORT_OPTIONS}
          fileName="cases"
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
          placeholder="Search cases..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="rounded-md border px-3 py-2 text-sm"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value as CaseStatus | "" })}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="under_assessment">Under Assessment</option>
          <option value="active_plan">Active Plan</option>
          <option value="on_hold">On Hold</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={filters.case_type}
          onChange={(e) => setFilters({ ...filters, case_type: e.target.value as CaseType | "" })}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          <option value="protection">Protection</option>
          <option value="family_reunification">Family Reunification</option>
          <option value="behavioural">Behavioural</option>
          <option value="education">Education</option>
          <option value="health">Health</option>
          <option value="placement">Placement</option>
          <option value="legal">Legal</option>
          <option value="psychosocial">Psychosocial</option>
          <option value="other">Other</option>
        </select>
        <select
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value as CasePriority | "" })}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : cases.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          No cases found
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Reference</th>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Priority</th>
                <th className="px-4 py-3 text-left font-medium">Classification</th>
                <th className="px-4 py-3 text-left font-medium">Opened</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cases.map((c) => (
                <tr key={c.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-mono text-xs">
                    {c.reference_number}
                  </td>
                  <td className="px-4 py-3">{c.title}</td>
                  <td className="px-4 py-3">
                    {getCaseTypeDisplay(c.case_type)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        c.status === "open"
                          ? "bg-blue-100 text-blue-800"
                          : c.status === "active_plan"
                            ? "bg-green-100 text-green-800"
                            : c.status === "resolved" || c.status === "closed"
                              ? "bg-gray-100 text-gray-800"
                              : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {getCaseStatusDisplay(c.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {getCasePriorityDisplay(c.priority)}
                  </td>
                  <td className="px-4 py-3">{c.classification}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(c.opened_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {count} total cases
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
