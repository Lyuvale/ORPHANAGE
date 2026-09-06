-- -----------------------------------------------------------------------------
-- Submit/review separation + caregiver assignment duty (idempotent).
--
--   - SOCIAL_WORKER submits (referrals/visits create) for CENTRE MANAGER
--     review; a social worker never approves/rejects their own submissions.
--   - SOCIAL_WORKER shares the caregiver-assignment duty with the manager
--     (staff.assignments.manage only — user-role assignment stays
--     manager-only via staff.assign_roles).
--   - An approved admission notifies the RECORDS_OFFICER (application layer)
--     to register the child and arrange placement.
-- -----------------------------------------------------------------------------

-- SOCIAL_WORKER: submit referrals for manager review (visits stay approvable
-- by the social worker who manages family contact); never decide referrals.
DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.name = 'SOCIAL_WORKER'
  AND (p.module, p.action) IN (
    ('referrals', 'review'),
    ('referrals', 'approve'),
    ('referrals', 'reject'),
    ('visits', 'reject')
  );

-- SOCIAL_WORKER: may assign children to caregivers.
INSERT INTO permissions (module, action, description) VALUES
  ('staff', 'assignments.manage', 'Assign children to caregivers and end assignments')
ON CONFLICT (module, action) DO NOTHING;

-- Notification vocabulary for the approval handoff (manager approval ->
-- records officer registration).
ALTER TYPE notification_event ADD VALUE IF NOT EXISTS 'ADMISSION_APPROVED';
ALTER TYPE notification_entity ADD VALUE IF NOT EXISTS 'ADMISSION';

-- Delete authority is manager-only: archiving a child record moves to the
-- manager (removed from records, which keeps status updates for maintenance).
INSERT INTO permissions (module, action, description) VALUES
  ('children', 'archive', 'Archive (deactivate) a child record')
ON CONFLICT (module, action) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  CROSS JOIN permissions p
 WHERE r.name = 'CENTRE_MANAGER'
   AND p.module = 'children' AND p.action = 'archive'
ON CONFLICT DO NOTHING;

DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.name = 'RECORDS_OFFICER'
  AND (p.module, p.action) IN (('children', 'archive'));

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  CROSS JOIN permissions p
 WHERE r.name = 'SOCIAL_WORKER'
   AND p.module = 'staff' AND p.action = 'assignments.manage'
ON CONFLICT DO NOTHING;
