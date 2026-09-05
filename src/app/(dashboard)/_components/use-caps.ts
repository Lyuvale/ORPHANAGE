"use client";

import { useEffect, useState } from "react";

/**
 * The caller's own permission strings (visibility decisions only).
 * Every action endpoint enforces the same permission again server-side.
 */
export function useCaps(): string[] {
  const [caps, setCaps] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { permissions: [] }))
      .then((j) => setCaps(Array.isArray(j.permissions) ? j.permissions : []))
      .catch(() => setCaps([]));
  }, []);
  return caps;
}
