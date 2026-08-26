-- =============================================================================
-- Migration: Roles & Permissions Foundation
-- Created: 2026-08-27
-- =============================================================================
-- This migration creates the authorization backbone:
--   roles              – reference table of operational centre roles
--   permissions        – reference table of granular permissions (module.action)
--   role_permissions   – maps roles → permissions
--   user_roles         – assigns a user to a role within a centre
--   role_history       – audit trail for role assignments
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Roles table (reference / seed data)
-- -----------------------------------------------------------------------------

CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_roles_name ON roles (name);

-- -----------------------------------------------------------------------------
-- 2. Permissions table (reference / seed data)
-- -----------------------------------------------------------------------------

CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module      TEXT NOT NULL,
  action      TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (module, action)
);

CREATE INDEX idx_permissions_module ON permissions (module);
CREATE INDEX idx_permissions_action ON permissions (action);

-- -----------------------------------------------------------------------------
-- 3. Role ↔ Permission mapping
-- -----------------------------------------------------------------------------

CREATE TABLE role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role_id ON role_permissions (role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions (permission_id);

-- -----------------------------------------------------------------------------
-- 4. User ↔ Role assignment (per centre)
-- -----------------------------------------------------------------------------

CREATE TABLE user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  centre_id  UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  UNIQUE (user_id, role_id, centre_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX idx_user_roles_centre_id ON user_roles (centre_id);
CREATE INDEX idx_user_roles_role_id ON user_roles (role_id);

-- -----------------------------------------------------------------------------
-- 5. Role history (audit trail)
-- -----------------------------------------------------------------------------

CREATE TABLE role_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  centre_id      UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  previous_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  new_role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  changed_by     UUID REFERENCES auth.users(id),
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason         TEXT
);

CREATE INDEX idx_role_history_user_id ON role_history (user_id);
CREATE INDEX idx_role_history_centre_id ON role_history (centre_id);

-- -----------------------------------------------------------------------------
-- 6. RLS policies
-- -----------------------------------------------------------------------------

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_history ENABLE ROW LEVEL SECURITY;

-- roles: all authenticated users can read (reference data)
CREATE POLICY "roles_select_authenticated"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

-- roles: writes are admin-only
CREATE POLICY "roles_insert_admin"
  ON roles FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "roles_update_admin"
  ON roles FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "roles_delete_admin"
  ON roles FOR DELETE TO service_role USING (true);

-- permissions: all authenticated users can read (reference data)
CREATE POLICY "permissions_select_authenticated"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

-- permissions: writes are admin-only
CREATE POLICY "permissions_insert_admin"
  ON permissions FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "permissions_update_admin"
  ON permissions FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "permissions_delete_admin"
  ON permissions FOR DELETE TO service_role USING (true);

-- role_permissions: all authenticated users can read (needed for authorization)
CREATE POLICY "role_permissions_select_authenticated"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- role_permissions: writes are admin-only
CREATE POLICY "role_permissions_insert_admin"
  ON role_permissions FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "role_permissions_delete_admin"
  ON role_permissions FOR DELETE TO service_role USING (true);

-- user_roles: users can read their own assignment
CREATE POLICY "user_roles_select_own"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
    )
  );

-- user_roles: users can read assignments in their centre (for team visibility)
CREATE POLICY "user_roles_select_centre"
  ON user_roles FOR SELECT
  TO authenticated
  USING (centre_id = auth.current_centre_id());

-- user_roles: writes are admin-only
CREATE POLICY "user_roles_insert_admin"
  ON user_roles FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "user_roles_update_admin"
  ON user_roles FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "user_roles_delete_admin"
  ON user_roles FOR DELETE TO service_role USING (true);

-- role_history: users can read their own history
CREATE POLICY "role_history_select_own"
  ON role_history FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
    )
  );

-- role_history: writes are admin-only
CREATE POLICY "role_history_insert_admin"
  ON role_history FOR INSERT TO service_role WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 7. Seed: Official Centre Roles (idempotent)
-- -----------------------------------------------------------------------------

INSERT INTO roles (name, description) VALUES
  ('CENTRE_MANAGER',       'Management access according to assigned authority.'),
  ('SOCIAL_WORKER',        'Case management, referrals, safeguarding, and child welfare.'),
  ('CAREGIVER',            'Daily care, assigned children, check-in/check-out, activities.'),
  ('RECORDS_OFFICER',      'Child records, documents, data quality, authorised imports/exports.'),
  ('ACCOUNTANT_BURSAR',    'Finance, donations, budget, expenses, procurement, financial reports.')
ON CONFLICT (name) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8. Seed: Permissions (idempotent)
-- -----------------------------------------------------------------------------

-- Children
INSERT INTO permissions (module, action, description) VALUES
  ('children',  'view',     'View children records within own centre'),
  ('children',  'create',   'Create new child records'),
  ('children',  'update',   'Update child records'),
  ('children',  'archive',  'Archive (soft-delete) child records')
ON CONFLICT (module, action) DO NOTHING;

-- Cases
INSERT INTO permissions (module, action, description) VALUES
  ('cases',     'view',     'View case files within own centre'),
  ('cases',     'create',   'Create new case files'),
  ('cases',     'update',   'Update case files')
ON CONFLICT (module, action) DO NOTHING;

-- Finance
INSERT INTO permissions (module, action, description) VALUES
  ('finance',   'view',     'View financial records within own centre'),
  ('finance',   'create',   'Create financial records (expenses, donations, etc.)'),
  ('finance',   'approve',  'Approve financial transactions')
ON CONFLICT (module, action) DO NOTHING;

-- Reports
INSERT INTO permissions (module, action, description) VALUES
  ('reports',   'view',     'View reports within own centre'),
  ('reports',   'export',   'Export reports from own centre')
ON CONFLICT (module, action) DO NOTHING;

-- Documents
INSERT INTO permissions (module, action, description) VALUES
  ('documents', 'view',     'View documents within own centre'),
  ('documents', 'upload',   'Upload documents for own centre'),
  ('documents', 'download', 'Download documents from own centre'),
  ('documents', 'delete',   'Delete documents within own centre')
ON CONFLICT (module, action) DO NOTHING;

-- Referrals
INSERT INTO permissions (module, action, description) VALUES
  ('referrals', 'view',     'View referrals within own centre'),
  ('referrals', 'create',   'Create new referrals'),
  ('referrals', 'update',   'Update referral records')
ON CONFLICT (module, action) DO NOTHING;

-- Safeguarding
INSERT INTO permissions (module, action, description) VALUES
  ('safeguarding', 'view',    'View safeguarding records within own centre'),
  ('safeguarding', 'create',  'Create safeguarding records'),
  ('safeguarding', 'update',  'Update safeguarding records')
ON CONFLICT (module, action) DO NOTHING;

-- Staff
INSERT INTO permissions (module, action, description) VALUES
  ('staff', 'view',          'View staff profiles within own centre'),
  ('staff', 'create',        'Add new staff profiles'),
  ('staff', 'update',        'Update staff profiles'),
  ('staff', 'assign_roles',  'Assign roles to staff within own centre')
ON CONFLICT (module, action) DO NOTHING;

-- Daily Care
INSERT INTO permissions (module, action, description) VALUES
  ('daily_care', 'view',       'View daily care records for assigned children'),
  ('daily_care', 'update',     'Update daily care records (meals, activities, observations)'),
  ('daily_care', 'check_in',   'Record child check-in'),
  ('daily_care', 'check_out',  'Record child check-out')
ON CONFLICT (module, action) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 9. Seed: Role → Permission mappings (idempotent via DO blocks)
-- -----------------------------------------------------------------------------

-- Helper: get role and permission IDs and insert mappings
DO $$
DECLARE
  v_centre_manager   UUID;
  v_social_worker    UUID;
  v_caregiver        UUID;
  v_records_officer  UUID;
  v_accountant       UUID;
BEGIN
  SELECT id INTO v_centre_manager   FROM roles WHERE name = 'CENTRE_MANAGER';
  SELECT id INTO v_social_worker    FROM roles WHERE name = 'SOCIAL_WORKER';
  SELECT id INTO v_caregiver        FROM roles WHERE name = 'CAREGIVER';
  SELECT id INTO v_records_officer  FROM roles WHERE name = 'RECORDS_OFFICER';
  SELECT id INTO v_accountant       FROM roles WHERE name = 'ACCOUNTANT_BURSAR';

  -- ========================================================================
  -- CENTRE_MANAGER
  -- ========================================================================
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_centre_manager, id FROM permissions WHERE (module, action) IN (
    ('children', 'view'), ('children', 'create'), ('children', 'update'), ('children', 'archive'),
    ('cases', 'view'), ('cases', 'create'), ('cases', 'update'),
    ('finance', 'view'), ('finance', 'approve'),
    ('reports', 'view'), ('reports', 'export'),
    ('documents', 'view'), ('documents', 'upload'), ('documents', 'download'),
    ('referrals', 'view'), ('referrals', 'create'), ('referrals', 'update'),
    ('safeguarding', 'view'), ('safeguarding', 'create'), ('safeguarding', 'update'),
    ('staff', 'view'), ('staff', 'create'), ('staff', 'update'), ('staff', 'assign_roles'),
    ('daily_care', 'view')
  )
  ON CONFLICT DO NOTHING;

  -- ========================================================================
  -- SOCIAL_WORKER
  -- ========================================================================
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_social_worker, id FROM permissions WHERE (module, action) IN (
    ('children', 'view'), ('children', 'create'), ('children', 'update'),
    ('cases', 'view'), ('cases', 'create'), ('cases', 'update'),
    ('referrals', 'view'), ('referrals', 'create'), ('referrals', 'update'),
    ('safeguarding', 'view'), ('safeguarding', 'create'), ('safeguarding', 'update'),
    ('documents', 'view'), ('documents', 'upload'), ('documents', 'download'),
    ('reports', 'view'),
    ('daily_care', 'view')
  )
  ON CONFLICT DO NOTHING;

  -- ========================================================================
  -- CAREGIVER
  -- ========================================================================
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_caregiver, id FROM permissions WHERE (module, action) IN (
    ('children', 'view'), ('children', 'update'),
    ('cases', 'view'),
    ('safeguarding', 'view'),
    ('daily_care', 'view'), ('daily_care', 'update'),
    ('daily_care', 'check_in'), ('daily_care', 'check_out')
  )
  ON CONFLICT DO NOTHING;

  -- ========================================================================
  -- RECORDS_OFFICER
  -- ========================================================================
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_records_officer, id FROM permissions WHERE (module, action) IN (
    ('children', 'view'), ('children', 'create'), ('children', 'update'), ('children', 'archive'),
    ('documents', 'view'), ('documents', 'upload'), ('documents', 'download'), ('documents', 'delete'),
    ('reports', 'view'), ('reports', 'export')
  )
  ON CONFLICT DO NOTHING;

  -- ========================================================================
  -- ACCOUNTANT_BURSAR
  -- ========================================================================
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_accountant, id FROM permissions WHERE (module, action) IN (
    ('finance', 'view'), ('finance', 'create'), ('finance', 'approve'),
    ('reports', 'view'), ('reports', 'export'),
    ('children', 'view')
  )
  ON CONFLICT DO NOTHING;

END $$;
