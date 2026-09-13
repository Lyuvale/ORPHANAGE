"use client";

import { useRef, useState } from "react";

const inputCls =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm";

/**
 * Uploads an image (JPG/PNG/WEBP/GIF, ≤ 2 MB) to the centre's website
 * storage via the guarded server route and updates the given URL field.
 * The manual URL input is kept as a fallback.
 */
export default function ImageUploader({
  value,
  onChange,
  label = "Image",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ error: string | null; uploading: boolean }>({
    error: null,
    uploading: false,
  });

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size <= 0 || file.size > 2 * 1024 * 1024) {
      setStatus({ error: "Image must be no larger than 2 MB.", uploading: false });
      return;
    }
    setStatus({ error: null, uploading: true });
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/centre-site/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? "Upload failed.");
      }
      onChange(json?.data?.url ?? "");
    } catch (e) {
      setStatus({ error: e instanceof Error ? e.message : "Upload failed.", uploading: false });
      return;
    }
    setStatus({ error: null, uploading: false });
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1 flex items-start gap-3">
        {value ? (
          <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-md border border-dashed border-gray-300 text-center text-xs text-gray-400">
            No image
          </div>
        )}
        <div className="flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={status.uploading}
            onClick={() => inputRef.current?.click()}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60"
          >
            {status.uploading ? "Uploading…" : "Upload image"}
          </button>
        </div>
      </div>
      {status.error ? (
        <p className="mt-1 text-xs text-red-600" role="alert">{status.error}</p>
      ) : null}
      <div className="mt-2">
        <label className="block text-xs font-medium text-gray-500">…or paste an image URL</label>
        <input
          className={inputCls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
        />
      </div>
    </div>
  );
}