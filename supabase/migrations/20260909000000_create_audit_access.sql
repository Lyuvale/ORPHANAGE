-- =============================================================================
-- Migration: Audit Trail Access
-- Created: 2026-09-09
-- =============================================================================
-- Grants authorised roles the ability to view and export the system-wide
-- audit trail. Reading is handled at the RLS layer (audit_logs_select_centre
-- already scopes reads to the caller's centre). This migration only adds the
-- application-level *permission* gates so the UI can choose to show (or hide)
-- the Audit Trail view and its export control.
--
-- PRINCIPLES:
--   - audit.view   : view the centre's audit trail (page + record history)
--   - audit.export : export the centre's audit trail
--   - Scope is always the caller's own centre (enforced by RLS + requirePermission).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Seed: Audit permissions (idempotent)
-- -----------------------------------------------------------------------------
INSERT INTO permissions (module, action, description) VALUES
  ('audit', 'view',   'View the audit trail within own centre'),
  ('audit', 'export', 'Export the audit trail from own centre')
ON CONFLICT (module, action) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Grant audit access to authorised roles
--    - CENTRE_MANAGER : full accountability oversight of the centre
--    - RECORDS_OFFICER: records / data quality owner and authorised exporter
-- =============================================================================
DO $$
DECLARE
  v_centre_manager   UUID;
  v_records_officer  UUID;
BEGIN
  SELECT id INTO v_centre_manager  FROM roles WHERE name = 'CENTRE_MANAGER';
  SELECT id INTO v_records_officer FROM roles WHERE name = 'RECORDS_OFFICER';

  -- CENTRE_MANAGER
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_centre_manager, id FROM permissions
  WHERE (module, action) IN (('audit', 'view'), ('audit', 'export'))
  ON CONFLICT DO NOTHING;

  -- RECORDS_OFFICER
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_records_officer, id FROM permissions
  WHERE (module, action) IN (('audit', 'view'), ('audit', 'export'))
  ON CONFLICT DO NOTHING;

END $$;
