-- ============================================================
-- Task 10: Visits & Family Contact Management
-- ============================================================
-- Creates visits, visit_status_history, visit_restrictions,
-- and contact_attempts with full RLS, audit, and
-- permission support.
-- ============================================================

-- ─── Visit Reference Generator ──────────────────────────────

CREATE OR REPLACE FUNCTION generate_visit_reference(p_centre_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_centre_code TEXT;
  v_seq BIGINT;
  v_ref TEXT;
BEGIN
  SELECT code INTO v_centre_code FROM centres WHERE id = p_centre_id;
  IF v_centre_code IS NULL THEN
    RAISE EXCEPTION 'Centre not found: %', p_centre_id;
  END IF;

  v_seq := nextval('visit_reference_seq');
  v_ref := v_centre_code || '-VISIT-' || LPAD(v_seq::TEXT, 5, '0');
  RETURN v_ref;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS visit_reference_seq START 1;

-- ─── Enums ───────────────────────────────────────────────────

CREATE TYPE visit_type AS ENUM (
  'in_person',
  'phone',
  'video',
  'off_site',
  'other_approved'
);

CREATE TYPE visit_status AS ENUM (
  'requested',
  'pending_approval',
  'approved',
  'scheduled',
  'checked_in',
  'completed',
  'cancelled',
  'rejected',
  'no_show'
);

CREATE TYPE visit_outcome AS ENUM (
  'positive',
  'neutral',
  'negative',
  'concern_noted',
  'incident_reported',
  'pending_review',
  'none'
);

CREATE TYPE restriction_type AS ENUM (
  'no_visits',
  'supervised_only',
  'limited_frequency',
  'limited_duration',
  'phone_only',
  'temporary_ban',
  'other'
);

CREATE TYPE contact_attempt_type AS ENUM (
  'phone_call',
  'message',
  'visit_attempt',
  'video_call',
  'email',
  'other'
);

CREATE TYPE contact_attempt_result AS ENUM (
  'successful',
  'unsuccessful',
  'no_answer',
  'wrong_number',
  'voicemail_left',
  'cancelled',
  'other'
);

-- ─── Visits Table ────────────────────────────────────────────

CREATE TABLE visits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  reference_number    TEXT NOT NULL UNIQUE,
  child_id            UUID NOT NULL REFERENCES children(id),
  guardian_id         UUID NOT NULL REFERENCES guardians(id),
  visit_type          visit_type NOT NULL DEFAULT 'in_person',
  status              visit_status NOT NULL DEFAULT 'requested',
  scheduled_date      DATE NOT NULL,
  scheduled_start_time TIME,
  scheduled_end_time  TIME,
  actual_check_in_time TIMESTAMPTZ,
  actual_check_out_time TIMESTAMPTZ,
  location            TEXT,
  purpose             TEXT NOT NULL,
  notes               TEXT,
  outcome             visit_outcome,
  outcome_notes       TEXT,
  child_response      TEXT,
  family_response     TEXT,
  follow_up_required  BOOLEAN NOT NULL DEFAULT false,
  follow_up_date      DATE,
  follow_up_staff_id  UUID,
  supervised          BOOLEAN NOT NULL DEFAULT false,
  supervisor_id       UUID,
  supervision_notes   TEXT,
  supervisor_notes    TEXT,
  cancellation_reason TEXT,
  cancelled_by        UUID,
  cancelled_at        TIMESTAMPTZ,
  rejected_by         UUID,
  rejected_at         TIMESTAMPTZ,
  rejection_reason    TEXT,
  approved_by         UUID,
  approved_at         TIMESTAMPTZ,
  checked_in_by       UUID,
  checked_out_by      UUID,
  created_by          UUID NOT NULL,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_visits_centre_id ON visits(centre_id);
CREATE INDEX idx_visits_child_id ON visits(child_id);
CREATE INDEX idx_visits_guardian_id ON visits(guardian_id);
CREATE INDEX idx_visits_status ON visits(centre_id, status);
CREATE INDEX idx_visits_scheduled ON visits(centre_id, scheduled_date);
CREATE INDEX idx_visits_child_date ON visits(child_id, scheduled_date);
CREATE INDEX idx_visits_reference ON visits(reference_number);
CREATE INDEX idx_visits_upcoming ON visits(centre_id, scheduled_date, status)
  WHERE status IN ('approved', 'scheduled', 'checked_in');

ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY visits_select_centre ON visits
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY visits_insert_admin ON visits
  FOR INSERT WITH CHECK (false);
CREATE POLICY visits_update_admin ON visits
  FOR UPDATE USING (false);
CREATE POLICY visits_delete_admin ON visits
  FOR DELETE USING (false);
CREATE POLICY visits_deny_authenticated_insert ON visits
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY visits_deny_authenticated_update ON visits
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY visits_deny_authenticated_delete ON visits
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_visits_updated_at
  BEFORE UPDATE ON visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Visit Status History ────────────────────────────────────

CREATE TABLE visit_status_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id            UUID NOT NULL REFERENCES visits(id),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  previous_status     visit_status,
  new_status          visit_status NOT NULL,
  changed_by          UUID,
  changed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason              TEXT
);

CREATE INDEX idx_visit_status_history_visit ON visit_status_history(visit_id);
CREATE INDEX idx_visit_status_history_centre ON visit_status_history(centre_id);

ALTER TABLE visit_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY visit_status_history_select_centre ON visit_status_history
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY visit_status_history_insert_admin ON visit_status_history
  FOR INSERT WITH CHECK (false);
CREATE POLICY visit_status_history_deny_authenticated_insert ON visit_status_history
  FOR INSERT TO authenticated WITH CHECK (false);

-- ─── Visit Restrictions ──────────────────────────────────────

CREATE TABLE visit_restrictions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  child_id            UUID NOT NULL REFERENCES children(id),
  guardian_id         UUID NOT NULL REFERENCES guardians(id),
  restriction_type    restriction_type NOT NULL,
  reason              TEXT NOT NULL,
  source_authority    TEXT,
  start_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date            DATE,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_by          UUID NOT NULL,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_visit_restrictions_centre ON visit_restrictions(centre_id);
CREATE INDEX idx_visit_restrictions_child ON visit_restrictions(child_id);
CREATE INDEX idx_visit_restrictions_guardian ON visit_restrictions(guardian_id);
CREATE INDEX idx_visit_restrictions_active ON visit_restrictions(centre_id, child_id, guardian_id, is_active)
  WHERE is_active = true;

ALTER TABLE visit_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY visit_restrictions_select_centre ON visit_restrictions
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY visit_restrictions_insert_admin ON visit_restrictions
  FOR INSERT WITH CHECK (false);
CREATE POLICY visit_restrictions_update_admin ON visit_restrictions
  FOR UPDATE USING (false);
CREATE POLICY visit_restrictions_delete_admin ON visit_restrictions
  FOR DELETE USING (false);
CREATE POLICY visit_restrictions_deny_authenticated_insert ON visit_restrictions
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY visit_restrictions_deny_authenticated_update ON visit_restrictions
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY visit_restrictions_deny_authenticated_delete ON visit_restrictions
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_visit_restrictions_updated_at
  BEFORE UPDATE ON visit_restrictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Contact Attempts ────────────────────────────────────────

CREATE TABLE contact_attempts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  child_id            UUID NOT NULL REFERENCES children(id),
  guardian_id         UUID NOT NULL REFERENCES guardians(id),
  contact_type        contact_attempt_type NOT NULL,
  result              contact_attempt_result NOT NULL,
  attempted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason_unsuccessful TEXT,
  notes               TEXT,
  staff_member_id     UUID NOT NULL,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_attempts_centre ON contact_attempts(centre_id);
CREATE INDEX idx_contact_attempts_child ON contact_attempts(child_id);
CREATE INDEX idx_contact_attempts_guardian ON contact_attempts(guardian_id);
CREATE INDEX idx_contact_attempts_date ON contact_attempts(centre_id, attempted_at);

ALTER TABLE contact_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY contact_attempts_select_centre ON contact_attempts
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY contact_attempts_insert_admin ON contact_attempts
  FOR INSERT WITH CHECK (false);
CREATE POLICY contact_attempts_update_admin ON contact_attempts
  FOR UPDATE USING (false);
CREATE POLICY contact_attempts_delete_admin ON contact_attempts
  FOR DELETE USING (false);
CREATE POLICY contact_attempts_deny_authenticated_insert ON contact_attempts
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY contact_attempts_deny_authenticated_update ON contact_attempts
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY contact_attempts_deny_authenticated_delete ON contact_attempts
  FOR DELETE TO authenticated USING (false);

-- ─── Permissions ─────────────────────────────────────────────

INSERT INTO permissions (module, action, description)
VALUES
  ('visits', 'view', 'View visit records within own centre'),
  ('visits', 'create', 'Create visit records'),
  ('visits', 'update', 'Update visit records'),
  ('visits', 'request', 'Request a new visit'),
  ('visits', 'approve', 'Approve visit requests'),
  ('visits', 'reject', 'Reject visit requests'),
  ('visits', 'checkin', 'Check in visitors'),
  ('visits', 'checkout', 'Check out visitors'),
  ('visits', 'complete', 'Mark visits as completed'),
  ('visits', 'cancel', 'Cancel visits'),
  ('visits', 'restrictions.view', 'View visit restrictions'),
  ('visits', 'restrictions.manage', 'Manage visit restrictions'),
  ('visits', 'contact_attempts.view', 'View contact attempts'),
  ('visits', 'contact_attempts.create', 'Record contact attempts')
ON CONFLICT (module, action) DO NOTHING;

-- ─── Role-Permission Mapping ─────────────────────────────────

DO $$
DECLARE
  mgr UUID;
  sw UUID;
  cg UUID;
  ro UUID;
  acc UUID;
BEGIN
  SELECT id INTO mgr FROM roles WHERE name = 'CENTRE_MANAGER' AND is_system = true;
  SELECT id INTO sw FROM roles WHERE name = 'SOCIAL_WORKER' AND is_system = true;
  SELECT id INTO cg FROM roles WHERE name = 'CAREGIVER' AND is_system = true;
  SELECT id INTO ro FROM roles WHERE name = 'RECORDS_OFFICER' AND is_system = true;
  SELECT id INTO acc FROM roles WHERE name = 'ACCOUNTANT_BURSAR' AND is_system = true;

  -- CENTRE_MANAGER: all visit permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT mgr, id FROM permissions WHERE module = 'visits'
  ON CONFLICT DO NOTHING;

  -- SOCIAL_WORKER: all visit permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT sw, id FROM permissions WHERE module = 'visits'
  ON CONFLICT DO NOTHING;

  -- CAREGIVER: view, checkin, checkout only
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT cg, id FROM permissions
  WHERE module = 'visits' AND action IN ('view', 'checkin', 'checkout')
  ON CONFLICT DO NOTHING;

  -- RECORDS_OFFICER: view, restrictions.view, contact_attempts.view
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT ro, id FROM permissions
  WHERE module = 'visits' AND action IN ('view', 'restrictions.view', 'contact_attempts.view')
  ON CONFLICT DO NOTHING;

  -- ACCOUNTANT_BURSAR: no visit permissions
END $$;

-- ─── Done ────────────────────────────────────────────────────
