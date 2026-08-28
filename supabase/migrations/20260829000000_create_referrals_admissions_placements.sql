-- =============================================================================
-- Migration: Referral, Admission & Placement
-- Created: 2026-08-29
-- =============================================================================
-- This migration creates the full child lifecycle workflow:
--   referrals  – intake from external sources (police, court, hospital, etc.)
--   admissions – review process for incoming referrals
--   placements – assignment of admitted children to beds/rooms
--
-- LIFECYCLE:
--   Referral (submitted) → Admitted → Placement (assigned)
--
-- PRINCIPLES:
--   - Centre-scoped: every record has centre_id for tenant isolation
--   - Append-only history: status changes recorded, never overwritten
--   - No physical deletes: soft-delete via status transitions
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Referral status enum
-- -----------------------------------------------------------------------------

CREATE TYPE referral_status AS ENUM (
  'submitted',
  'under_review',
  'admitted',
  'rejected',
  'withdrawn'
);

-- -----------------------------------------------------------------------------
-- 2. Referral source enum
-- -----------------------------------------------------------------------------

CREATE TYPE referral_source AS ENUM (
  'police',
  'court',
  'hospital',
  'school',
  'community',
  'government',
  'self_referral',
  'other'
);

-- -----------------------------------------------------------------------------
-- 3. Referral priority enum
-- -----------------------------------------------------------------------------

CREATE TYPE referral_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- -----------------------------------------------------------------------------
-- 4. Referral table
-- -----------------------------------------------------------------------------

CREATE TABLE referrals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id         UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  reference_number  TEXT NOT NULL,
  child_first_name  TEXT NOT NULL,
  child_middle_name TEXT,
  child_last_name   TEXT NOT NULL,
  child_date_of_birth DATE,
  child_gender      TEXT,
  child_nationality TEXT,
  source            referral_source NOT NULL,
  priority          referral_priority NOT NULL DEFAULT 'medium',
  status            referral_status NOT NULL DEFAULT 'submitted',
  referrer_name     TEXT,
  referrer_org      TEXT,
  referrer_contact  TEXT,
  reason            TEXT NOT NULL,
  notes             TEXT,
  submitted_by      UUID REFERENCES auth.users(id),
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by       UUID REFERENCES auth.users(id),
  reviewed_at       TIMESTAMPTZ,
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT referrals_centre_reference_unique UNIQUE (centre_id, reference_number),
  CONSTRAINT referrals_child_gender_check CHECK (
    child_gender IS NULL OR child_gender IN ('male', 'female', 'other', 'undisclosed')
  ),
  CONSTRAINT referrals_child_dob_check CHECK (
    child_date_of_birth IS NULL OR child_date_of_birth <= CURRENT_DATE
  )
);

CREATE INDEX idx_referrals_centre_id ON referrals (centre_id);
CREATE INDEX idx_referrals_reference_number ON referrals (reference_number);
CREATE INDEX idx_referrals_status ON referrals (status);
CREATE INDEX idx_referrals_centre_status ON referrals (centre_id, status);
CREATE INDEX idx_referrals_source ON referrals (source);
CREATE INDEX idx_referrals_priority ON referrals (priority);
CREATE INDEX idx_referrals_submitted_at ON referrals (submitted_at);

CREATE TRIGGER set_referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: referrals

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals_select_centre"
  ON referrals FOR SELECT
  TO authenticated
  USING (centre_id = public.current_centre_id());

CREATE POLICY "referrals_insert_admin"
  ON referrals FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "referrals_update_admin"
  ON referrals FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "referrals_delete_admin"
  ON referrals FOR DELETE
  TO service_role
  USING (false);

CREATE POLICY "referrals_deny_authenticated_insert"
  ON referrals FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "referrals_deny_authenticated_update"
  ON referrals FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "referrals_deny_authenticated_delete"
  ON referrals FOR DELETE
  TO authenticated
  USING (false);

-- -----------------------------------------------------------------------------
-- 5. Referral documents table
-- -----------------------------------------------------------------------------

CREATE TABLE referral_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id   UUID NOT NULL REFERENCES referrals(id) ON DELETE RESTRICT,
  centre_id     UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  file_name     TEXT NOT NULL,
  file_type     TEXT,
  file_size     INTEGER,
  storage_path  TEXT NOT NULL,
  uploaded_by   UUID REFERENCES auth.users(id),
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata      JSONB
);

CREATE INDEX idx_referral_documents_referral_id ON referral_documents (referral_id);
CREATE INDEX idx_referral_documents_centre_id ON referral_documents (centre_id);

ALTER TABLE referral_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_documents_select_centre"
  ON referral_documents FOR SELECT
  TO authenticated
  USING (centre_id = public.current_centre_id());

CREATE POLICY "referral_documents_insert_admin"
  ON referral_documents FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "referral_documents_delete_admin"
  ON referral_documents FOR DELETE
  TO service_role
  USING (true);

CREATE POLICY "referral_documents_deny_authenticated_insert"
  ON referral_documents FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "referral_documents_deny_authenticated_update"
  ON referral_documents FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "referral_documents_deny_authenticated_delete"
  ON referral_documents FOR DELETE
  TO authenticated
  USING (false);

-- -----------------------------------------------------------------------------
-- 6. Admission status enum
-- -----------------------------------------------------------------------------

CREATE TYPE admission_status AS ENUM (
  'pending',
  'approved',
  'denied',
  'cancelled'
);

-- -----------------------------------------------------------------------------
-- 7. Admission table
-- -----------------------------------------------------------------------------

CREATE TABLE admissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id       UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  referral_id     UUID NOT NULL REFERENCES referrals(id) ON DELETE RESTRICT,
  reference_number TEXT NOT NULL,
  status          admission_status NOT NULL DEFAULT 'pending',
  decision        TEXT,
  conditions      TEXT,
  admitted_date   DATE,
  admitted_by     UUID REFERENCES auth.users(id),
  denied_reason   TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT admissions_centre_reference_unique UNIQUE (centre_id, reference_number)
);

CREATE INDEX idx_admissions_centre_id ON admissions (centre_id);
CREATE INDEX idx_admissions_reference_number ON admissions (reference_number);
CREATE INDEX idx_admissions_referral_id ON admissions (referral_id);
CREATE INDEX idx_admissions_status ON admissions (status);
CREATE INDEX idx_admissions_centre_status ON admissions (centre_id, status);

CREATE TRIGGER set_admissions_updated_at
  BEFORE UPDATE ON admissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: admissions

ALTER TABLE admissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admissions_select_centre"
  ON admissions FOR SELECT
  TO authenticated
  USING (centre_id = public.current_centre_id());

CREATE POLICY "admissions_insert_admin"
  ON admissions FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "admissions_update_admin"
  ON admissions FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "admissions_delete_admin"
  ON admissions FOR DELETE
  TO service_role
  USING (false);

CREATE POLICY "admissions_deny_authenticated_insert"
  ON admissions FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "admissions_deny_authenticated_update"
  ON admissions FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "admissions_deny_authenticated_delete"
  ON admissions FOR DELETE
  TO authenticated
  USING (false);

-- -----------------------------------------------------------------------------
-- 8. Admission history (audit trail for status changes)
-- -----------------------------------------------------------------------------

CREATE TABLE admission_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id    UUID NOT NULL REFERENCES admissions(id) ON DELETE RESTRICT,
  centre_id       UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  previous_status admission_status,
  new_status      admission_status NOT NULL,
  changed_by      UUID REFERENCES auth.users(id),
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason          TEXT
);

CREATE INDEX idx_admission_history_admission_id ON admission_history (admission_id);
CREATE INDEX idx_admission_history_centre_id ON admission_history (centre_id);

ALTER TABLE admission_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admission_history_select_centre"
  ON admission_history FOR SELECT
  TO authenticated
  USING (centre_id = public.current_centre_id());

CREATE POLICY "admission_history_insert_admin"
  ON admission_history FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "admission_history_deny_authenticated_insert"
  ON admission_history FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "admission_history_deny_authenticated_update"
  ON admission_history FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "admission_history_deny_authenticated_delete"
  ON admission_history FOR DELETE
  TO authenticated
  USING (false);

-- -----------------------------------------------------------------------------
-- 9. Placement status enum
-- -----------------------------------------------------------------------------

CREATE TYPE placement_status AS ENUM (
  'active',
  'completed',
  'transferred',
  'discharged'
);

-- -----------------------------------------------------------------------------
-- 10. Placement table
-- -----------------------------------------------------------------------------

CREATE TABLE placements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id         UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  child_id          UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  admission_id      UUID REFERENCES admissions(id) ON DELETE SET NULL,
  reference_number  TEXT NOT NULL,
  status            placement_status NOT NULL DEFAULT 'active',
  bed_reference     TEXT,
  room_number       TEXT,
  start_date        DATE NOT NULL,
  end_date          DATE,
  placement_type    TEXT NOT NULL DEFAULT 'residential',
  notes             TEXT,
  assigned_by       UUID REFERENCES auth.users(id),
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT placements_centre_reference_unique UNIQUE (centre_id, reference_number),
  CONSTRAINT placements_placement_type_check CHECK (
    placement_type IN ('residential', 'foster', 'adoption', 'transitional', 'temporary')
  ),
  CONSTRAINT placements_dates_check CHECK (
    end_date IS NULL OR end_date >= start_date
  )
);

CREATE INDEX idx_placements_centre_id ON placements (centre_id);
CREATE INDEX idx_placements_child_id ON placements (child_id);
CREATE INDEX idx_placements_admission_id ON placements (admission_id);
CREATE INDEX idx_placements_reference_number ON placements (reference_number);
CREATE INDEX idx_placements_status ON placements (status);
CREATE INDEX idx_placements_centre_status ON placements (centre_id, status);
CREATE INDEX idx_placements_start_date ON placements (start_date);

CREATE TRIGGER set_placements_updated_at
  BEFORE UPDATE ON placements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: placements

ALTER TABLE placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "placements_select_centre"
  ON placements FOR SELECT
  TO authenticated
  USING (centre_id = public.current_centre_id());

CREATE POLICY "placements_insert_admin"
  ON placements FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "placements_update_admin"
  ON placements FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "placements_delete_admin"
  ON placements FOR DELETE
  TO service_role
  USING (false);

CREATE POLICY "placements_deny_authenticated_insert"
  ON placements FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "placements_deny_authenticated_update"
  ON placements FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "placements_deny_authenticated_delete"
  ON placements FOR DELETE
  TO authenticated
  USING (false);

-- -----------------------------------------------------------------------------
-- 11. New permissions for admissions & placements
-- -----------------------------------------------------------------------------

INSERT INTO permissions (module, action, description) VALUES
  ('admissions', 'view',   'View admissions within own centre'),
  ('admissions', 'create', 'Create new admissions'),
  ('admissions', 'review', 'Review and approve/deny admissions'),
  ('placements', 'view',   'View placements within own centre'),
  ('placements', 'create', 'Create new placements'),
  ('placements', 'update', 'Update placement records')
ON CONFLICT (module, action) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 12. Update referral permissions (add review, approve, reject)
-- -----------------------------------------------------------------------------

INSERT INTO permissions (module, action, description) VALUES
  ('referrals', 'review', 'Review incoming referrals'),
  ('referrals', 'approve', 'Approve referrals'),
  ('referrals', 'reject', 'Reject referrals')
ON CONFLICT (module, action) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 13. Seed: Role → Permission mappings for new permissions
-- -----------------------------------------------------------------------------

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

  -- CENTRE_MANAGER: full access
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_centre_manager, id FROM permissions WHERE (module, action) IN (
    ('referrals', 'review'), ('referrals', 'approve'), ('referrals', 'reject'),
    ('admissions', 'view'), ('admissions', 'create'), ('admissions', 'review'),
    ('placements', 'view'), ('placements', 'create'), ('placements', 'update')
  )
  ON CONFLICT DO NOTHING;

  -- SOCIAL_WORKER: referrals + admissions + placements view/create
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_social_worker, id FROM permissions WHERE (module, action) IN (
    ('referrals', 'review'), ('referrals', 'approve'), ('referrals', 'reject'),
    ('admissions', 'view'), ('admissions', 'create'), ('admissions', 'review'),
    ('placements', 'view'), ('placements', 'create'), ('placements', 'update')
  )
  ON CONFLICT DO NOTHING;

  -- CAREGIVER: placements view only
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_caregiver, id FROM permissions WHERE (module, action) IN (
    ('placements', 'view')
  )
  ON CONFLICT DO NOTHING;

  -- RECORDS_OFFICER: admissions view, placements view/create/update
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_records_officer, id FROM permissions WHERE (module, action) IN (
    ('admissions', 'view'),
    ('placements', 'view'), ('placements', 'create'), ('placements', 'update')
  )
  ON CONFLICT DO NOTHING;

  -- ACCOUNTANT_BURSAR: no new permissions needed

END $$;
