"use client";

import { useState } from "react";

export interface ReportFilter {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface ReportOption {
  /** Value passed to the report API as ?type= */
  value: string;
  label: string;
}

/**
 * Reusable "Report / Export" control. Renders a button that opens a simple
 * dialog letting the user pick a report type, optional filters, and an export
 * format (CSV / Excel / PDF), then triggers the download from the section's
 * own `/api/reports/<section>` route.
 *
 * Filters are rendered only when the caller supplies them; the exported data
 * is always scoped server-side to the caller's centre and permission.
 */
export default function ReportExportDialog({
  apiPath,
  title = "Report / Export",
  description,
  singleType,
  options = [],
  filters = [],
  formats = ["csv", "excel", "pdf"] as const,
  fileName = "report",
}: {
  apiPath: string;
  title?: string;
  description?: string;
  /** When the section has exactly one report type, provide value+label directly. */
  singleType?: { value: string; label: string } | null;
  options?: ReportOption[];
  filters?: ReportFilter[];
  formats?: readonly ("csv" | "excel" | "pdf")[];
  fileName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(singleType?.value ?? (options[0]?.value ?? ""));
  const [format, setFormat] = useState<"csv" | "excel" | "pdf">("csv");
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const showTypePicker = options.length > 1;

  function buildUrl() {
    const url = new URL(apiPath, window.location.origin);
    url.searchParams.set("format", format);
    if (type) url.searchParams.set("type", type);
    for (const f of filters) {
      const v = selected[f.key];
      if (v) url.searchParams.set(f.key, v);
    }
    return url.toString();
  }

  async function exportNow() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(buildUrl(), { method: "GET" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: "Export failed" }));
        setError(json.error || "Export failed");
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${fileName}.${format === "excel" ? "xls" : format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      setOpen(false);
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
      >
        {title}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
            {error && <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <div className="mt-4 space-y-4">
              {showTypePicker && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Report</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                  >
                    {options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {filters.map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700">{f.label}</label>
                  <select
                    value={selected[f.key] ?? ""}
                    onChange={(e) => setSelected((s) => ({ ...s, [f.key]: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                  >
                    <option value="">All</option>
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700">Format</label>
                <div className="mt-1 flex gap-2">
                  {formats.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormat(f)}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${
                        format === f
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {f === "excel" ? "Excel" : f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={exportNow}
                disabled={busy}
                className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
              >
                {busy ? "Generating…" : "Download"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm font-semibold text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
