"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  SafeguardingConcern,
  SafeguardingStatus,
  SafeguardingSeverity,
  SafeguardingConcernType,
} from "@/types/safeguarding";
import {
  getSafeguardingStatusDisplay,
  getSafeguardingSeverityDisplay,
  getSafeguardingConcernTypeDisplay,
} from "@/types/safeguarding";

export default function SafeguardingPage() {
  const [concerns, setConcerns] = useState<SafeguardingConcern[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: "" as SafeguardingStatus | "",
    severity: "" as SafeguardingSeverity | "",
    concern_type: "" as SafeguardingConcernType | "",
    search: "",
  });
  const [page, setPage] = useState(0);
  const limit = 20;

  const fetchConcerns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.severity) params.set("severity", filters.severity);
      if (filters.concern_type) params.set("concern_type", filters.concern_type);
      if (filters.search) params.set("search", filters.search);
      params.set("limit", limit.toString());
      params.set("offset", (page * limit).toString());

      const res = await fetch(`/api/safeguarding?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch safeguarding concerns");
      }
      const data = await res.json();
      setConcerns(data.data);
      setCount(data.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchConcerns();
  }, [fetchConcerns]);

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Safeguarding</h1>
        <p className="text-muted-foreground mt-1">
          Manage safeguarding concerns and escalations
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search concerns..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="rounded-md border px-3 py-2 text-sm"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value as SafeguardingStatus | "" })}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="reported">Reported</option>
          <option value="initial_review">Initial Review</option>
          <option value="action_required">Action Required</option>
          <option value="under_investigation">Under Investigation</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={filters.severity}
          onChange={(e) => setFilters({ ...filters, severity: e.target.value as SafeguardingSeverity | "" })}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">All Severities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <select
          value={filters.concern_type}
          onChange={(e) => setFilters({ ...filters, concern_type: e.target.value as SafeguardingConcernType | "" })}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          <option value="abuse">Abuse</option>
          <option value="neglect">Neglect</option>
          <option value="exploitation">Exploitation</option>
          <option value="violence">Violence</option>
          <option value="missing_child">Missing Child</option>
          <option value="self_harm">Self-Harm</option>
          <option value="unsafe_environment">Unsafe Environment</option>
          <option value="trafficking">Trafficking</option>
          <option value="other">Other</option>
        </select>
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : concerns.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          No safeguarding concerns found
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Severity</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">External Referral</th>
                <th className="px-4 py-3 text-left font-medium">Reported</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {concerns.map((c) => (
                <tr key={c.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">{c.title}</td>
                  <td className="px-4 py-3">
                    {getSafeguardingConcernTypeDisplay(c.concern_type)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        c.severity === "critical"
                          ? "bg-red-100 text-red-800"
                          : c.severity === "high"
                            ? "bg-orange-100 text-orange-800"
                            : c.severity === "medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                      }`}
                    >
                      {getSafeguardingSeverityDisplay(c.severity)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        c.status === "resolved" || c.status === "closed"
                          ? "bg-gray-100 text-gray-800"
                          : c.status === "under_investigation"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {getSafeguardingStatusDisplay(c.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.external_referral ? (
                      <span className="text-green-600">Yes</span>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(c.reported_at).toLocaleDateString()}
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
            {count} total concerns
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
