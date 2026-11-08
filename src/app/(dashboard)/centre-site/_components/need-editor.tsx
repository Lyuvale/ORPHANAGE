"use client";

import { useState } from "react";
import type { CentreNeed } from "@/types/centre-need";
import ImageUploader from "./image-uploader";

const inputCls =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm";
const labelCls = "block text-sm font-medium text-zinc-700";

export default function NeedEditor({
  need,
  onSaved,
  onCancel,
}: {
  need: CentreNeed | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(need?.title ?? "");
  const [description, setDescription] = useState(need?.description ?? "");
  const [targetAmount, setTargetAmount] = useState(
    need ? String(need.target_amount) : "",
  );
  const [sortOrder, setSortOrder] = useState(
    need ? String(need.sort_order) : "0",
  );
  const [isPublic, setIsPublic] = useState(need?.is_public ?? true);
  const [imageUrl, setImageUrl] = useState(need?.image_url ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    const amount = Number(targetAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Target amount must be greater than 0.");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        target_amount: amount,
        is_public: isPublic,
        sort_order: sortOrder.trim() === "" ? undefined : Number(sortOrder),
      };

      const res = need
        ? await fetch(`/api/centre-site/needs/${need.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/centre-site/needs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = json.details ?? json.error ?? "Failed to save need";
        throw new Error(
          typeof detail === "string" ? detail : JSON.stringify(detail),
        );
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save need");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 space-y-3"
    >
      <h3 className="text-sm font-semibold text-zinc-900">
        {need ? "Edit need" : "New need"}
      </h3>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <label className={labelCls} htmlFor="need-title">
          Title *
        </label>
        <input
          id="need-title"
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="School uniforms"
          required
        />
      </div>

      <div>
        <label className={labelCls} htmlFor="need-description">
          Description
        </label>
        <textarea
          id="need-description"
          className={inputCls}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is needed and who it helps"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="need-target">
            Target amount (TZS) *
          </label>
          <input
            id="need-target"
            type="number"
            min={1}
            step="0.01"
            className={inputCls}
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="1000000"
            required
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="need-sort">
            Sort order
          </label>
          <input
            id="need-sort"
            type="number"
            className={inputCls}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>
      </div>

      <ImageUploader value={imageUrl} onChange={setImageUrl} label="Photo" />

      <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          className="rounded border-gray-300"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
        />
        Visible on the public site
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : need ? "Save changes" : "Create need"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 border hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
