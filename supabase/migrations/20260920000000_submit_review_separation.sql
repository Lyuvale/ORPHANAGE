-- -----------------------------------------------------------------------------
-- Submit/review separation + caregiver assignment duty (idempotent).
--
--   - SOCIAL_WORKER submits referrals/admissions for CENTRE MANAGER
--     review; a social worker never decides referrals (visit approval stays
--     with the social worker managing family contact).
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
ALTER TYPE notification_event ADD VALUE IF NOT EXISTS 'REFERRAL_SUBMITTED';
ALTER TYPE notification_event ADD VALUE IF NOT EXISTS 'ADMISSION_SUBMITTED';
ALTER TYPE notification_entity ADD VALUE IF NOT EXISTS 'REFERRAL';

-- RECORDS_OFFICER: links guardians during official registration (otherwise
-- created guardians stay orphaned and invisible — the standalone guardians
-- list was removed, so the child hub link form is the way back).
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  CROSS JOIN permissions p
 WHERE r.name = 'RECORDS_OFFICER'
   AND p.module = 'guardians' AND p.action = 'relationship.manage'
ON CONFLICT DO NOTHING;

-- Delete authority is manager-only: archiving a child record moves to the
-- manager (removed from records, which keeps status updates for maintenance).
-- Medication administration stays caregiver-only (daily care duty).
DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.name = 'RECORDS_OFFICER'
  AND (p.module, p.action) IN (('health', 'medications.administer'));
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

-- Case ownership: SOCIAL WORKER caseworks; CENTRE MANAGER reviews + closes.
DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.name = 'CENTRE_MANAGER'
  AND (p.module, p.action) IN (
    ('cases', 'create'),
    ('cases', 'update'),
    ('cases', 'status.update'),
    ('cases', 'plans.create'),
    ('cases', 'plans.update'),
    ('cases', 'notes.create'),
    ('cases', 'interventions.create'),
    ('cases', 'interventions.update'),
    ('cases', 'documents.upload'),
    ('cases', 'documents.delete')
  );

-- Safeguarding ownership: SOCIAL WORKER records/follows/escalates;
-- CENTRE MANAGER monitors and resolves escalations.
DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.name = 'CENTRE_MANAGER'
  AND (p.module, p.action) IN (
    ('safeguarding', 'create'),
    ('safeguarding', 'update'),
    ('safeguarding', 'status.update'),
    ('safeguarding', 'escalate'),
    ('safeguarding', 'actions.create'),
    ('safeguarding', 'actions.update'),
    ('safeguarding', 'documents.upload'),
    ('safeguarding', 'documents.delete')
  );

-- Health records ownership: RECORDS OFFICER manages official records;
-- CENTRE MANAGER and SOCIAL WORKER view/monitor; CAREGIVER uses emergency
-- info + administers medication during daily care.
DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.name IN ('CENTRE_MANAGER', 'SOCIAL_WORKER')
  AND (p.module, p.action) IN (
    ('health', 'create'),
    ('health', 'update'),
    ('health', 'medical_records.create'),
    ('health', 'medical_records.update'),
    ('health', 'medications.manage'),
    ('health', 'medications.administer'),
    ('health', 'appointments.manage'),
    ('health', 'screenings.manage'),
    ('health', 'immunizations.manage'),
    ('health', 'documents.upload')
  );

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  CROSS JOIN permissions p
 WHERE r.name = 'SOCIAL_WORKER'
   AND p.module = 'staff' AND p.action = 'assignments.manage'
ON CONFLICT DO NOTHING;
