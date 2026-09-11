/**
 * Parse a money/quantity string typed by a user.
 *
 * Accepts thousands separators and spaces ("1,000,000", "1 000 000", "250000")
 * which `Number()` alone would turn into NaN (and then fail server
 * validation with a generic "Validation failed" message).
 */
export function parseMoneyInput(
  raw: string,
): { ok: true; value: number } | { ok: false; error: string } {
  const cleaned = raw.replace(/[\s,]/g, "");
  if (!cleaned) return { ok: false, error: "Amount is required." };
  const n = Number(cleaned);
  if (!Number.isFinite(n)) {
    return { ok: false, error: "Amount must be a number, e.g. 150000." };
  }
  if (n < 0) return { ok: false, error: "Amount cannot be negative." };
  return { ok: true, value: Math.round(n * 100) / 100 };
}

/** Turn a zod error (flattened or field map) into a readable one-line message. */
export function formatValidationDetails(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const obj = details as Record<string, unknown>;
  // Zod .flatten() shape: { formErrors: string[], fieldErrors: { f: string[] } }
  const target =
    obj.fieldErrors && typeof obj.fieldErrors === "object"
      ? (obj.fieldErrors as Record<string, unknown>)
      : obj;
  const parts: string[] = [];
  if (Array.isArray(obj.formErrors) && obj.formErrors.length > 0) {
    parts.push((obj.formErrors as string[]).join(", "));
  }
  for (const [k, v] of Object.entries(target)) {
    if (k === "formErrors" || k === "fieldErrors") continue;
    const msgs = Array.isArray(v) ? v.join(", ") : String(v);
    parts.push(`${k}: ${msgs}`);
  }
  return parts.length > 0 ? parts.join("; ") : null;
}
