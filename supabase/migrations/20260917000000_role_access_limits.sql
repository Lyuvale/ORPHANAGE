-- -----------------------------------------------------------------------------
-- Role responsibilities & access limits (idempotent alignment).
--
-- Implements the platform access specification:
--   - CAREGIVER: record daily care (+daily_care.create); MUST NOT see
--     confidential cases, restricted safeguarding records, or the staff list.
--     (Child data itself is assignment-scoped at the application layer:
--     same centre AND actively assigned.)
--   - RECORDS_OFFICER: the official registrar — full intake chain
--     (referrals.view/create, admissions.create); user management
--     (staff.create/update) is the Centre Manager's exclusive duty.
-- -----------------------------------------------------------------------------

-- Ensure the permission catalogue rows exist.
INSERT INTO permissions (module, action, description) VALUES
  ('daily_care', 'create', 'Record daily care entries'),
  ('referrals',  'view',   'View referrals'),
  ('referrals',  'create', 'Create referrals'),
  ('admissions', 'create', 'Create admissions')
ON CONFLICT (module, action) DO NOTHING;

-- CAREGIVER: grant daily care recording.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  CROSS JOIN permissions p
 WHERE r.name = 'CAREGIVER'
   AND p.module = 'daily_care' AND p.action = 'create'
ON CONFLICT DO NOTHING;

-- CAREGIVER: revoke confidential cases, restricted safeguarding, staff list.
DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.name = 'CAREGIVER'
  AND (p.module, p.action) IN (
    ('cases', 'view'),
    ('safeguarding', 'view'),
    ('staff', 'view')
  );

-- RECORDS_OFFICER: full registrar (referrals + admissions creation).
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  CROSS JOIN permissions p
 WHERE r.name = 'RECORDS_OFFICER'
   AND (p.module, p.action) IN (
     ('referrals', 'view'),
     ('referrals', 'create'),
     ('admissions', 'create')
   )
ON CONFLICT DO NOTHING;

-- RECORDS_OFFICER: user management belongs to the Centre Manager only.
DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.name = 'RECORDS_OFFICER'
  AND (p.module, p.action) IN (
    ('staff', 'create'),
    ('staff', 'update')
  );

-- CENTRE_MANAGER: not involved in registration — intake creation belongs to
-- the Social Worker and the Records Officer (official registrar). The manager
-- keeps view/update/review/approve rights for oversight.
DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.name = 'CENTRE_MANAGER'
  AND (p.module, p.action) IN (
    ('children', 'create'),
    ('referrals', 'create'),
    ('admissions', 'create'),
    ('placements', 'create'),
    ('guardians', 'create')
  );
