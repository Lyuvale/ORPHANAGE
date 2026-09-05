-- -----------------------------------------------------------------------------
-- Correct role-feature ownership (idempotent alignment).
--
-- RIGHT ROLE -> RIGHT FEATURE -> RIGHT PERMISSION:
--   - Referral + assessment ownership: SOCIAL WORKER submits
--     (referrals.create, cases.assessments.create, admissions.create);
--     the CENTRE MANAGER reviews/approves and never routinely creates.
--   - Admission review/approval: CENTRE MANAGER only (a social worker must
--     not approve their own recommendation).
--   - Official child registration: RECORDS OFFICER, AFTER admission approval
--     (children/guardians/placements create+update+maintain). Records does
--     not create referrals or admissions; it works from approved ones.
--   - Placement: SOCIAL WORKER recommends (create), CENTRE MANAGER reviews
--     (update), RECORDS OFFICER records + maintains history.
--   - Education is child-centred tracking (no school management features
--     exist): RECORDS OFFICER manages; SOCIAL WORKER and CENTRE MANAGER
--     view/monitor only; CAREGIVER views relevant info for assigned children.
--   - Resources/finance: ACCOUNTANT creates/manages; CENTRE MANAGER (or
--     authorised approver) reviews/approves but never routinely creates.
--     Self-approval stays blocked at the endpoint.
-- -----------------------------------------------------------------------------

-- CENTRE_MANAGER: review/approve/monitor only — no child-record edits,
-- no routine referral/assessment creation, no education or resource
-- creation/management.
DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.name = 'CENTRE_MANAGER'
  AND (p.module, p.action) IN (
    ('children', 'update'),
    ('children', 'status.update'),
    ('children', 'archive'),
    ('cases', 'assessments.create'),
    ('cases', 'assessments.update'),
    ('education_development', 'education.manage'),
    ('education_development', 'support_needs.manage'),
    ('education_development', 'goals.manage'),
    ('education_development', 'progress.manage'),
    ('education_development', 'achievements.manage'),
    ('resources', 'manage'),
    ('resources', 'assets.manage'),
    ('resources', 'assets.costs'),
    ('resources', 'assets.status'),
    ('resources', 'assets.dispose'),
    ('resources', 'documents.upload')
  );

-- SOCIAL_WORKER: submit + recommend, never approve own work; view/follow-up
-- education without managing it; no official registration ownership.
-- No resources module at all (finance/resource work is not welfare work).
DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.name = 'SOCIAL_WORKER'
  AND (p.module IN ('resources') OR (p.module, p.action) IN (
    ('admissions', 'review'),
    ('children', 'create'),
    ('children', 'update'),
    ('children', 'status.update'),
    ('placements', 'update'),
    ('education_development', 'education.manage'),
    ('education_development', 'support_needs.manage'),
    ('education_development', 'goals.manage'),
    ('education_development', 'progress.manage'),
    ('education_development', 'achievements.manage')
  ));

-- RECORDS_OFFICER: registers AFTER admission approval — sees approved
-- referrals/admissions but creates neither; owns child/guardian/placement
-- records (already granted; kept).
DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.name = 'RECORDS_OFFICER'
  AND (p.module, p.action) IN (
    ('referrals', 'create'),
    ('admissions', 'create')
  );
