-- =============================================================================
-- Migration: Centres Access (platform management)
-- Created: 2026-09-10
-- =============================================================================
-- Grants DB-level *permissions* for platform centre management.
--
-- PRINCIPLES:
--   - centres.view  : view / list centres (platform directory)
--   - centres.manage: create, update and deactivate centres (platform admin)
--
-- Centre management is treated as a privileged, platform-level operation,
-- separate from normal per-centre staff roles. Only CENTRE_MANAGER holds these
-- permissions; the application layer additionally enforces the CENTRE_MANAGER
-- role check on all mutations so ordinary staff cannot alter platform structure.
--
-- Authorization is enforced at the application layer (requireAppAccess +
-- requirePermission + CENTRE_MANAGER role) AND as defence-in-depth at the
-- database layer (the centres table RLS only allows reads of one's own centre,
-- and writes via the service-role client).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Seed: Centres permissions (idempotent)
-- -----------------------------------------------------------------------------
INSERT INTO permissions (module, action, description) VALUES
  ('centres', 'view',   'View / list centres (platform directory)'),
  ('centres', 'manage', 'Create, update and deactivate centres (platform admin)')
ON CONFLICT (module, action) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Grant centres access to CENTRE_MANAGER
-- =============================================================================
DO $$
DECLARE
  v_centre_manager UUID;
BEGIN
  SELECT id INTO v_centre_manager FROM roles WHERE name = 'CENTRE_MANAGER';

  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_centre_manager, id FROM permissions
  WHERE (module, action) IN (('centres', 'view'), ('centres', 'manage'))
  ON CONFLICT DO NOTHING;
END $$;
