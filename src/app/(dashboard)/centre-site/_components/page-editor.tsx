"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SitePage, SitePageBlock, SiteBlockType } from "@/types/centre-site";
import { SITE_BLOCK_TYPES } from "@/types/centre-site";
import BlockRenderer from "@/components/centre-site/block-renderer";
import ImageUploader from "./image-uploader";

const inputCls =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm";
const labelCls = "block text-sm font-medium text-gray-700";

let idCounter = 0;
function nextBlockId(): string {
  idCounter += 1;
  return `blk_${Date.now().toString(36)}_${idCounter}`;
}

function emptyBlock(type: SiteBlockType): SitePageBlock {
  const base = { id: nextBlockId(), type };
  switch (type) {
    case "heading":
      return { ...base, type, data: { level: 2, text: "" } };
    case "paragraph":
      return { ...base, type, data: { text: "" } };
    case "image":
      return { ...base, type, data: { src: "", alt: "", caption: "" } };
    case "button":
      return { ...base, type, data: { label: "", href: "" } };
    case "list":
      return { ...base, type, data: { items: [""], ordered: false } };
    case "quote":
      return { ...base, type, data: { text: "", attribution: "" } };
    case "divider":
      return { ...base, type, data: {} };
    case "video":
      return { ...base, type, data: { url: "" } };
    case "embed_html":
      return { ...base, type, data: { html: "" } };
    case "donation":
      return { ...base, type, data: { title: "", description: "" } };
  }
}

function BlockEditorFields({
  block,
  onChange,
}: {
  block: SitePageBlock;
  onChange: (block: SitePageBlock) => void;
}) {
  const set = (path: string, value: unknown) => {
    onChange({ ...block, data: { ...block.data, [path]: value } } as SitePageBlock);
  };

  switch (block.type) {
    case "heading":
      return (
        <div className="grid gap-3 sm:grid-cols-[6rem_1fr]">
          <div>
            <label className={labelCls}>Level</label>
            <select className={inputCls} value={String(block.data.level)}
              onChange={(e) => set("level", Number(e.target.value) as 1 | 2 | 3)}>
              <option value="1">H1</option>
              <option value="2">H2</option>
              <option value="3">H3</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Text</label>
            <input className={inputCls} value={block.data.text}
              onChange={(e) => set("text", e.target.value)} />
          </div>
        </div>
      );
    case "paragraph":
      return (
        <div>
          <label className={labelCls}>Text</label>
          <textarea className={inputCls} rows={3} value={block.data.text}
            onChange={(e) => set("text", e.target.value)} />
        </div>
      );
    case "image":
      return (
        <div className="space-y-3">
          <ImageUploader value={block.data.src} onChange={(url) => set("src", url)} label="Image" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Alt text</label>
              <input className={inputCls} value={block.data.alt ?? ""}
                onChange={(e) => set("alt", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Caption</label>
              <input className={inputCls} value={block.data.caption ?? ""}
                onChange={(e) => set("caption", e.target.value)} />
            </div>
          </div>
        </div>
      );
    case "button":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Label</label>
            <input className={inputCls} value={block.data.label}
              onChange={(e) => set("label", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Link</label>
            <input className={inputCls} value={block.data.href}
              onChange={(e) => set("href", e.target.value)} placeholder="https://… or /s/code/slug" />
          </div>
        </div>
      );
    case "list":
      return (
        <div>
          <label className={labelCls}>Items (one per line)</label>
          <textarea className={inputCls} rows={4} value={(block.data.items ?? []).join("\n")}
            onChange={(e) => set("items", e.target.value.split("\n"))} />
          <label className="mt-2 inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" className="rounded border-gray-300"
              checked={block.data.ordered === true}
              onChange={(e) => set("ordered", e.target.checked)} />
            Numbered list
          </label>
        </div>
      );
    case "quote":
      return (
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Quote text</label>
            <textarea className={inputCls} rows={2} value={block.data.text}
              onChange={(e) => set("text", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Attribution</label>
            <input className={inputCls} value={block.data.attribution ?? ""}
              onChange={(e) => set("attribution", e.target.value)} />
          </div>
        </div>
      );
    case "divider":
      return <p className="text-xs text-gray-400">Horizontal divider — no settings.</p>;
    case "video":
      return (
        <div>
          <label className={labelCls}>Video embed URL</label>
          <input className={inputCls} value={block.data.url}
            onChange={(e) => set("url", e.target.value)} placeholder="https://www.youtube.com/embed/…" />
        </div>
      );
    case "embed_html":
      return (
        <div>
          <label className={labelCls}>HTML embed (trusted)</label>
          <textarea className={`${inputCls} font-mono`} rows={4} value={block.data.html}
            onChange={(e) => set("html", e.target.value)}
            placeholder="e.g. a Google Form iframe" />
        </div>
      );
    case "donation":
      return (
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Heading (optional)</label>
            <input className={inputCls} value={block.data.title ?? ""}
              onChange={(e) => set("title", e.target.value)} placeholder="Support this centre" />
          </div>
          <div>
            <label className={labelCls}>Description (optional)</label>
            <textarea className={inputCls} rows={2} value={block.data.description ?? ""}
              onChange={(e) => set("description", e.target.value)} />
          </div>
          <p className="text-xs text-gray-500">
            Donations are collected on the visitor&apos;s side of the site and land directly in this centre&apos;s
            Resources &amp; Support for the accountant.
          </p>
        </div>
      );
  }
  return null;
}

export default function PageEditor({
  initialPage,
  canManage,
  centreCode,
}: {
  initialPage: SitePage | null;
  canManage: boolean;
  centreCode: string;
}) {
  const router = useRouter();
  const [pageId] = useState(initialPage?.id ?? null);
  const [title, setTitle] = useState(initialPage?.title ?? "");
  const [slug, setSlug] = useState(initialPage?.slug ?? "");
  const [navLabel, setNavLabel] = useState(initialPage?.nav_label ?? "");
  const [showInNav, setShowInNav] = useState(initialPage?.show_in_nav ?? true);
  const [navOrder, setNavOrder] = useState(initialPage?.nav_order ?? 0);
  const [isPublished, setIsPublished] = useState(initialPage?.is_published ?? false);
  const [isHome, setIsHome] = useState(initialPage?.is_home ?? false);
  const [metaDescription, setMetaDescription] = useState(initialPage?.meta_description ?? "");
  const [blocks, setBlocks] = useState<SitePageBlock[]>(initialPage?.content ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const slugDirty = useMemo(() => !!slug, [slug]);

  const updateBlock = (index: number, block: SitePageBlock) =>
    setBlocks((prev) => prev.map((b, i) => (i === index ? block : b)));

  const move = (index: number, dir: -1 | 1) =>
    setBlocks((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  async function save() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    setMsg(null);
    const body: Record<string, unknown> = {
      title,
      slug: slugDirty ? slug : undefined,
      nav_label: navLabel || null,
      show_in_nav: showInNav,
      nav_order: navOrder,
      is_published: isPublished,
      is_home: isHome,
      meta_description: metaDescription || null,
      content: blocks,
    };

    try {
      const res = pageId
        ? await fetch(`/api/centre-site/pages/${pageId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/centre-site/pages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const json = await res.json();
      if (!res.ok) {
        const detail = json.details ?? json.error ?? "Failed to save page";
        throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
      }
      if (!pageId) {
        router.push(`/centre-site/pages/${json.data.id}`);
      } else {
        setMsg("Page saved.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save page");
    } finally {
      setSaving(false);
    }
  }

  const publicUrl = `/${centreCode}`;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {pageId ? "Edit page" : "New page"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            <a href={`/s/${centreCode}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">
              View site ↗
            </a>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {preview ? "Edit" : "Preview"}
          </button>
          {canManage && (
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : pageId ? "Save page" : "Create page"}
            </button>
          )}
        </div>
      </div>

      {msg && (
        <p className="mt-4 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700" role="status">
          {msg}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {preview ? (
        <div className="mt-6 rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview ({publicUrl})</h2>
          <BlockRenderer blocks={blocks} centreCode={centreCode} />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="title">Title *</label>
              <input id="title" className={inputCls} value={title} disabled={!canManage}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slugDirty) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-"));
                }} placeholder="Our Story" />
            </div>
            <div>
              <label className={labelCls} htmlFor="slug">Slug</label>
              <input id="slug" className={inputCls} value={slug} disabled={!canManage}
                onChange={(e) => { setSlug(e.target.value); if (e.target.value) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); }}
                placeholder="our-story" />
              <p className="mt-1 text-xs text-gray-400">Auto-generated from title; you can change it.</p>
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="nav_label">Navigation label (optional)</label>
            <input id="nav_label" className={inputCls} value={navLabel} disabled={!canManage}
              onChange={(e) => setNavLabel(e.target.value)} placeholder="Defaults to the title" />
          </div>

          <div>
            <label className={labelCls} htmlFor="meta">Meta description (optional)</label>
            <input id="meta" className={inputCls} value={metaDescription} disabled={!canManage}
              onChange={(e) => setMetaDescription(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls} htmlFor="nav_order">Nav order</label>
              <input id="nav_order" type="number" className={inputCls} value={navOrder} disabled={!canManage}
                onChange={(e) => setNavOrder(Number(e.target.value) || 0)} />
            </div>
            <div className="pt-5">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" className="rounded border-gray-300" checked={showInNav} disabled={!canManage}
                  onChange={(e) => setShowInNav(e.target.checked)} />
                Show in navigation
              </label>
            </div>
            <div className="pt-5">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" className="rounded border-gray-300" checked={isPublished} disabled={!canManage}
                  onChange={(e) => setIsPublished(e.target.checked)} />
                Published (visible to visitors)
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="rounded border-gray-300" checked={isHome} disabled={!canManage}
                onChange={(e) => setIsHome(e.target.checked)} />
              Make this the site home page
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Content blocks</h3>
              {canManage && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Add block:</span>
                  <select
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                    defaultValue=""
                    onChange={(e) => {
                      const t = e.target.value as SiteBlockType;
                      if (t) setBlocks((prev) => [...prev, emptyBlock(t)]);
                    }}
                  >
                    <option value="" disabled>Choose…</option>
                    {SITE_BLOCK_TYPES.map((t) => (
                      <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {blocks.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed p-8 text-center text-sm text-gray-400">
                No content yet. Add your first block above.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {blocks.map((block, index) => (
                  <li key={block.id} className="rounded-lg border bg-white p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {block.type.replace(/_/g, " ")}
                      </span>
                      <div className="flex items-center gap-1">
                        <button type="button" disabled={!canManage || index === 0}
                          onClick={() => move(index, -1)}
                          className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40">↑</button>
                        <button type="button" disabled={!canManage || index === blocks.length - 1}
                          onClick={() => move(index, 1)}
                          className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40">↓</button>
                        <button type="button" disabled={!canManage}
                          onClick={() => setBlocks((prev) => prev.filter((_, i) => i !== index))}
                          className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40">Remove</button>
                      </div>
                    </div>
                    {canManage ? (
                      <BlockEditorFields block={block} onChange={(b) => updateBlock(index, b)} />
                    ) : (
                      <p className="text-xs text-gray-500">Editing is disabled for your role.</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}