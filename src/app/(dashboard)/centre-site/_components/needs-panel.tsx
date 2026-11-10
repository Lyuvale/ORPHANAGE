"use client";

import { useCallback, useEffect, useState } from "react";
import type { CentreNeed, CentreNeedProgress } from "@/types/centre-need";
import NeedEditor from "./need-editor";

interface NeedWithProgress {
  need: CentreNeed;
  progress: CentreNeedProgress;
}

type EditorState =
  | { mode: "create" }
  | { mode: "edit"; need: CentreNeed }
  | null;

const numberFormat = new Intl.NumberFormat("en-TZ", {
  maximumFractionDigits: 2,
});

function formatTzs(value: number): string {
  return `TZS ${numberFormat.format(Number(value) || 0)}`;
}

function StatusBadge({ item }: { item: NeedWithProgress }) {
  const { need, progress } = item;

  if (!need.is_public || need.status === "archived") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
        Hidden
      </span>
    );
  }

  if (progress.is_completed) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
        Completed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
      Active
    </span>
  );
}

export default function NeedsPanel({
  canManage,
  centreCode,
  publicBaseUrl,
}: {
  canManage: boolean;
  centreCode: string;
  publicBaseUrl: string;
}) {
  const [items, setItems] = useState<NeedWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(null);
  const [copied, setCopied] = useState(false);

  const trimmedBase = publicBaseUrl.replace(/\/+$/, "");
  const siteUrl = trimmedBase ? `${trimmedBase}/s/${centreCode}` : `/s/${centreCode}`;
  const localOnly = !trimmedBase || trimmedBase.includes("localhost");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/centre-site/needs", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.details || json.error || "Failed to load needs");
      }
      setItems(Array.isArray(json.data) ? (json.data as NeedWithProgress[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load needs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchVisibility = useCallback(
    async (need: CentreNeed, isPublic: boolean) => {
      setError(null);
      setBusyId(need.id);
      try {
        const res = await fetch(`/api/centre-site/needs/${need.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_public: isPublic }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json.details || json.error || "Failed to update need");
        }
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update need");
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  const remove = useCallback(
    async (need: CentreNeed) => {
      setError(null);
      setBusyId(need.id);
      try {
        const res = await fetch(`/api/centre-site/needs/${need.id}`, {
          method: "DELETE",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json.error || "Failed to delete need");
        }
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete need");
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(siteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(`Could not copy the link. Copy it manually: ${siteUrl}`);
    }
  }

  const shareText = `Support our centre by viewing our current needs: ${siteUrl}`;
  const whatsAppUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(
    "Support our centre",
  )}&body=${encodeURIComponent(shareText)}`;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Needs</h2>
          <p className="text-sm text-zinc-500">
            Publish what your centre needs. Progress updates automatically as
            contributions are received.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setEditor({ mode: "create" })}
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            New need
          </button>
        )}
      </div>

      {error && (
        <p
          className="mt-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}

      {localOnly && (
        <p className="mt-4 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
          This share link points to a local address. Set{" "}
          <span className="font-mono">NEXT_PUBLIC_APP_URL</span> to your public
          domain before sharing it with donors.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Share
        </span>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
        <a
          href={whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          WhatsApp
        </a>
        <a
          href={emailUrl}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Email
        </a>
        <span className="text-xs text-zinc-400 break-all">{siteUrl}</span>
      </div>

      {editor && (
        <NeedEditor
          key={editor.mode === "edit" ? editor.need.id : "create"}
          need={editor.mode === "edit" ? editor.need : null}
          onCancel={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            void load();
          }}
        />
      )}

      {loading && items.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">Loading needs…</p>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed p-10 text-center text-zinc-500">
          <p className="text-sm">No needs yet.</p>
          {canManage && (
            <button
              type="button"
              onClick={() => setEditor({ mode: "create" })}
              className="mt-3 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-500"
            >
              Create your first need →
            </button>
          )}
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
          {items.map((item) => {
            const { need, progress } = item;
            const percent = Math.min(100, Math.max(0, progress.percent));

            return (
              <li
                key={need.id}
                className="px-4 py-4 flex items-start justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    {need.image_url ? (
                      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={need.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-zinc-900">
                          {need.title}
                        </h3>
                        <StatusBadge item={item} />
                      </div>
                      {need.description ? (
                        <p className="mt-1 text-xs text-zinc-500">
                          {need.description}
                        </p>
                      ) : null}
                      <div className="mt-2">
                        <div className="h-2 w-full rounded-full bg-zinc-100">
                          <div
                            className={`h-2 rounded-full ${
                              progress.is_completed
                                ? "bg-green-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-3 text-xs text-zinc-500">
                          <span>
                            {formatTzs(progress.raised_amount)} /{" "}
                            {formatTzs(progress.target_amount)}
                          </span>
                          <span>{numberFormat.format(progress.percent)}%</span>
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          {progress.is_completed
                            ? "Fully funded"
                            : `${formatTzs(
                                progress.remaining_amount,
                              )} still needed`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {canManage && (
                  <div className="shrink-0 flex items-center gap-1">
                    <button
                      type="button"
                      disabled={busyId === need.id}
                      onClick={() => setEditor({ mode: "edit", need })}
                      className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busyId === need.id}
                      onClick={() =>
                        void patchVisibility(need, !need.is_public)
                      }
                      className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                    >
                      {need.is_public ? "Hide" : "Show"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === need.id}
                      onClick={() => {
                        if (
                          window.confirm(`Delete the need "${need.title}"?`)
                        ) {
                          void remove(need);
                        }
                      }}
                      className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
