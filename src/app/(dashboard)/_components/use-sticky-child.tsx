"use client";

import { useEffect, useState } from "react";

const KEY = "lastChildId";

/**
 * Sticky child context: once a user opens a child profile (or picks a child
 * anywhere), every child selector across modules defaults to that child
 * instead of asking to select again. Scoped per browser; the server still
 * enforces centre + assignment access on every request.
 */
export function useStickyChild(
  explicitId: string,
  options: { id: string }[],
): readonly [string, (id: string) => void] {
  const [childId, setChildId] = useState(explicitId);

  // Adopt the remembered child once options load (only when nothing chosen).
  useEffect(() => {
    if (childId || options.length === 0) return;
    try {
      const last = window.localStorage.getItem(KEY) ?? "";
      if (last && options.some((o) => o.id === last)) setChildId(last);
    } catch {
      /* ignore */
    }
  }, [childId, options]);

  function set(id: string) {
    setChildId(id);
    try {
      if (id) window.localStorage.setItem(KEY, id);
    } catch {
      /* ignore */
    }
  }

  return [childId, set] as const;
}

/** Render on the child profile so the child becomes the sticky context. */
export function RememberChild({ id }: { id: string }) {
  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, id);
    } catch {
      /* ignore */
    }
  }, [id]);
  return null;
}
