"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Notification } from "@/types/notifications";
import {
  getNotificationTypeDisplay,
  getNotificationTypeBadge,
  getNotificationEntityDisplay,
  formatNotificationTime,
} from "@/types/notifications";

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadBadge, setUnreadBadge] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (!res.ok) return;
      const json = await res.json();
      setUnreadBadge(json.count ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=8");
      if (!res.ok) return;
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUnreadCount = useCallback(async () => {
    await loadUnread();
  }, [loadUnread]);

  useEffect(() => {
    loadUnreadCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) loadItems();
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadBadge((u) => Math.max(0, u - 1));
  }

  async function markAll() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadBadge(0);
    router.refresh();
  }

  const unreadCount = unreadBadge;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        className="relative rounded-md p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-900">Notifications</h3>
            <button
              type="button"
              onClick={markAll}
              disabled={unreadCount === 0}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 disabled:text-gray-300"
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && <p className="px-4 py-6 text-center text-sm text-zinc-500">Loading…</p>}
            {!loading && items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-zinc-500">No notifications yet.</p>
            )}
            {!loading &&
              items.map((n) => (
                <div
                  key={n.id}
                  className={`flex cursor-pointer gap-3 border-b border-zinc-100 px-4 py-3 hover:bg-zinc-50 ${
                    n.is_read ? "bg-white" : "bg-indigo-50/50"
                  }`}
                  onClick={() => {
                    if (!n.is_read) markRead(n.id);
                  }}
                >
                  <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? "bg-gray-300" : "bg-indigo-600"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getNotificationTypeBadge(n.type)}`}>
                        {getNotificationTypeDisplay(n.type)}
                      </span>
                      <span className="text-[11px] text-zinc-400">{getNotificationEntityDisplay(n.entity_type)}</span>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-zinc-900">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-zinc-600">{n.message}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-zinc-400">{formatNotificationTime(n.created_at)}</span>
                      {n.route && (
                        <Link
                          href={n.route}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-500"
                        >
                          View →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-zinc-200 px-4 py-2.5 text-center text-sm font-semibold text-indigo-600 hover:bg-zinc-50 hover:text-indigo-500"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
