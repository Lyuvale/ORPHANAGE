-- =============================================================================
-- Migration: Audit Trail & Security Foundation
-- Created: 2026-08-27
-- =============================================================================
-- This migration creates the audit logging infrastructure:
--   audit_logs – append-only record of meaningful business & security events
--
-- PRINCIPLES:
--   - Centre-scoped: every record has centre_id for tenant isolation
--   - Actor-identified: actor_user_id derived server-side, never from client
--   - Append-only: normal users cannot update or delete audit records
--   - No sensitive data in columns: authentication artefacts are never stored
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Audit log table
-- -----------------------------------------------------------------------------

CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id       UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  actor_user_id   UUID REFERENCES auth.users(id),
  actor_email     TEXT,
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  previous_values JSONB,
  new_values      JSONB,
  metadata        JSONB,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 2. Indexes for common audit queries
-- -----------------------------------------------------------------------------

CREATE INDEX idx_audit_logs_centre_id ON audit_logs (centre_id);
CREATE INDEX idx_audit_logs_actor_user_id ON audit_logs (actor_user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs (entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs (entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs (action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);
CREATE INDEX idx_audit_logs_centre_created ON audit_logs (centre_id, created_at DESC);

-- Composite index for the most common query pattern:
-- "show me recent audit events for this entity in this centre"
CREATE INDEX idx_audit_logs_entity_centre ON audit_logs (entity_type, entity_id, centre_id);

-- -----------------------------------------------------------------------------
-- 3. Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Centre users can read audit records belonging to their centre
CREATE POLICY "audit_logs_select_centre"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (centre_id = public.current_centre_id());

-- ALL writes are admin-only (service_role).
-- Normal users must never be able to insert, update, or delete audit records.
-- Audit records are generated exclusively by trusted server-side logic
-- using the service-role client, which bypasses RLS.
CREATE POLICY "audit_logs_insert_admin"
  ON audit_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "audit_logs_update_admin"
  ON audit_logs FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (false);

CREATE POLICY "audit_logs_delete_admin"
  ON audit_logs FOR DELETE
  TO service_role
  USING (false);

-- -----------------------------------------------------------------------------
-- 4. Prevent authenticated users from writing audit records
-- Even with the admin-only policies above, explicitly deny authenticated writes
-- as defense in depth.

CREATE POLICY "audit_logs_deny_authenticated_insert"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "audit_logs_deny_authenticated_update"
  ON audit_logs FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "audit_logs_deny_authenticated_delete"
  ON audit_logs FOR DELETE
  TO authenticated
  USING (false);
