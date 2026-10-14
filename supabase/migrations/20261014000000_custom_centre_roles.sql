-- ============================================================================
-- Custom Centre Roles — Centre managers can create their own roles
-- ============================================================================

-- 1) Add centre_id to roles (NULL = system role, set = custom centre role)
ALTER TABLE roles ADD COLUMN IF NOT EXISTS centre_id UUID REFERENCES centres(id) ON DELETE CASCADE;

-- Custom roles must have a centre; system roles must not
ALTER TABLE roles ADD CONSTRAINT roles_centre_check
  CHECK ((is_system = true AND centre_id IS NULL) OR (is_system = false AND centre_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_roles_centre_id ON roles(centre_id) WHERE centre_id IS NOT NULL;

-- 2) New permissions for role management
INSERT INTO permissions (module, action, description) VALUES
  ('roles', 'view', 'View roles within own centre'),
  ('roles', 'create', 'Create custom roles within own centre'),
  ('roles', 'update', 'Update custom roles within own centre'),
  ('roles', 'delete', 'Delete custom roles within own centre')
ON CONFLICT (module, action) DO NOTHING;

-- 3) Grant role management to CENTRE_MANAGER and PLATFORM_ADMINISTRATOR
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'CENTRE_MANAGER'
  AND p.module = 'roles' AND p.action IN ('view', 'create', 'update', 'delete')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'PLATFORM_ADMINISTRATOR'
  AND p.module = 'roles' AND p.action IN ('view', 'create', 'update', 'delete')
ON CONFLICT DO NOTHING;

-- 4) Update RLS for roles table to allow centre-scoped access
DROP POLICY IF EXISTS roles_select_authenticated ON roles;
CREATE POLICY roles_select_authenticated ON roles
  FOR SELECT TO authenticated
  USING (
    is_system = true
    OR centre_id IN (SELECT centre_id FROM user_roles WHERE user_id = auth.uid() AND status = 'active')
  );

-- Only CENTRE_MANAGER and PLATFORM_ADMINISTRATOR can insert custom roles
DROP POLICY IF EXISTS roles_insert_centre ON roles;
CREATE POLICY roles_insert_centre ON roles
  FOR INSERT TO authenticated
  WITH CHECK (
    is_system = false
    AND centre_id IN (SELECT centre_id FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND ur.status = 'active' AND r.name IN ('CENTRE_MANAGER', 'PLATFORM_ADMINISTRATOR'))
  );

-- Only CENTRE_MANAGER and PLATFORM_ADMINISTRATOR can update/delete custom roles
DROP POLICY IF EXISTS roles_update_centre ON roles;
CREATE POLICY roles_update_centre ON roles
  FOR UPDATE TO authenticated
  USING (
    is_system = false
    AND centre_id IN (SELECT centre_id FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND ur.status = 'active' AND r.name IN ('CENTRE_MANAGER', 'PLATFORM_ADMINISTRATOR'))
  );

DROP POLICY IF EXISTS roles_delete_centre ON roles;
CREATE POLICY roles_delete_centre ON roles
  FOR DELETE TO authenticated
  USING (
    is_system = false
    AND centre_id IN (SELECT centre_id FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND ur.status = 'active' AND r.name IN ('CENTRE_MANAGER', 'PLATFORM_ADMINISTRATOR'))
  );

-- 5) Allow centre-scoped role_permissions writes
DROP POLICY IF EXISTS role_permissions_insert_centre ON role_permissions;
CREATE POLICY role_permissions_insert_centre ON role_permissions
  FOR INSERT TO authenticated
  WITH CHECK (
    role_id IN (SELECT id FROM roles WHERE is_system = false AND centre_id IS NOT NULL)
  );

DROP POLICY IF EXISTS role_permissions_delete_centre ON role_permissions;
CREATE POLICY role_permissions_delete_centre ON role_permissions
  FOR DELETE TO authenticated
  USING (
    role_id IN (SELECT id FROM roles WHERE is_system = false AND centre_id IS NOT NULL)
  );
