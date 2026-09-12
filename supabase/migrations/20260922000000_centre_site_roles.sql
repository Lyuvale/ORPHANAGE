-- -----------------------------------------------------------------------------
-- Centre IT Officer role + centre website permissions.
--
-- The CENTRE_IT (IT Officer) is a centre-level role responsible for building
-- and maintaining the centre's own public website: pages and appearance.
-- Site management is scoped to the officer's own centre (enforced at the
-- application layer like every other module).
-- -----------------------------------------------------------------------------

-- Role seed (idempotent).
INSERT INTO roles (name, description) VALUES
  ('CENTRE_IT', 'Site administrator: builds and maintains the centre website (pages and appearance).')
ON CONFLICT (name) DO NOTHING;

-- Permission catalogue rows (idempotent).
INSERT INTO permissions (module, action, description) VALUES
  ('site', 'view',          'View the centre website (settings, pages, appearance)'),
  ('site', 'pages.manage',  'Create, edit, publish and delete centre website pages'),
  ('site', 'theme.manage',  'Edit the centre website appearance (colours, fonts, logo, footer)')
ON CONFLICT (module, action) DO NOTHING;

-- CENTRE_IT: full website management.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  CROSS JOIN permissions p
 WHERE r.name = 'CENTRE_IT'
   AND (p.module, p.action) IN (
     ('site', 'view'),
     ('site', 'pages.manage'),
     ('site', 'theme.manage')
   )
ON CONFLICT DO NOTHING;

-- CENTRE_MANAGER: oversight — can view the website but not edit it.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  CROSS JOIN permissions p
 WHERE r.name = 'CENTRE_MANAGER'
   AND p.module = 'site' AND p.action = 'view'
ON CONFLICT DO NOTHING;