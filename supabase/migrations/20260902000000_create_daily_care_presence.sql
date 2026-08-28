-- ============================================================
-- Task 11: Daily Care & Child Presence Management
-- ============================================================
-- Creates child_presence, daily_care_records, care_activities,
-- meal_records, daily_notes, and care_followups with full RLS,
-- audit, and permission support.
-- ============================================================

-- ─── Enums ───────────────────────────────────────────────────

CREATE TYPE presence_status AS ENUM (
  'present',
  'absent',
  'on_leave',
  'off_site',
  'transferred',
  'other_approved'
);

CREATE TYPE absence_reason AS ENUM (
  'illness',
  'family_leave',
  'unknown',
  'external_programme',
  'approved_absence',
  'other'
);

CREATE TYPE meal_type AS ENUM (
  'breakfast',
  'lunch',
  'dinner',
  'snack'
);

CREATE TYPE care_activity_type AS ENUM (
  'meal',
  'hygiene',
  'clothing',
  'sleep',
  'recreation',
  'special_support',
  'general_wellbeing',
  'other'
);

CREATE TYPE daily_note_type AS ENUM (
  'general',
  'observation',
  'incident',
  'concern',
  'follow_up',
  'other'
);

CREATE TYPE followup_status AS ENUM (
  'open',
  'in_progress',
  'completed',
  'cancelled'
);

-- ─── Child Presence Table ────────────────────────────────────

CREATE TABLE child_presence (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  child_id            UUID NOT NULL REFERENCES children(id),
  presence_date       DATE NOT NULL,
  status              presence_status NOT NULL DEFAULT 'present',
  check_in_time       TIMESTAMPTZ,
  check_out_time      TIMESTAMPTZ,
  check_in_by         UUID,
  check_out_by        UUID,
  absence_reason      absence_reason,
  off_site_reason     TEXT,
  off_site_destination TEXT,
  off_site_expected_return TIMESTAMPTZ,
  off_site_actual_return   TIMESTAMPTZ,
  authorised_by       UUID,
  visit_id            UUID REFERENCES visits(id),
  notes               TEXT,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(centre_id, child_id, presence_date)
);

CREATE INDEX idx_child_presence_centre ON child_presence(centre_id);
CREATE INDEX idx_child_presence_child ON child_presence(child_id);
CREATE INDEX idx_child_presence_date ON child_presence(centre_id, presence_date);
CREATE INDEX idx_child_presence_status ON child_presence(centre_id, presence_date, status);
CREATE INDEX idx_child_presence_child_date ON child_presence(child_id, presence_date);

ALTER TABLE child_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY child_presence_select_centre ON child_presence
  FOR SELECT USING (centre_id = auth.current_centre_id());
CREATE POLICY child_presence_insert_admin ON child_presence
  FOR INSERT WITH CHECK (false);
CREATE POLICY child_presence_update_admin ON child_presence
  FOR UPDATE USING (false);
CREATE POLICY child_presence_delete_admin ON child_presence
  FOR DELETE USING (false);
CREATE POLICY child_presence_deny_authenticated_insert ON child_presence
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY child_presence_deny_authenticated_update ON child_presence
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY child_presence_deny_authenticated_delete ON child_presence
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_child_presence_updated_at
  BEFORE UPDATE ON child_presence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Daily Care Records ──────────────────────────────────────

CREATE TABLE daily_care_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  child_id            UUID NOT NULL REFERENCES children(id),
  care_date           DATE NOT NULL,
  activity_type       care_activity_type NOT NULL,
  description         TEXT,
  time_of_day         TIME,
  staff_member_id     UUID NOT NULL,
  status              TEXT NOT NULL DEFAULT 'completed',
  notes               TEXT,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_daily_care_centre ON daily_care_records(centre_id);
CREATE INDEX idx_daily_care_child ON daily_care_records(child_id);
CREATE INDEX idx_daily_care_date ON daily_care_records(centre_id, care_date);
CREATE INDEX idx_daily_care_child_date ON daily_care_records(child_id, care_date);

ALTER TABLE daily_care_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_care_records_select_centre ON daily_care_records
  FOR SELECT USING (centre_id = auth.current_centre_id());
CREATE POLICY daily_care_records_insert_admin ON daily_care_records
  FOR INSERT WITH CHECK (false);
CREATE POLICY daily_care_records_update_admin ON daily_care_records
  FOR UPDATE USING (false);
CREATE POLICY daily_care_records_delete_admin ON daily_care_records
  FOR DELETE USING (false);
CREATE POLICY daily_care_records_deny_authenticated_insert ON daily_care_records
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY daily_care_records_deny_authenticated_update ON daily_care_records
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY daily_care_records_deny_authenticated_delete ON daily_care_records
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_daily_care_records_updated_at
  BEFORE UPDATE ON daily_care_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Meal Records ────────────────────────────────────────────

CREATE TABLE meal_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  child_id            UUID NOT NULL REFERENCES children(id),
  meal_date           DATE NOT NULL,
  meal_type           meal_type NOT NULL,
  provided            BOOLEAN NOT NULL DEFAULT true,
  time_of_day         TIME,
  notes               TEXT,
  recorded_by         UUID NOT NULL,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meal_records_centre ON meal_records(centre_id);
CREATE INDEX idx_meal_records_child ON meal_records(child_id);
CREATE INDEX idx_meal_records_date ON meal_records(centre_id, meal_date);
CREATE INDEX idx_meal_records_child_date ON meal_records(child_id, meal_date);

ALTER TABLE meal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY meal_records_select_centre ON meal_records
  FOR SELECT USING (centre_id = auth.current_centre_id());
CREATE POLICY meal_records_insert_admin ON meal_records
  FOR INSERT WITH CHECK (false);
CREATE POLICY meal_records_update_admin ON meal_records
  FOR UPDATE USING (false);
CREATE POLICY meal_records_delete_admin ON meal_records
  FOR DELETE USING (false);
CREATE POLICY meal_records_deny_authenticated_insert ON meal_records
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY meal_records_deny_authenticated_update ON meal_records
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY meal_records_deny_authenticated_delete ON meal_records
  FOR DELETE TO authenticated USING (false);

-- ─── Daily Notes ─────────────────────────────────────────────

CREATE TABLE daily_notes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  child_id            UUID NOT NULL REFERENCES children(id),
  note_date           DATE NOT NULL,
  note_type           daily_note_type NOT NULL DEFAULT 'general',
  content             TEXT NOT NULL,
  author_id           UUID NOT NULL,
  author_name         TEXT,
  is_pinned           BOOLEAN NOT NULL DEFAULT false,
  version             INTEGER NOT NULL DEFAULT 1,
  parent_note_id      UUID REFERENCES daily_notes(id),
  is_amended          BOOLEAN NOT NULL DEFAULT false,
  amended_by          UUID,
  amended_at          TIMESTAMPTZ,
  amendment_reason    TEXT,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_daily_notes_centre ON daily_notes(centre_id);
CREATE INDEX idx_daily_notes_child ON daily_notes(child_id);
CREATE INDEX idx_daily_notes_date ON daily_notes(centre_id, note_date);
CREATE INDEX idx_daily_notes_child_date ON daily_notes(child_id, note_date);
CREATE INDEX idx_daily_notes_parent ON daily_notes(parent_note_id) WHERE parent_note_id IS NOT NULL;

ALTER TABLE daily_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_notes_select_centre ON daily_notes
  FOR SELECT USING (centre_id = auth.current_centre_id());
CREATE POLICY daily_notes_insert_admin ON daily_notes
  FOR INSERT WITH CHECK (false);
CREATE POLICY daily_notes_update_admin ON daily_notes
  FOR UPDATE USING (false);
CREATE POLICY daily_notes_delete_admin ON daily_notes
  FOR DELETE USING (false);
CREATE POLICY daily_notes_deny_authenticated_insert ON daily_notes
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY daily_notes_deny_authenticated_update ON daily_notes
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY daily_notes_deny_authenticated_delete ON daily_notes
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_daily_notes_updated_at
  BEFORE UPDATE ON daily_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Care Follow-Ups ─────────────────────────────────────────

CREATE TABLE care_followups (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  child_id            UUID NOT NULL REFERENCES children(id),
  source_note_id      UUID REFERENCES daily_notes(id),
  source_care_id      UUID REFERENCES daily_care_records(id),
  title               TEXT NOT NULL,
  description         TEXT,
  status              followup_status NOT NULL DEFAULT 'open',
  responsible_user_id UUID,
  due_date            DATE,
  resolved_at         TIMESTAMPTZ,
  resolution_notes    TEXT,
  created_by          UUID NOT NULL,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_care_followups_centre ON care_followups(centre_id);
CREATE INDEX idx_care_followups_child ON care_followups(child_id);
CREATE INDEX idx_care_followups_status ON care_followups(centre_id, status);
CREATE INDEX idx_care_followups_due ON care_followups(centre_id, due_date) WHERE status IN ('open', 'in_progress');

ALTER TABLE care_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY care_followups_select_centre ON care_followups
  FOR SELECT USING (centre_id = auth.current_centre_id());
CREATE POLICY care_followups_insert_admin ON care_followups
  FOR INSERT WITH CHECK (false);
CREATE POLICY care_followups_update_admin ON care_followups
  FOR UPDATE USING (false);
CREATE POLICY care_followups_delete_admin ON care_followups
  FOR DELETE USING (false);
CREATE POLICY care_followups_deny_authenticated_insert ON care_followups
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY care_followups_deny_authenticated_update ON care_followups
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY care_followups_deny_authenticated_delete ON care_followups
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_care_followups_updated_at
  BEFORE UPDATE ON care_followups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Permissions ─────────────────────────────────────────────

INSERT INTO permissions (module, action, description)
VALUES
  ('presence', 'view', 'View child presence records within own centre'),
  ('presence', 'create', 'Create child presence records'),
  ('presence', 'update', 'Update child presence records'),
  ('presence', 'checkin', 'Check in children'),
  ('presence', 'checkout', 'Check out children'),
  ('presence', 'manage', 'Manage child presence (correct, override)'),
  ('daily_care', 'view', 'View daily care records within own centre'),
  ('daily_care', 'create', 'Create daily care records'),
  ('daily_care', 'update', 'Update daily care records'),
  ('daily_care', 'notes.view', 'View daily care notes'),
  ('daily_care', 'notes.create', 'Create daily care notes'),
  ('daily_care', 'followup.manage', 'Manage daily care follow-ups')
ON CONFLICT (module, action) DO NOTHING;

-- ─── Role-Permission Mapping ─────────────────────────────────

DO $$
DECLARE
  mgr UUID;
  sw UUID;
  cg UUID;
  ro UUID;
BEGIN
  SELECT id INTO mgr FROM roles WHERE name = 'CENTRE_MANAGER' AND is_system = true;
  SELECT id INTO sw FROM roles WHERE name = 'SOCIAL_WORKER' AND is_system = true;
  SELECT id INTO cg FROM roles WHERE name = 'CAREGIVER' AND is_system = true;
  SELECT id INTO ro FROM roles WHERE name = 'RECORDS_OFFICER' AND is_system = true;

  -- CENTRE_MANAGER: all presence + daily_care permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT mgr, id FROM permissions WHERE module IN ('presence', 'daily_care')
  ON CONFLICT DO NOTHING;

  -- SOCIAL_WORKER: presence.view, daily_care.view, daily_care.notes.view
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT sw, id FROM permissions
  WHERE (module = 'presence' AND action = 'view')
     OR (module = 'daily_care' AND action IN ('view', 'notes.view'))
  ON CONFLICT DO NOTHING;

  -- CAREGIVER: all presence + daily_care permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT cg, id FROM permissions WHERE module IN ('presence', 'daily_care')
  ON CONFLICT DO NOTHING;

  -- RECORDS_OFFICER: presence.view, daily_care.view, daily_care.notes.view
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT ro, id FROM permissions
  WHERE (module = 'presence' AND action = 'view')
     OR (module = 'daily_care' AND action IN ('view', 'notes.view'))
  ON CONFLICT DO NOTHING;
END $$;

-- ─── Done ────────────────────────────────────────────────────
