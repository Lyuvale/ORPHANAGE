-- ============================================================
-- Task 8: Family & Guardian Management
-- ============================================================
-- Creates guardians, child_guardians (relationships), and
-- guardian_documents tables with full RLS, audit, and
-- permission support.
-- ============================================================

-- ─── Helper ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── Enums ───────────────────────────────────────────────────

CREATE TYPE guardian_status AS ENUM (
  'active',
  'inactive',
  'deceased',
  'unknown'
);

CREATE TYPE relationship_type AS ENUM (
  'mother',
  'father',
  'grandparent',
  'sibling',
  'aunt',
  'uncle',
  'legal_guardian',
  'foster_caregiver',
  'other_relative',
  'other_authorised'
);

CREATE TYPE legal_authority_type AS ENUM (
  'parent',
  'legal_guardian',
  'court_authorised',
  'other_authorised',
  'none'
);

-- ─── Guardians Table ─────────────────────────────────────────

CREATE TABLE guardians (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  first_name          TEXT NOT NULL,
  middle_name         TEXT,
  last_name           TEXT NOT NULL,
  preferred_name      TEXT,
  gender              TEXT,
  date_of_birth       DATE,
  phone               TEXT,
  alternative_phone   TEXT,
  email               TEXT,
  address             TEXT,
  occupation          TEXT,
  id_reference        TEXT,
  status              guardian_status NOT NULL DEFAULT 'active',
  notes               TEXT,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE guardians ADD CONSTRAINT guardians_centre_id_check
  CHECK (centre_id IS NOT NULL);

CREATE INDEX idx_guardians_centre_id ON guardians(centre_id);
CREATE INDEX idx_guardians_status ON guardians(centre_id, status);
CREATE INDEX idx_guardians_name ON guardians(centre_id, last_name, first_name);

ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;

-- RLS: select_centre
CREATE POLICY guardians_select_centre ON guardians
  FOR SELECT USING (centre_id = auth.current_centre_id());

-- RLS: insert_admin (service role only — deny authenticated)
CREATE POLICY guardians_insert_admin ON guardians
  FOR INSERT WITH CHECK (false);

-- RLS: update_admin (service role only)
CREATE POLICY guardians_update_admin ON guardians
  FOR UPDATE USING (false);

-- RLS: delete_admin (service role only)
CREATE POLICY guardians_delete_admin ON guardians
  FOR DELETE USING (false);

-- Deny authenticated writes (defence in depth)
CREATE POLICY guardians_deny_authenticated_insert ON guardians
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY guardians_deny_authenticated_update ON guardians
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY guardians_deny_authenticated_delete ON guardians
  FOR DELETE TO authenticated USING (false);

-- updated_at trigger
CREATE TRIGGER set_guardians_updated_at
  BEFORE UPDATE ON guardians
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Child-Guardian Relationships ────────────────────────────

CREATE TABLE child_guardians (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id            UUID NOT NULL REFERENCES children(id),
  guardian_id         UUID NOT NULL REFERENCES guardians(id),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  relationship_type   relationship_type NOT NULL,
  is_primary          BOOLEAN NOT NULL DEFAULT false,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  start_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date            DATE,
  legal_authority     legal_authority_type NOT NULL DEFAULT 'none',
  contact_permitted   BOOLEAN NOT NULL DEFAULT true,
  updates_permitted   BOOLEAN NOT NULL DEFAULT true,
  visit_permitted     BOOLEAN NOT NULL DEFAULT true,
  meeting_permitted   BOOLEAN NOT NULL DEFAULT true,
  information_permitted BOOLEAN NOT NULL DEFAULT true,
  contact_restricted  BOOLEAN NOT NULL DEFAULT false,
  visits_restricted   BOOLEAN NOT NULL DEFAULT false,
  restriction_notes   TEXT,
  notes               TEXT,
  created_by          UUID,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE child_guardians ADD CONSTRAINT child_guardians_centre_check
  CHECK (centre_id IS NOT NULL);

-- A child can only have one active primary guardian
-- (enforced via partial unique index in service layer, but we add a DB constraint)
CREATE UNIQUE INDEX idx_child_guardians_one_primary
  ON child_guardians(child_id) WHERE is_primary = true AND is_active = true;

CREATE INDEX idx_child_guardians_child_id ON child_guardians(child_id);
CREATE INDEX idx_child_guardians_guardian_id ON child_guardians(guardian_id);
CREATE INDEX idx_child_guardians_centre_id ON child_guardians(centre_id);
CREATE INDEX idx_child_guardians_active ON child_guardians(child_id, is_active) WHERE is_active = true;

ALTER TABLE child_guardians ENABLE ROW LEVEL SECURITY;

-- RLS: select_centre
CREATE POLICY child_guardians_select_centre ON child_guardians
  FOR SELECT USING (centre_id = auth.current_centre_id());

-- RLS: insert_admin
CREATE POLICY child_guardians_insert_admin ON child_guardians
  FOR INSERT WITH CHECK (false);

-- RLS: update_admin
CREATE POLICY child_guardians_update_admin ON child_guardians
  FOR UPDATE USING (false);

-- RLS: delete_admin
CREATE POLICY child_guardians_delete_admin ON child_guardians
  FOR DELETE USING (false);

CREATE POLICY child_guardians_deny_authenticated_insert ON child_guardians
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY child_guardians_deny_authenticated_update ON child_guardians
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY child_guardians_deny_authenticated_delete ON child_guardians
  FOR DELETE TO authenticated USING (false);

-- updated_at trigger
CREATE TRIGGER set_child_guardians_updated_at
  BEFORE UPDATE ON child_guardians
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Guardian Documents ──────────────────────────────────────

CREATE TABLE guardian_documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id         UUID NOT NULL REFERENCES guardians(id),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  relationship_id     UUID REFERENCES child_guardians(id),
  document_type       TEXT NOT NULL DEFAULT 'other',
  file_name           TEXT NOT NULL,
  file_type           TEXT,
  file_size           BIGINT,
  storage_path        TEXT NOT NULL,
  uploaded_by         UUID,
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata            JSONB
);

ALTER TABLE guardian_documents ADD CONSTRAINT guardian_documents_centre_check
  CHECK (centre_id IS NOT NULL);

CREATE INDEX idx_guardian_documents_guardian_id ON guardian_documents(guardian_id);
CREATE INDEX idx_guardian_documents_centre_id ON guardian_documents(centre_id);
CREATE INDEX idx_guardian_documents_relationship ON guardian_documents(relationship_id);

ALTER TABLE guardian_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY guardian_documents_select_centre ON guardian_documents
  FOR SELECT USING (centre_id = auth.current_centre_id());
CREATE POLICY guardian_documents_insert_admin ON guardian_documents
  FOR INSERT WITH CHECK (false);
CREATE POLICY guardian_documents_delete_admin ON guardian_documents
  FOR DELETE USING (false);

CREATE POLICY guardian_documents_deny_authenticated_insert ON guardian_documents
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY guardian_documents_deny_authenticated_delete ON guardian_documents
  FOR DELETE TO authenticated USING (false);

-- ─── Permissions ─────────────────────────────────────────────

INSERT INTO permissions (module, action, description)
VALUES
  ('guardians', 'view', 'View guardian records within own centre'),
  ('guardians', 'create', 'Create new guardian records'),
  ('guardians', 'update', 'Update guardian records'),
  ('guardians', 'deactivate', 'Deactivate guardian records'),
  ('guardians', 'relationship.manage', 'Create, update, and end child-guardian relationships'),
  ('guardians', 'documents.view', 'View guardian documents within own centre'),
  ('guardians', 'documents.upload', 'Upload guardian documents'),
  ('guardians', 'documents.download', 'Download guardian documents')
ON CONFLICT (module, action) DO NOTHING;

-- ─── Role-Permission Mapping ─────────────────────────────────
-- CENTRE_MANAGER: all guardian permissions
DO $$
DECLARE
  mgr UUID;
  sw UUID;
  cg UUID;
  ro UUID;
  ac UUID;
BEGIN
  SELECT id INTO mgr FROM roles WHERE name = 'CENTRE_MANAGER' AND is_system = true;
  SELECT id INTO sw FROM roles WHERE name = 'SOCIAL_WORKER' AND is_system = true;
  SELECT id INTO cg FROM roles WHERE name = 'CAREGIVER' AND is_system = true;
  SELECT id INTO ro FROM roles WHERE name = 'RECORDS_OFFICER' AND is_system = true;
  SELECT id INTO ac FROM roles WHERE name = 'ACCOUNTANT_BURSAR' AND is_system = true;

  -- CENTRE_MANAGER: all permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT mgr, id FROM permissions WHERE module = 'guardians'
  ON CONFLICT DO NOTHING;

  -- SOCIAL_WORKER: view, create, update, relationship.manage, documents.view/upload
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT sw, id FROM permissions
  WHERE module = 'guardians' AND action IN ('view', 'create', 'update', 'relationship.manage', 'documents.view', 'documents.upload')
  ON CONFLICT DO NOTHING;

  -- CAREGIVER: view only
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT cg, id FROM permissions
  WHERE module = 'guardians' AND action = 'view'
  ON CONFLICT DO NOTHING;

  -- RECORDS_OFFICER: view, create, update, documents.view/upload/download
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT ro, id FROM permissions
  WHERE module = 'guardians' AND action IN ('view', 'create', 'update', 'documents.view', 'documents.upload', 'documents.download')
  ON CONFLICT DO NOTHING;

  -- ACCOUNTANT_BURSAR: view only (minimal)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT ac, id FROM permissions
  WHERE module = 'guardians' AND action = 'view'
  ON CONFLICT DO NOTHING;
END $$;

-- ─── Done ────────────────────────────────────────────────────
