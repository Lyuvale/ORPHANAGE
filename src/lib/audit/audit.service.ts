/**
 * Audit Service
 *
 * Provides a reusable, server-side audit logging mechanism.
 *
 * SECURITY MODEL:
 * - All audit records are written via the service-role client (bypasses RLS).
 * - actor_user_id and centre_id are derived from AppUserContext (server-side only).
 * - Sensitive fields (passwords, tokens, keys) are automatically stripped.
 * - Audit records are append-only: normal users cannot update or delete them.
 *
 * USAGE:
 *   const ctx = await requireAppAccess(supabase);
 *   await recordAuditEvent(adminSupabase, ctx, {
 *     action: "CREATE",
 *     entity_type: "child",
 *     entity_id: child.id,
 *     new_values: { first_name: "Amina", date_of_birth: "2019-03-15" },
 *   });
 *
 * For security events without a user context (e.g. login):
 *   await recordAuditEvent(adminSupabase, null, {
 *     action: "LOGIN",
 *     entity_type: "session",
 *     centre_id: centreId,
 *     actor_user_id: userId,
 *     actor_email: email,
 *   });
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppUserContext } from "@/lib/auth/app-user-context";
import type { AuditEventInput } from "@/types/audit";
import { sanitizeForAudit } from "@/types/audit";

/**
 * Extended input for security events that may not have a full AppUserContext.
 * Used for events like LOGIN, LOGOUT, LOGIN_FAILED where the user may not
 * have a profile yet or the context may not be fully established.
 */
export interface SecurityAuditEventInput extends AuditEventInput {
  /** Override centre_id for events without AppUserContext. */
  centre_id?: string;
  /** Override actor_user_id for events without AppUserContext. */
  actor_user_id?: string;
  /** Override actor_email for events without AppUserContext. */
  actor_email?: string;
}

/**
 * Record an audit event.
 *
 * This is the primary entry point for all audit logging.
 * It automatically derives actor and centre from the provided context.
 *
 * @param adminSupabase - A Supabase client using the service_role key (bypasses RLS).
 * @param ctx - The AppUserContext, or null for unauthenticated security events.
 * @param input - The audit event details.
 */
export async function recordAuditEvent(
  adminSupabase: SupabaseClient,
  ctx: AppUserContext | null,
  input: AuditEventInput,
): Promise<void> {
  // Derive actor information from context (or overrides for security events)
  const securityInput = input as SecurityAuditEventInput;
  const actorUserId = ctx?.authUserId ?? securityInput.actor_user_id ?? null;
  const actorEmail =
    ctx?.profile.email ?? securityInput.actor_email ?? null;
  const centreId = ctx?.centre.id ?? securityInput.centre_id;

  if (!centreId) {
    throw new Error(
      "Audit error: centre_id is required. Provide an AppUserContext or set centre_id explicitly.",
    );
  }

  // Sanitize sensitive data from previous/new values
  const sanitizedPrevious = sanitizeForAudit(
    input.previous_values as Record<string, unknown> | undefined,
  );
  const sanitizedNew = sanitizeForAudit(
    input.new_values as Record<string, unknown> | undefined,
  );

  // Insert the audit record via service_role (bypasses RLS)
  const { error } = await adminSupabase.from("audit_logs").insert({
    centre_id: centreId,
    actor_user_id: actorUserId,
    actor_email: actorEmail,
    action: input.action,
    entity_type: input.entity_type,
    entity_id: input.entity_id ?? null,
    previous_values: sanitizedPrevious,
    new_values: sanitizedNew,
    metadata: input.metadata ?? null,
    ip_address: input.ip_address ?? null,
    user_agent: input.user_agent ?? null,
  });

  if (error) {
    // Audit failures should be logged but NOT block the main operation.
    // In production, this would go to a monitoring service.
    console.error("[AUDIT] Failed to record audit event:", error.message);
  }
}

/**
 * Convenience function to record a CREATE audit event.
 */
export async function auditCreate(
  adminSupabase: SupabaseClient,
  ctx: AppUserContext,
  entityType: string,
  entityId: string,
  newValues: Record<string, unknown>,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await recordAuditEvent(adminSupabase, ctx, {
    action: "CREATE",
    entity_type: entityType,
    entity_id: entityId,
    new_values: newValues,
    metadata,
  });
}

/**
 * Convenience function to record an UPDATE audit event.
 */
export async function auditUpdate(
  adminSupabase: SupabaseClient,
  ctx: AppUserContext,
  entityType: string,
  entityId: string,
  previousValues: Record<string, unknown>,
  newValues: Record<string, unknown>,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await recordAuditEvent(adminSupabase, ctx, {
    action: "UPDATE",
    entity_type: entityType,
    entity_id: entityId,
    previous_values: previousValues,
    new_values: newValues,
    metadata,
  });
}

/**
 * Convenience function to record a DELETE audit event.
 */
export async function auditDelete(
  adminSupabase: SupabaseClient,
  ctx: AppUserContext,
  entityType: string,
  entityId: string,
  previousValues: Record<string, unknown>,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await recordAuditEvent(adminSupabase, ctx, {
    action: "DELETE",
    entity_type: entityType,
    entity_id: entityId,
    previous_values: previousValues,
    metadata,
  });
}

/**
 * Convenience function to record a security event (LOGIN, LOGOUT, etc.).
 */
export async function auditSecurityEvent(
  adminSupabase: SupabaseClient,
  input: SecurityAuditEventInput,
): Promise<void> {
  await recordAuditEvent(adminSupabase, null, input);
}
