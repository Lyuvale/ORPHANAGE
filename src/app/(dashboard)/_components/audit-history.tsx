"use client";

import { useEffect, useState } from "react";

interface AuditEvent {
  id: string;
  created_at: string;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  previous_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}

function diffSummary(
  prev: Record<string, unknown> | null,
  next: Record<string, unknown> | null,
): string {
  if (next && Object.keys(next).some((k) => !["id", "created_at"].includes(k))) {
    try {
      return JSON.stringify(next);
    } catch {
      return "";
    }
  }
  if (prev && Object.keys(prev).some((k) => !["id", "created_at"].includes(k))) {
    try {
      return JSON.stringify(prev);
    } catch {
      return "";
    }
  }
  return "";
}

export default function AuditHistory({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch(
      `/api/audit?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}&limit=50`,
      { cache: "no-store" },
    )
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((res) => {
        if (active) setEvents(res.data ?? []);
      })
      .catch(() => {
        if (active) setEvents([]);
      });
    return () => {
      active = false;
    };
  }, [entityType, entityId]);

  return (
    <div>
      <div className="border-t border-gray-200">
        {events === null ? (
          <p className="px-4 py-5 text-sm text-gray-500">Loading history...</p>
        ) : events.length === 0 ? (
          <p className="px-4 py-5 text-sm text-gray-500">
            No activity recorded for this record yet.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {events.map((event) => (
              <li key={event.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                    {event.action}
                  </span>
                  <span className="text-sm text-gray-900">
                    {event.actor_email || "System"}
                  </span>
                  <span className="ml-auto text-xs text-gray-400">
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>
                {(() => {
                  const summary = diffSummary(event.previous_values, event.new_values);
                  return summary ? (
                    <p className="mt-1 truncate text-xs text-gray-500">
                      {summary}
                    </p>
                  ) : null;
                })()}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
