"use client";

import { useEffect, useState } from "react";
import {
  NOTIFICATION_EVENTS,
  CRITICAL_NOTIFICATION_EVENTS,
  type NotificationEvent,
  type NotificationPreference,
} from "@/types/notifications";

function eventLabel(e: NotificationEvent): string {
  return e
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/notifications/preferences")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => {
        const map: Record<string, boolean> = {};
        for (const p of json.data as NotificationPreference[]) {
          map[p.event_type] = p.enabled;
        }
        setPrefs(map);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function toggle(e: NotificationEvent, enabled: boolean) {
    setPrefs((p) => ({ ...p, [e]: enabled }));
    await fetch("/api/notifications/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: e, enabled }),
    });
  }

  const critical = CRITICAL_NOTIFICATION_EVENTS;
  const optional = NOTIFICATION_EVENTS.filter((e) => !critical.includes(e));

  return (
    <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
      <p className="mt-1 text-sm text-gray-600">
        Choose which optional events you receive. Critical events (safeguarding, financial
        accountability, account &amp; centre changes) are always delivered.
      </p>

      {!loaded && <p className="mt-4 text-sm text-gray-500">Loading preferences…</p>}
      {loaded && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {optional.map((e) => {
            const enabled = prefs[e] !== false;
            return (
              <label
                key={e}
                className={`flex cursor-pointer items-center justify-between rounded-md border px-3 py-2.5 ${
                  enabled ? "border-indigo-200 bg-indigo-50/50" : "border-gray-200"
                }`}
              >
                <span className="text-sm font-medium text-gray-800">{eventLabel(e)}</span>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(ev) => toggle(e, ev.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <p className="text-sm font-semibold text-gray-700">Always delivered (cannot be disabled):</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {critical.map((e) => (
            <span
              key={e}
              className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"
            >
              {eventLabel(e)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
