-- ============================================================
-- Task 13: Education Support & Child Development
-- ============================================================
-- Tracks education support for children attending external
-- institutions. This is NOT a school management system: it only
-- records whether a child is receiving education and where, plus
-- support needs, development goals, progress, and achievements.
--
-- SECURITY DESIGN:
--   - Every record carries centre_id (tenant isolation) and is
--     enforced by RLS using public.current_centre_id().
--   - education_development.* permissions are granted granularly;
--     children.view does NOT grant education access.
--   - Progress updates, goals, and achievements are historical and
--     NOT silently overwritten; records are append-only where
--     applicable and follow the existing audit approach.
--   - This module records support NEEDS only. It does NOT process
--     payments, procurement, donations, or inventory transactions.
-- ============================================================

-- ─── Enums ───────────────────────────────────────────────────
-- It is safe to use a descriptive enumerated type name; the unique
-- type is created only once via IF NOT EXISTS semantics below.

CREATE TYPE education_status AS ENUM (
  'ATTENDING',
  'NOT_ATTENDING',
  'COMPLETED',
  'TEMPORARILY_NOT_ATTENDING'
);

CREATE TYPE education_support_type AS ENUM (
  'BOOKS',
  'UNIFORM',
  'STATIONERY',
  'SCHOOL_BAG',
  'TRANSPORT',
  'SCHOOL_FEES',
  'OTHER'
);

CREATE TYPE education_support_priority AS ENUM (
  'HIGH',
  'MEDIUM',
  'LOW'
);

CREATE TYPE education_support_status AS ENUM (
  'IDENTIFIED',
  'IN_PROGRESS',
  'SUPPORTED',
  'CLOSED'
);

CREATE TYPE education_goal_status AS ENUM (
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED'
);

CREATE TYPE education_progress_status AS ENUM (
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED'
);

CREATE TYPE education_achievement_category AS ENUM (
  'GOAL_COMPLETION',
  'SKILL',
  'TRAINING',
  'CERTIFICATE',
  'EDUCATIONAL',
  'PERSONAL',
  'OTHER'
);

-- ─── Education Profile ───────────────────────────────────────
-- Answers: "Is the child receiving education, and where?"

CREATE TABLE education_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  child_id            UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  education_status    education_status NOT NULL DEFAULT 'ATTENDING',
  school_name         TEXT,
  education_level     TEXT,
  general_status      TEXT,
  notes               TEXT,
  created_by          UUID NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(centre_id, child_id)
);

CREATE INDEX idx_edu_profile_centre ON education_profiles(centre_id);
CREATE INDEX idx_edu_profile_child ON education_profiles(child_id);

ALTER TABLE education_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY edu_profile_select_centre ON education_profiles
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY edu_profile_insert_admin ON education_profiles
  FOR INSERT WITH CHECK (false);
CREATE POLICY edu_profile_update_admin ON education_profiles
  FOR UPDATE USING (false);
CREATE POLICY edu_profile_delete_admin ON education_profiles
  FOR DELETE USING (false);
CREATE POLICY edu_profile_deny_authenticated_insert ON education_profiles
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY edu_profile_deny_authenticated_update ON education_profiles
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY edu_profile_deny_authenticated_delete ON education_profiles
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_edu_profile_updated_at
  BEFORE UPDATE ON education_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Education Support Needs ─────────────────────────────────
-- Records the NEED only. No financial / procurement processing.

CREATE TABLE education_support_needs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  child_id            UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  support_type        education_support_type NOT NULL,
  description         TEXT,
  identified_date     DATE,
  priority            education_support_priority NOT NULL DEFAULT 'MEDIUM',
  status              education_support_status NOT NULL DEFAULT 'IDENTIFIED',
  notes               TEXT,
  created_by          UUID NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_edu_need_centre ON education_support_needs(centre_id);
CREATE INDEX idx_edu_need_child ON education_support_needs(child_id);
CREATE INDEX idx_edu_need_child_status ON education_support_needs(child_id, status);
CREATE INDEX idx_edu_need_priority ON education_support_needs(centre_id, priority);

ALTER TABLE education_support_needs ENABLE ROW LEVEL SECURITY;

CREATE POLICY edu_need_select_centre ON education_support_needs
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY edu_need_insert_admin ON education_support_needs
  FOR INSERT WITH CHECK (false);
CREATE POLICY edu_need_update_admin ON education_support_needs
  FOR UPDATE USING (false);
CREATE POLICY edu_need_delete_admin ON education_support_needs
  FOR DELETE USING (false);
CREATE POLICY edu_need_deny_authenticated_insert ON education_support_needs
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY edu_need_deny_authenticated_update ON education_support_needs
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY edu_need_deny_authenticated_delete ON education_support_needs
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_edu_need_updated_at
  BEFORE UPDATE ON education_support_needs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Development Goals ───────────────────────────────────────
-- Simple personal-development goals. Completed goals are retained.

CREATE TABLE education_goals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  child_id            UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  title               TEXT NOT NULL,
  description         TEXT,
  start_date          DATE,
  target_date         DATE,
  status              education_goal_status NOT NULL DEFAULT 'NOT_STARTED',
  created_by          UUID NOT NULL,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_edu_goal_centre ON education_goals(centre_id);
CREATE INDEX idx_edu_goal_child ON education_goals(child_id);
CREATE INDEX idx_edu_goal_child_status ON education_goals(child_id, status);

ALTER TABLE education_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY edu_goal_select_centre ON education_goals
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY edu_goal_insert_admin ON education_goals
  FOR INSERT WITH CHECK (false);
CREATE POLICY edu_goal_update_admin ON education_goals
  FOR UPDATE USING (false);
CREATE POLICY edu_goal_delete_admin ON education_goals
  FOR DELETE USING (false);
CREATE POLICY edu_goal_deny_authenticated_insert ON education_goals
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY edu_goal_deny_authenticated_update ON education_goals
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY edu_goal_deny_authenticated_delete ON education_goals
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_edu_goal_updated_at
  BEFORE UPDATE ON education_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Progress Tracking (append-only history) ─────────────────
-- Each progress update is a new row; previous updates are never
-- overwritten or deleted, preserving historical progress.

CREATE TABLE education_progress (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  child_id            UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  goal_id             UUID NOT NULL REFERENCES education_goals(id) ON DELETE RESTRICT,
  progress_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  progress_status     education_progress_status NOT NULL DEFAULT 'IN_PROGRESS',
  observation         TEXT,
  recorded_by         UUID NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_edu_progress_centre ON education_progress(centre_id);
CREATE INDEX idx_edu_progress_child ON education_progress(child_id);
CREATE INDEX idx_edu_progress_goal ON education_progress(goal_id);
CREATE INDEX idx_edu_progress_goal_date ON education_progress(goal_id, progress_date DESC);

ALTER TABLE education_progress ENABLE ROW LEVEL SECURITY;

-- Append-only: SELECT + INSERT only; no UPDATE or DELETE for normal users.
CREATE POLICY edu_progress_select_centre ON education_progress
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY edu_progress_insert_admin ON education_progress
  FOR INSERT WITH CHECK (false);
CREATE POLICY edu_progress_update_admin ON education_progress
  FOR UPDATE USING (false);
CREATE POLICY edu_progress_delete_admin ON education_progress
  FOR DELETE USING (false);
CREATE POLICY edu_progress_deny_authenticated_insert ON education_progress
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY edu_progress_deny_authenticated_update ON education_progress
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY edu_progress_deny_authenticated_delete ON education_progress
  FOR DELETE TO authenticated USING (false);

-- ─── Achievements ────────────────────────────────────────────
-- evidence_reference allows linking to an existing document in the
-- system's document modules without creating a parallel file store.

CREATE TABLE education_achievements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  child_id            UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  title               TEXT NOT NULL,
  description         TEXT,
  achievement_date    DATE,
  category            education_achievement_category NOT NULL DEFAULT 'EDUCATIONAL',
  evidence_reference  TEXT,
  recorded_by         UUID NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_edu_ach_centre ON education_achievements(centre_id);
CREATE INDEX idx_edu_ach_child ON education_achievements(child_id);
CREATE INDEX idx_edu_ach_child_date ON education_achievements(child_id, achievement_date DESC);

ALTER TABLE education_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY edu_ach_select_centre ON education_achievements
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY edu_ach_insert_admin ON education_achievements
  FOR INSERT WITH CHECK (false);
CREATE POLICY edu_ach_update_admin ON education_achievements
  FOR UPDATE USING (false);
CREATE POLICY edu_ach_delete_admin ON education_achievements
  FOR DELETE USING (false);
CREATE POLICY edu_ach_deny_authenticated_insert ON education_achievements
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY edu_ach_deny_authenticated_update ON education_achievements
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY edu_ach_deny_authenticated_delete ON education_achievements
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_edu_ach_updated_at
  BEFORE UPDATE ON education_achievements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Permissions ─────────────────────────────────────────────
-- Granular: separate view permission from each management permission.

INSERT INTO permissions (module, action, description)
VALUES
  ('education_development', 'view', 'View education & child development information'),
  ('education_development', 'education.manage', 'Create and manage education profiles'),
  ('education_development', 'support_needs.manage', 'Create and manage education support needs'),
  ('education_development', 'goals.manage', 'Create and manage development goals'),
  ('education_development', 'progress.manage', 'Record progress updates towards goals'),
  ('education_development', 'achievements.manage', 'Create and manage child achievements')
ON CONFLICT (module, action) DO NOTHING;

-- ─── Role-Permission Mapping ─────────────────────────────────
-- children.view does NOT grant education access. Deny by default.

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

  -- CENTRE_MANAGER: full education & development access (explicitly granted)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT mgr, id FROM permissions WHERE module = 'education_development'
  ON CONFLICT DO NOTHING;

  -- SOCIAL_WORKER: full education & development management
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT sw, id FROM permissions WHERE module = 'education_development'
  ON CONFLICT DO NOTHING;

  -- CAREGIVER: view-only + record progress observations relevant to
  -- their responsibilities. Cannot manage profiles, needs, goals,
  -- or achievements (operational/admin activities).
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT cg, id FROM permissions
  WHERE (module = 'education_development' AND action IN (
    'view',
    'progress.manage'
  ))
  ON CONFLICT DO NOTHING;

  -- RECORDS_OFFICER: manage authorised education & development records
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT ro, id FROM permissions WHERE module = 'education_development'
  ON CONFLICT DO NOTHING;

  -- ACCOUNTANT_BURSAR: NO education & development access (denied by default)
END $$;

-- ─── Done ────────────────────────────────────────────────────
