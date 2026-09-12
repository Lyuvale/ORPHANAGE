"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import type { SitePage } from "@/types/centre-site";

export default function PagesPanel({
  initialPages,
  canManage,
  siteUrl,
}: {
  initialPages: SitePage[];
  canManage: boolean;
  siteUrl: string;
}) {
  const [pages, setPages] = useState<SitePage[]>(initialPages);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = useCallback(() => {
    return [...pages].sort((a, b) => {
      if (a.is_home !== b.is_home) return a.is_home ? -1 : 1;
      return a.nav_order - b.nav_order;
    });
  }, [pages]);

  const patch = useCallback(
    async (page: SitePage, body: Record<string, unknown>) => {
      setError(null);
      setBusyId(page.id);
      try {
        const res = await fetch(`/api/centre-site/pages/${page.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.details || json.error || "Failed to update page");
        }
        const json = await res.json();
        setPages((prev) => prev.map((p) => (p.id === page.id ? json.data : p)));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update page");
      } finally {
        setBusyId(null);
      }
    },
    [],
  );

  const remove = useCallback(async (page: SitePage) => {
    setError(null);
    setBusyId(page.id);
    try {
      const res = await fetch(`/api/centre-site/pages/${page.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete page");
      }
      setPages((prev) => prev.filter((p) => p.id !== page.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete page");
    } finally {
      setBusyId(null);
    }
  }, []);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Pages</h2>
          <p className="text-sm text-gray-500">
            Pages appear in your public site navigation. Only published pages
            are visible to visitors.
          </p>
        </div>
        {canManage && (
          <Link
            href="/centre-site/pages/new"
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            New page
          </Link>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {pages.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed p-10 text-center text-gray-500">
          <p className="text-sm">No pages yet.</p>
          {canManage && (
            <Link
              href="/centre-site/pages/new"
              className="mt-3 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-500"
            >
              Create your first page →
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-gray-200 rounded-lg border bg-white">
          {sorted().map((page) => (
            <li key={page.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={canManage ? `/centre-site/pages/${page.id}` : `#`}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
                  >
                    {page.title}
                  </Link>
                  {page.is_home && (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      Home
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      page.is_published
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {page.is_published ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-mono mt-1">
                  /{page.slug}
                  {page.show_in_nav ? ` · in nav (order ${page.nav_order})` : " · hidden from nav"}
                </p>
              </div>
              {canManage ? (
                <div className="shrink-0 flex items-center gap-1">
                  <button
                    type="button"
                    disabled={busyId === page.id}
                    onClick={() => patch(page, { is_published: !page.is_published })}
                    className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {page.is_published ? "Unpublish" : "Publish"}
                  </button>
                  {!page.is_home && (
                    <button
                      type="button"
                      disabled={busyId === page.id}
                      onClick={() => patch(page, { is_home: true })}
                      className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Set home
                    </button>
                  )}
                  <Link
                    href={`/centre-site/pages/${page.id}`}
                    className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    disabled={busyId === page.id}
                    onClick={() => {
                      if (window.confirm(`Delete the page "${page.title}"?`)) {
                        void remove(page);
                      }
                    }}
                    className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              ) : (
                <a
                  href={`${siteUrl}/${page.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  View page ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}