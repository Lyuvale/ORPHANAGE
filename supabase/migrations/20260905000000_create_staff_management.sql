-- ============================================================
-- Task 14: Staff Management & Workforce Operations
-- ============================================================
-- Manages who works at the centre, what role they perform, whether
-- they are active, when they joined, their employment/work
-- information, assigned responsibilities, and their history.
--
-- SECURITY DESIGN:
--   - Every record carries centre_id (tenant isolation) and is
--     enforced by RLS using public.current_centre_id().
--   - staff.* permissions are granted granularly; staff membership
--     is separate from the user-account/roles authorization system.
--   - Staff employment status is separate from user account status
--     (a staff member may be ON_LEAVE while their account stays active).
--   - Staff history is preserved; records are never deleted.
--   - Emergency contact information and staff documents are restricted.
--   - This module is NOT a payroll system (no salary processing).
-- ============================================================

-- ─── Enums ───────────────────────────────────────────────────

CREATE TYPE staff_status AS ENUM (
  'ACTIVE',
  'ON_LEAVE',
  'SUSPENDED',
  'INACTIVE',
  'ENDED'
);

CREATE TYPE staff_history_event AS ENUM (
  'JOINED',
  'ROLE_CHANGED',
  'JOB_TITLE_CHANGED',
  'ASSIGNMENT_CHANGED',
  'STATUS_CHANGED',
  'ENDED',
  'OTHER'
);

CREATE TYPE staff_assignment_status AS ENUM (
  'ACTIVE',
  'ENDED'
);

CREATE TYPE staff_training_status AS ENUM (
  'PENDING',
  'COMPLETED'
);

CREATE TYPE staff_verification_status AS ENUM (
  'VERIFIED',
  'PENDING',
  'NOT_VERIFIED'
);

CREATE TYPE staff_document_type AS ENUM (
  'EMPLOYMENT_AGREEMENT',
  'IDENTIFICATION',
  'QUALIFICATION_CERTIFICATE',
  'TRAINING_CERTIFICATE',
  'OTHER'
);

-- ─── Staff Profile ───────────────────────────────────────────
-- A staff profile is linked to an existing user account where
-- applicable (user_profile_id). The user account remains responsible
-- for login; the staff profile holds employment/work information.

CREATE TABLE staff_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  user_profile_id     UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  staff_identifier    TEXT,
  job_title           TEXT NOT NULL,
  department          TEXT,
  operational_role    TEXT,
  employment_status   staff_status NOT NULL DEFAULT 'ACTIVE',
  start_date          DATE,
  end_date            DATE,
  work_phone          TEXT,
  work_email          TEXT,
  notes               TEXT,
  created_by          UUID NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT staff_profiles_status_end_date_check
    CHECK (employment_status <> 'ENDED' OR end_date IS NOT NULL)
);

-- Reuse the existing role vocabulary for the operational role label.
ALTER TABLE staff_profiles
  ADD CONSTRAINT staff_profiles_operational_role_check
  CHECK (
    operational_role IS NULL OR operational_role IN (
      'CENTRE_MANAGER', 'SOCIAL_WORKER', 'CAREGIVER', 'RECORDS_OFFICER', 'ACCOUNTANT_BURSAR'
    )
  );

CREATE INDEX idx_staff_profiles_centre ON staff_profiles(centre_id);
CREATE INDEX idx_staff_profiles_user ON staff_profiles(user_profile_id);
CREATE INDEX idx_staff_profiles_status ON staff_profiles(centre_id, employment_status);
CREATE INDEX idx_staff_profiles_role ON staff_profiles(centre_id, operational_role);

-- One active staff profile per user per centre; one staff_identifier per centre.
CREATE UNIQUE INDEX idx_staff_profiles_centre_user
  ON staff_profiles(centre_id, user_profile_id) WHERE user_profile_id IS NOT NULL;
CREATE UNIQUE INDEX idx_staff_profiles_centre_identifier
  ON staff_profiles(centre_id, staff_identifier) WHERE staff_identifier IS NOT NULL;

ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_profile_select_centre ON staff_profiles
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY staff_profile_insert_admin ON staff_profiles
  FOR INSERT WITH CHECK (false);
CREATE POLICY staff_profile_update_admin ON staff_profiles
  FOR UPDATE USING (false);
CREATE POLICY staff_profile_delete_admin ON staff_profiles
  FOR DELETE USING (false);
CREATE POLICY staff_profile_deny_authenticated_insert ON staff_profiles
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY staff_profile_deny_authenticated_update ON staff_profiles
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY staff_profile_deny_authenticated_delete ON staff_profiles
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_staff_profile_updated_at
  BEFORE UPDATE ON staff_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Staff History ───────────────────────────────────────────
-- Append-only record of important staff changes. Historical staff
-- information is preserved even after the person leaves.

CREATE TABLE staff_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id            UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  event_type          staff_history_event NOT NULL,
  description         TEXT,
  changed_by          UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_history_staff ON staff_history(staff_id, created_at DESC);

ALTER TABLE staff_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_history_select_own ON staff_history
  FOR SELECT USING (
    staff_id IN (SELECT id FROM staff_profiles WHERE centre_id = public.current_centre_id())
  );
CREATE POLICY staff_history_insert_admin ON staff_history
  FOR INSERT WITH CHECK (false);
CREATE POLICY staff_history_update_admin ON staff_history
  FOR UPDATE USING (false);
CREATE POLICY staff_history_delete_admin ON staff_history
  FOR DELETE USING (false);
CREATE POLICY staff_history_deny_authenticated_insert ON staff_history
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY staff_history_deny_authenticated_update ON staff_history
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY staff_history_deny_authenticated_delete ON staff_history
  FOR DELETE TO authenticated USING (false);

-- ─── Staff Assignments ───────────────────────────────────────
-- Manages the staff side of operational responsibilities. Child/case
-- assignments belong to their specific modules; this records the
-- operational responsibility assigned to a staff member.

CREATE TABLE staff_assignments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  staff_id            UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  responsibility_type TEXT NOT NULL,
  description         TEXT,
  assigned_by         UUID NOT NULL,
  assigned_date       DATE,
  status              staff_assignment_status NOT NULL DEFAULT 'ACTIVE',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_assignments_centre ON staff_assignments(centre_id);
CREATE INDEX idx_staff_assignments_staff ON staff_assignments(staff_id);
CREATE INDEX idx_staff_assignments_staff_status ON staff_assignments(staff_id, status);

ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_assignment_select_centre ON staff_assignments
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY staff_assignment_insert_admin ON staff_assignments
  FOR INSERT WITH CHECK (false);
CREATE POLICY staff_assignment_update_admin ON staff_assignments
  FOR UPDATE USING (false);
CREATE POLICY staff_assignment_delete_admin ON staff_assignments
  FOR DELETE USING (false);
CREATE POLICY staff_assignment_deny_authenticated_insert ON staff_assignments
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY staff_assignment_deny_authenticated_update ON staff_assignments
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY staff_assignment_deny_authenticated_delete ON staff_assignments
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_staff_assignment_updated_at
  BEFORE UPDATE ON staff_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Staff Training Records ──────────────────────────────────
-- Simple training record; not a Learning Management System.

CREATE TABLE staff_training (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  staff_id            UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  training_title      TEXT NOT NULL,
  provider            TEXT,
  training_date       DATE,
  due_date            DATE,
  completion_status   staff_training_status NOT NULL DEFAULT 'PENDING',
  certificate_reference TEXT,
  expiry_date         DATE,
  notes               TEXT,
  recorded_by         UUID NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_training_centre ON staff_training(centre_id);
CREATE INDEX idx_staff_training_staff ON staff_training(staff_id);
CREATE INDEX idx_staff_training_staff_status ON staff_training(staff_id, completion_status);

ALTER TABLE staff_training ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_training_select_centre ON staff_training
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY staff_training_insert_admin ON staff_training
  FOR INSERT WITH CHECK (false);
CREATE POLICY staff_training_update_admin ON staff_training
  FOR UPDATE USING (false);
CREATE POLICY staff_training_delete_admin ON staff_training
  FOR DELETE USING (false);
CREATE POLICY staff_training_deny_authenticated_insert ON staff_training
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY staff_training_deny_authenticated_update ON staff_training
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY staff_training_deny_authenticated_delete ON staff_training
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_staff_training_updated_at
  BEFORE UPDATE ON staff_training
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Staff Qualifications ────────────────────────────────────

CREATE TABLE staff_qualifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  staff_id            UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  qualification       TEXT NOT NULL,
  institution         TEXT,
  qualification_year  TEXT,
  verification_status staff_verification_status NOT NULL DEFAULT 'NOT_VERIFIED',
  notes               TEXT,
  recorded_by         UUID NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT staff_qualifications_year_check CHECK (
    qualification_year IS NULL OR qualification_year ~ '^\d{4}$'
  )
);

CREATE INDEX idx_staff_qualifications_centre ON staff_qualifications(centre_id);
CREATE INDEX idx_staff_qualifications_staff ON staff_qualifications(staff_id);

ALTER TABLE staff_qualifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_qualification_select_centre ON staff_qualifications
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY staff_qualification_insert_admin ON staff_qualifications
  FOR INSERT WITH CHECK (false);
CREATE POLICY staff_qualification_update_admin ON staff_qualifications
  FOR UPDATE USING (false);
CREATE POLICY staff_qualification_delete_admin ON staff_qualifications
  FOR DELETE USING (false);
CREATE POLICY staff_qualification_deny_authenticated_insert ON staff_qualifications
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY staff_qualification_deny_authenticated_update ON staff_qualifications
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY staff_qualification_deny_authenticated_delete ON staff_qualifications
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_staff_qualification_updated_at
  BEFORE UPDATE ON staff_qualifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Staff Emergency Contacts ────────────────────────────────
-- Restricted: access requires staff.emergency.view permission.

CREATE TABLE staff_emergency_contacts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  staff_id            UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  contact_name        TEXT NOT NULL,
  relationship        TEXT,
  phone               TEXT,
  email               TEXT,
  created_by          UUID NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_emergency_centre ON staff_emergency_contacts(centre_id);
CREATE INDEX idx_staff_emergency_staff ON staff_emergency_contacts(staff_id);

ALTER TABLE staff_emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_emergency_select_centre ON staff_emergency_contacts
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY staff_emergency_insert_admin ON staff_emergency_contacts
  FOR INSERT WITH CHECK (false);
CREATE POLICY staff_emergency_update_admin ON staff_emergency_contacts
  FOR UPDATE USING (false);
CREATE POLICY staff_emergency_delete_admin ON staff_emergency_contacts
  FOR DELETE USING (false);
CREATE POLICY staff_emergency_deny_authenticated_insert ON staff_emergency_contacts
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY staff_emergency_deny_authenticated_update ON staff_emergency_contacts
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY staff_emergency_deny_authenticated_delete ON staff_emergency_contacts
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_staff_emergency_updated_at
  BEFORE UPDATE ON staff_emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Staff Documents ─────────────────────────────────────────
-- Reuses the existing private-document security pattern: an owner
-- table row plus a private storage bucket. No separate document system.

CREATE TABLE staff_documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  staff_id            UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE RESTRICT,
  document_type       staff_document_type NOT NULL DEFAULT 'OTHER',
  file_name           TEXT NOT NULL,
  file_type           TEXT,
  file_size           BIGINT,
  storage_path        TEXT NOT NULL,
  description         TEXT,
  uploaded_by         UUID NOT NULL,
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata            JSONB
);

CREATE INDEX idx_staff_documents_centre ON staff_documents(centre_id);
CREATE INDEX idx_staff_documents_staff ON staff_documents(staff_id);

ALTER TABLE staff_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_document_select_centre ON staff_documents
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY staff_document_insert_admin ON staff_documents
  FOR INSERT WITH CHECK (false);
CREATE POLICY staff_document_update_admin ON staff_documents
  FOR UPDATE USING (false);
CREATE POLICY staff_document_delete_admin ON staff_documents
  FOR DELETE USING (false);
CREATE POLICY staff_document_deny_authenticated_insert ON staff_documents
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY staff_document_deny_authenticated_update ON staff_documents
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY staff_document_deny_authenticated_delete ON staff_documents
  FOR DELETE TO authenticated USING (false);

-- ─── Private storage bucket for staff documents ──────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'staff-documents', 'staff-documents', false, 10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── Permissions ─────────────────────────────────────────────
-- Granular staff permissions. The base staff.view / create / update /
-- assign_roles permissions are already seeded; only add the new
-- granular permissions here.

INSERT INTO permissions (module, action, description)
VALUES
  ('staff', 'status.manage', 'Change staff employment status'),
  ('staff', 'assignments.manage', 'Create and manage staff assignments'),
  ('staff', 'training.view', 'View staff training records'),
  ('staff', 'training.manage', 'Create and manage staff training records'),
  ('staff', 'qualifications.view', 'View staff qualifications'),
  ('staff', 'qualifications.manage', 'Create and manage staff qualifications'),
  ('staff', 'documents.view', 'View staff documents'),
  ('staff', 'documents.manage', 'Upload and manage staff documents'),
  ('staff', 'emergency.view', 'View staff emergency contact information')
ON CONFLICT (module, action) DO NOTHING;

-- ─── Role-Permission Mapping ─────────────────────────────────
-- Deliberate per-role grants. Not all staff permissions are granted
-- to every manager/care role.

DO $$
DECLARE
  mgr UUID;
  sw UUID;
  cg UUID;
  ro UUID;
  ab UUID;
BEGIN
  SELECT id INTO mgr FROM roles WHERE name = 'CENTRE_MANAGER' AND is_system = true;
  SELECT id INTO sw FROM roles WHERE name = 'SOCIAL_WORKER' AND is_system = true;
  SELECT id INTO cg FROM roles WHERE name = 'CAREGIVER' AND is_system = true;
  SELECT id INTO ro FROM roles WHERE name = 'RECORDS_OFFICER' AND is_system = true;
  SELECT id INTO ab FROM roles WHERE name = 'ACCOUNTANT_BURSAR' AND is_system = true;

  -- CENTRE_MANAGER: full staff & workforce management
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT mgr, id FROM permissions WHERE module = 'staff'
  ON CONFLICT DO NOTHING;

  -- SOCIAL_WORKER: view-only staff information for operational work
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT sw, id FROM permissions WHERE (module = 'staff' AND action = 'view')
  ON CONFLICT DO NOTHING;

  -- CAREGIVER: limited access to the staff directory
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT cg, id FROM permissions WHERE (module = 'staff' AND action = 'view')
  ON CONFLICT DO NOTHING;

  -- RECORDS_OFFICER: manage authorised staff records/documents/training/qualifications.
  -- NOT status changes, assignments, or emergency contact info.
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT ro, id FROM permissions
  WHERE (module = 'staff' AND action IN (
    'view', 'create', 'update',
    'training.view', 'training.manage',
    'qualifications.view', 'qualifications.manage',
    'documents.view', 'documents.manage'
  ))
  ON CONFLICT DO NOTHING;

  -- ACCOUNTANT_BURSAR: staff information necessary for authorised finance
  -- operations only. No HR documents, training, qualifications, emergency.
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT ab, id FROM permissions WHERE (module = 'staff' AND action = 'view')
  ON CONFLICT DO NOTHING;
END $$;

-- ─── Done ────────────────────────────────────────────────────