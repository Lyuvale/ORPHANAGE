/**
 * Audit Trail Types
 *
 * Provides the type definitions for the audit logging system.
 *
 * AUDIT ACTIONS:
 * All actions use a consistent vocabulary defined in AUDIT_ACTIONS.
 * Future modules extend this vocabulary by adding new entries.
 *
 * SECURITY:
 * - No passwords, tokens, or secrets may appear in audit records.
 * - previous_values / new_values must only contain business-relevant data.
 * - actor_user_id is always derived server-side from the authenticated session.
 */

// ─── Audit Actions ───────────────────────────────────────────────────────────

/**
 * Supported audit action vocabulary.
 *
 * Business actions:
 *   CREATE, UPDATE, DELETE, VIEW, EXPORT, DOWNLOAD, APPROVE, REJECT
 *
 * Security actions:
 *   LOGIN, LOGOUT, LOGIN_FAILED, ACCOUNT_DEACTIVATED, ACCOUNT_ACTIVATED,
 *   ROLE_CHANGED
 */
export const AUDIT_ACTIONS = {
  // Business operations
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  VIEW: "VIEW",
  EXPORT: "EXPORT",
  DOWNLOAD: "DOWNLOAD",
  APPROVE: "APPROVE",
  REJECT: "REJECT",

  // Security / account events
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  LOGIN_FAILED: "LOGIN_FAILED",
  ACCOUNT_DEACTIVATED: "ACCOUNT_DEACTIVATED",
  ACCOUNT_ACTIVATED: "ACCOUNT_ACTIVATED",
  ROLE_CHANGED: "ROLE_CHANGED",

  // Financial / payment events
  CONTRIBUTION_RECEIVED: "CONTRIBUTION_RECEIVED",
  SUBSCRIPTION_PAYMENT_RECEIVED: "SUBSCRIPTION_PAYMENT_RECEIVED",
  PAYMENT_REFUNDED: "PAYMENT_REFUNDED",

  // Platform administration events
  CENTRE_STATUS_CHANGED: "CENTRE_STATUS_CHANGED",
  CENTRE_CREATED: "CENTRE_CREATED",
  CENTRE_UPDATED: "CENTRE_UPDATED",
  PLATFORM_SETTINGS_UPDATED: "PLATFORM_SETTINGS_UPDATED",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export const ALL_AUDIT_ACTIONS: AuditAction[] = Object.values(AUDIT_ACTIONS);

/**
 * Categorise an action for filtering / reporting.
 */
export const AUDIT_ACTION_CATEGORIES = {
  BUSINESS: ["CREATE", "UPDATE", "DELETE", "VIEW", "EXPORT", "DOWNLOAD", "APPROVE", "REJECT"],
  SECURITY: ["LOGIN", "LOGOUT", "LOGIN_FAILED", "ACCOUNT_DEACTIVATED", "ACCOUNT_ACTIVATED", "ROLE_CHANGED"],
  FINANCE: [
    "CONTRIBUTION_RECEIVED",
    "SUBSCRIPTION_PAYMENT_RECEIVED",
    "PAYMENT_REFUNDED",
  ],
  PLATFORM: ["CENTRE_STATUS_CHANGED", "PLATFORM_SETTINGS_UPDATED"],
} as const;

// ─── Audit Log Record ────────────────────────────────────────────────────────

/**
 * Represents a single row in the audit_logs table.
 */
export interface AuditLog {
  id: string;
  centre_id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  previous_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ─── Audit Event Input ───────────────────────────────────────────────────────

/**
 * Input for creating an audit event.
 *
 * The audit service automatically fills:
 *   - centre_id  (from AppUserContext)
 *   - actor_user_id (from AppUserContext)
 *   - actor_email (from AppUserContext)
 *   - created_at (database DEFAULT now())
 *
 * The caller provides:
 *   - action (required)
 *   - entity_type (required)
 *   - entity_id (optional — may not exist yet for pre-create events)
 *   - previous_values (optional — for updates)
 *   - new_values (optional — for creates/updates)
 *   - metadata (optional — additional context)
 *   - ip_address (optional)
 *   - user_agent (optional)
 */
export interface AuditEventInput {
  action: AuditAction;
  entity_type: string;
  entity_id?: string | null;
  previous_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

/**
 * Sensitive fields that must NEVER appear in audit log values.
 */
export const SENSITIVE_FIELDS = [
  "password",
  "password_hash",
  "hashed_password",
  "token",
  "access_token",
  "refresh_token",
  "api_key",
  "secret",
  "service_role_key",
  "auth_user_id",
] as const;

/**
 * Strips sensitive fields from a data object before storing in audit logs.
 * Returns a shallow clone with sensitive keys removed.
 */
export function sanitizeForAudit(
  data: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!data) return null;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELDS.includes(key as (typeof SENSITIVE_FIELDS)[number])) {
      continue;
    }
    sanitized[key] = value;
  }
  return Object.keys(sanitized).length > 0 ? sanitized : null;
}
