-- =============================================================================
-- Migration: Centre Need Contributions — manual verification workflow
-- Created: 2026-11-12
-- =============================================================================
-- Contributors can now submit a transfer (bank / M-Pesa) through the public
-- centre website. Those submissions are recorded as PENDING contributions and
-- only increase a need's progress AFTER the accountant verifies them.
--
-- Existing rows (created before this migration) were all provider-confirmed or
-- manually entered by trusted staff, so they are backfilled to 'verified'.
--
-- SECURITY:
--   - Progress is computed from rows with status = 'verified' ONLY.
--   - Authenticated users still may only SELECT rows for their own centre.
--   - All writes continue to go through the service-role client after the API
--     route has checked the relevant permission.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Verification columns
-- -----------------------------------------------------------------------------

ALTER TABLE centre_need_contributions
  ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'rejected')),
  ADD COLUMN transaction_reference TEXT,
  ADD COLUMN contributor_name TEXT,
  ADD COLUMN verified_by UUID,
  ADD COLUMN verified_at TIMESTAMPTZ;

-- Backfill pre-existing rows: they were already confirmed/trusted.
UPDATE centre_need_contributions
   SET status = 'verified',
       verified_at = COALESCE(verified_at, created_at);

-- -----------------------------------------------------------------------------
-- 2. Allow 'PUBLIC' contributions
-- -----------------------------------------------------------------------------

ALTER TABLE centre_need_contributions
  DROP CONSTRAINT IF EXISTS centre_need_contributions_source_check;

ALTER TABLE centre_need_contributions
  ADD CONSTRAINT centre_need_contributions_source_check
  CHECK (source IN ('ONLINE', 'MANUAL', 'PUBLIC'));

-- -----------------------------------------------------------------------------
-- 3. Verification queue index
-- -----------------------------------------------------------------------------

CREATE INDEX idx_centre_need_contributions_status
  ON centre_need_contributions (centre_id, status, need_id);

-- -----------------------------------------------------------------------------
-- 4. Permissions
-- -----------------------------------------------------------------------------
--   site.needs.verify — verify or reject pending contributions.
-- -----------------------------------------------------------------------------

INSERT INTO permissions (module, action, description) VALUES
  ('site', 'needs.verify', 'Verify or reject centre need contributions')
ON CONFLICT (module, action) DO NOTHING;

-- CENTRE_MANAGER, CENTRE_IT and ACCOUNTANT_BURSAR can verify contributions.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  CROSS JOIN permissions p
 WHERE r.name IN ('CENTRE_MANAGER', 'CENTRE_IT', 'ACCOUNTANT_BURSAR')
   AND (p.module, p.action) = ('site', 'needs.verify')
ON CONFLICT DO NOTHING;
