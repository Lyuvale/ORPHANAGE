/**
 * Pure helpers for the Audit Trail API.
 *
 * Kept free of Supabase/Next dependencies so they can be unit-tested directly
 * without network or request mocking.
 */
import type { AuditAction, AuditLog } from "@/types/audit";
import { ALL_AUDIT_ACTIONS } from "@/types/audit";

export const AUDIT_MAX_LIMIT = 100;

export interface AuditFilters {
  from?: string;
  to?: string;
  action?: AuditAction;
  entity_type?: string;
  actor_email?: string;
  entity_id?: string;
  limit: number;
  offset: number;
  exportMode: boolean;
}

/**
 * Read the raw query-string values and coerce them into validated audit
 * filters. Unknown/bogus actions are ignored (act as "all").
 */
export function buildAuditFilters(params: {
  from?: string | null;
  to?: string | null;
  action?: string | null;
  entity_type?: string | null;
  actor_email?: string | null;
  entity_id?: string | null;
  limit?: string | null;
  offset?: string | null;
  export?: string | null;
}): AuditFilters {
  let action: AuditAction | undefined;
  if (params.action && (ALL_AUDIT_ACTIONS as string[]).includes(params.action)) {
    action = params.action as AuditAction;
  }

  const rawLimit = parseInt(params.limit ?? "50", 10);
  const rawOffset = parseInt(params.offset ?? "0", 10);

  return {
    from: params.from || undefined,
    to: params.to || undefined,
    action,
    entity_type: params.entity_type || undefined,
    actor_email: params.actor_email || undefined,
    entity_id: params.entity_id || undefined,
    limit: Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1), AUDIT_MAX_LIMIT),
    offset: Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0),
    exportMode: params.export === "csv",
  };
}

/**
 * Serialise a list of audit rows into a CSV string.
 */
export function auditToCsv(rows: AuditLog[]): string {
  const header = [
    "created_at",
    "actor_email",
    "action",
    "entity_type",
    "entity_id",
    "previous_values",
    "new_values",
    "metadata",
    "ip_address",
  ];
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = rows.map((r) =>
    [
      escape(r.created_at),
      escape(r.actor_email),
      escape(r.action),
      escape(r.entity_type),
      escape(r.entity_id),
      escape(r.previous_values ? JSON.stringify(r.previous_values) : ""),
      escape(r.new_values ? JSON.stringify(r.new_values) : ""),
      escape(r.metadata ? JSON.stringify(r.metadata) : ""),
      escape(r.ip_address),
    ].join(","),
  );
  return [header.join(","), ...lines].join("\n");
}
