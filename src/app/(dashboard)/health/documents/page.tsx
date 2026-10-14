"use client";

import { useState, useEffect, useCallback } from "react";
import type { HealthDocument, HealthDocumentType } from "@/types/health";
import { getHealthDocumentTypeDisplay } from "@/types/health";

interface ChildOption {
  id: string;
  first_name: string;
  last_name: string;
}

export default function DocumentsPage() {
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [childId, setChildId] = useState("");
  const [items, setItems] = useState<HealthDocument[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [centreId, setCentreId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<HealthDocumentType>("other");
  const [description, setDescription] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const limit = 20;

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
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ child_id: childId, limit: String(limit), offset: String(page * limit) });
      const res = await fetch(`/api/health/documents?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load documents");
      }
      const data = await res.json();
      setItems(data.data ?? []);
      setCount(data.count ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [childId, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpload = async () => {
    if (!childId || !selectedFile) {
      setError("Select a child and a file to upload");
      return;
    }
    setError(null);
    try {
      let resolvedCentre = centreId;
      if (!resolvedCentre) {
        const childRes = await fetch(`/api/children/${childId}`);
        const childData = await childRes.json();
        resolvedCentre = childData?.data?.centre_id ?? null;
        setCentreId(resolvedCentre);
      }
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("centre_id", resolvedCentre ?? "");
      formData.append("child_id", childId);
      formData.append("document_type", documentType);
      if (description) formData.append("description", description);

      const res = await fetch("/api/health/documents", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload document");
      }
      setSelectedFile(null);
      setDocumentType("other");
      setDescription("");
      setPage(0);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleDownload = async (doc: HealthDocument) => {
    setDownloadingId(doc.id);
    setError(null);
    try {
      const res = await fetch(`/api/health/documents/${doc.id}/download`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to get download link");
      }
      const data = await res.json();
      window.open(data.data.signedUrl, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setDownloadingId(null);
    }
  };

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Health Documents</h1>
        <p className="text-muted-foreground mt-1">
          Upload and access private, per-child medical documents (10MB max). Downloads are audited.
        </p>
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

      {childId && (
        <div className="mb-6 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">Upload Document</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as HealthDocumentType)}
              className="rounded-md border px-3 py-2 text-sm"
            >
              {(["medical_report", "prescription", "referral_letter", "lab_result", "immunization_record", "discharge_summary", "other"] as HealthDocumentType[]).map((t) => (
                <option key={t} value={t}>
                  {getHealthDocumentTypeDisplay(t)}
                </option>
              ))}
            </select>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="rounded-md border px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm sm:col-span-2"
            />
          </div>
          <div className="mt-4">
            <button
              onClick={handleUpload}
              disabled={!selectedFile}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-500 disabled:opacity-50"
            >
              Upload
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : !childId ? (
        <div className="py-8 text-center text-muted-foreground">Select a child to view documents</div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">No documents found</div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">File</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Size</th>
                <th className="px-4 py-3 text-left font-medium">Uploaded</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((d) => (
                <tr key={d.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{d.file_name}</td>
                  <td className="px-4 py-3">{getHealthDocumentTypeDisplay(d.document_type)}</td>
                  <td className="px-4 py-3">
                    {d.file_size ? `${(d.file_size / 1024).toFixed(1)} KB` : "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(d.uploaded_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">{d.description || "-"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDownload(d)}
                      disabled={downloadingId === d.id}
                      className="rounded-md border px-3 py-1 text-xs disabled:opacity-50"
                    >
                      {downloadingId === d.id ? "Generating..." : "Download"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{count} total documents</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm">{page + 1} of {totalPages}</span>
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
