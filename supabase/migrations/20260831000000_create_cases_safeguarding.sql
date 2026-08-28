-- ============================================================
-- Task 9: Case Management & Safeguarding
-- ============================================================
-- Creates cases, assessments, case_plans, case_plan_items,
-- interventions, case_notes, case_documents, safeguarding
-- concerns, safeguarding actions, safeguarding escalations,
-- and safeguarding_documents with full RLS, audit, and
-- permission support.
-- ============================================================

-- ─── Case Reference Generator ────────────────────────────────

CREATE OR REPLACE FUNCTION generate_case_reference(p_centre_id UUID)
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

  v_seq := nextval('case_reference_seq');
  v_ref := v_centre_code || '-CASE-' || LPAD(v_seq::TEXT, 5, '0');
  RETURN v_ref;
END;
$$ LANGUAGE plpgsql;

-- Sequence for case references
CREATE SEQUENCE IF NOT EXISTS case_reference_seq START 1;

-- ─── Enums ───────────────────────────────────────────────────

CREATE TYPE case_status AS ENUM (
  'open',
  'under_assessment',
  'active_plan',
  'on_hold',
  'resolved',
  'closed'
);

CREATE TYPE case_type AS ENUM (
  'protection',
  'family_reunification',
  'behavioural',
  'education',
  'health',
  'placement',
  'legal',
  'psychosocial',
  'other'
);

CREATE TYPE case_priority AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

CREATE TYPE case_classification AS ENUM (
  'standard',
  'confidential',
  'highly_confidential'
);

CREATE TYPE assessment_type AS ENUM (
  'initial',
  'periodic',
  'specialized',
  'other'
);

CREATE TYPE case_plan_status AS ENUM (
  'draft',
  'active',
  'completed',
  'archived'
);

CREATE TYPE case_plan_item_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE case_note_type AS ENUM (
  'general',
  'assessment',
  'plan_review',
  'incident',
  'progress',
  'communication',
  'safeguarding',
  'other'
);

CREATE TYPE safeguarding_status AS ENUM (
  'reported',
  'initial_review',
  'action_required',
  'under_investigation',
  'resolved',
  'closed'
);

CREATE TYPE safeguarding_severity AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

CREATE TYPE safeguarding_concern_type AS ENUM (
  'abuse',
  'neglect',
  'exploitation',
  'violence',
  'missing_child',
  'self_harm',
  'unsafe_environment',
  'trafficking',
  'other'
);

CREATE TYPE escalation_status AS ENUM (
  'pending',
  'acknowledged',
  'in_progress',
  'completed'
);

-- ─── Cases Table ─────────────────────────────────────────────

CREATE TABLE cases (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  reference_number    TEXT NOT NULL UNIQUE,
  child_id            UUID NOT NULL REFERENCES children(id),
  title               TEXT NOT NULL,
  description         TEXT,
  case_type           case_type NOT NULL,
  status              case_status NOT NULL DEFAULT 'open',
  priority            case_priority NOT NULL DEFAULT 'medium',
  classification      case_classification NOT NULL DEFAULT 'standard',
  assigned_to         UUID,
  opened_by           UUID NOT NULL,
  opened_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at           TIMESTAMPTZ,
  resolved_at         TIMESTAMPTZ,
  resolution_notes    TEXT,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cases_centre_id ON cases(centre_id);
CREATE INDEX idx_cases_child_id ON cases(child_id);
CREATE INDEX idx_cases_status ON cases(centre_id, status);
CREATE INDEX idx_cases_reference ON cases(reference_number);
CREATE INDEX idx_cases_assigned ON cases(centre_id, assigned_to) WHERE assigned_to IS NOT NULL;

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY cases_select_centre ON cases
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY cases_insert_admin ON cases
  FOR INSERT WITH CHECK (false);
CREATE POLICY cases_update_admin ON cases
  FOR UPDATE USING (false);
CREATE POLICY cases_delete_admin ON cases
  FOR DELETE USING (false);
CREATE POLICY cases_deny_authenticated_insert ON cases
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY cases_deny_authenticated_update ON cases
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY cases_deny_authenticated_delete ON cases
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Case Status History ─────────────────────────────────────

CREATE TABLE case_status_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id             UUID NOT NULL REFERENCES cases(id),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  previous_status     case_status,
  new_status          case_status NOT NULL,
  changed_by          UUID,
  changed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason              TEXT
);

CREATE INDEX idx_case_status_history_case ON case_status_history(case_id);
CREATE INDEX idx_case_status_history_centre ON case_status_history(centre_id);

ALTER TABLE case_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY case_status_history_select_centre ON case_status_history
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY case_status_history_insert_admin ON case_status_history
  FOR INSERT WITH CHECK (false);
CREATE POLICY case_status_history_deny_authenticated_insert ON case_status_history
  FOR INSERT TO authenticated WITH CHECK (false);

-- ─── Case Assessments ────────────────────────────────────────

CREATE TABLE case_assessments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id             UUID NOT NULL REFERENCES cases(id),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  assessment_type     assessment_type NOT NULL,
  title               TEXT NOT NULL,
  summary             TEXT,
  findings            TEXT,
  recommendations     TEXT,
  conducted_by        UUID NOT NULL,
  conducted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_review_date    DATE,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_assessments_case ON case_assessments(case_id);
CREATE INDEX idx_case_assessments_centre ON case_assessments(centre_id);

ALTER TABLE case_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY case_assessments_select_centre ON case_assessments
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY case_assessments_insert_admin ON case_assessments
  FOR INSERT WITH CHECK (false);
CREATE POLICY case_assessments_update_admin ON case_assessments
  FOR UPDATE USING (false);
CREATE POLICY case_assessments_delete_admin ON case_assessments
  FOR DELETE USING (false);
CREATE POLICY case_assessments_deny_authenticated_insert ON case_assessments
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY case_assessments_deny_authenticated_update ON case_assessments
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY case_assessments_deny_authenticated_delete ON case_assessments
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_case_assessments_updated_at
  BEFORE UPDATE ON case_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Case Plans ──────────────────────────────────────────────

CREATE TABLE case_plans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id             UUID NOT NULL REFERENCES cases(id),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  title               TEXT NOT NULL,
  description         TEXT,
  status              case_plan_status NOT NULL DEFAULT 'draft',
  start_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date            DATE,
  review_frequency    TEXT,
  next_review_date    DATE,
  created_by          UUID NOT NULL,
  approved_by         UUID,
  approved_at         TIMESTAMPTZ,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_plans_case ON case_plans(case_id);
CREATE INDEX idx_case_plans_centre ON case_plans(centre_id);
CREATE INDEX idx_case_plans_status ON case_plans(centre_id, status);

ALTER TABLE case_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY case_plans_select_centre ON case_plans
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY case_plans_insert_admin ON case_plans
  FOR INSERT WITH CHECK (false);
CREATE POLICY case_plans_update_admin ON case_plans
  FOR UPDATE USING (false);
CREATE POLICY case_plans_delete_admin ON case_plans
  FOR DELETE USING (false);
CREATE POLICY case_plans_deny_authenticated_insert ON case_plans
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY case_plans_deny_authenticated_update ON case_plans
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY case_plans_deny_authenticated_delete ON case_plans
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_case_plans_updated_at
  BEFORE UPDATE ON case_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Case Plan Items ─────────────────────────────────────────

CREATE TABLE case_plan_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_plan_id        UUID NOT NULL REFERENCES case_plans(id) ON DELETE CASCADE,
  centre_id           UUID NOT NULL REFERENCES centres(id),
  objective           TEXT NOT NULL,
  description         TEXT,
  status              case_plan_item_status NOT NULL DEFAULT 'pending',
  responsible_person  UUID,
  target_date         DATE,
  completed_date      DATE,
  completion_notes    TEXT,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_plan_items_plan ON case_plan_items(case_plan_id);
CREATE INDEX idx_case_plan_items_centre ON case_plan_items(centre_id);

ALTER TABLE case_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY case_plan_items_select_centre ON case_plan_items
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY case_plan_items_insert_admin ON case_plan_items
  FOR INSERT WITH CHECK (false);
CREATE POLICY case_plan_items_update_admin ON case_plan_items
  FOR UPDATE USING (false);
CREATE POLICY case_plan_items_delete_admin ON case_plan_items
  FOR DELETE USING (false);
CREATE POLICY case_plan_items_deny_authenticated_insert ON case_plan_items
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY case_plan_items_deny_authenticated_update ON case_plan_items
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY case_plan_items_deny_authenticated_delete ON case_plan_items
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_case_plan_items_updated_at
  BEFORE UPDATE ON case_plan_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Interventions ───────────────────────────────────────────

CREATE TABLE interventions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id             UUID NOT NULL REFERENCES cases(id),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  case_plan_item_id   UUID REFERENCES case_plan_items(id),
  title               TEXT NOT NULL,
  description         TEXT,
  intervention_type   TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'planned',
  scheduled_date      DATE,
  completed_date      DATE,
  outcome             TEXT,
  notes               TEXT,
  conducted_by        UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interventions_case ON interventions(case_id);
CREATE INDEX idx_interventions_centre ON interventions(centre_id);
CREATE INDEX idx_interventions_plan_item ON interventions(case_plan_item_id) WHERE case_plan_item_id IS NOT NULL;

ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY interventions_select_centre ON interventions
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY interventions_insert_admin ON interventions
  FOR INSERT WITH CHECK (false);
CREATE POLICY interventions_update_admin ON interventions
  FOR UPDATE USING (false);
CREATE POLICY interventions_delete_admin ON interventions
  FOR DELETE USING (false);
CREATE POLICY interventions_deny_authenticated_insert ON interventions
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY interventions_deny_authenticated_update ON interventions
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY interventions_deny_authenticated_delete ON interventions
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_interventions_updated_at
  BEFORE UPDATE ON interventions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Case Notes (immutable after creation) ───────────────────

CREATE TABLE case_notes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id             UUID NOT NULL REFERENCES cases(id),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  note_type           case_note_type NOT NULL DEFAULT 'general',
  content             TEXT NOT NULL,
  author_id           UUID NOT NULL,
  author_name         TEXT,
  is_pinned           BOOLEAN NOT NULL DEFAULT false,
  version             INTEGER NOT NULL DEFAULT 1,
  parent_note_id      UUID REFERENCES case_notes(id),
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_notes_case ON case_notes(case_id);
CREATE INDEX idx_case_notes_centre ON case_notes(centre_id);
CREATE INDEX idx_case_notes_type ON case_notes(case_id, note_type);
CREATE INDEX idx_case_notes_parent ON case_notes(parent_note_id) WHERE parent_note_id IS NOT NULL;

ALTER TABLE case_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY case_notes_select_centre ON case_notes
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY case_notes_insert_admin ON case_notes
  FOR INSERT WITH CHECK (false);
CREATE POLICY case_notes_update_admin ON case_notes
  FOR UPDATE USING (false);
CREATE POLICY case_notes_delete_admin ON case_notes
  FOR DELETE USING (false);
CREATE POLICY case_notes_deny_authenticated_insert ON case_notes
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY case_notes_deny_authenticated_update ON case_notes
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY case_notes_deny_authenticated_delete ON case_notes
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_case_notes_updated_at
  BEFORE UPDATE ON case_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Case Documents ──────────────────────────────────────────

CREATE TABLE case_documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id             UUID NOT NULL REFERENCES cases(id),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  file_name           TEXT NOT NULL,
  file_type           TEXT,
  file_size           BIGINT,
  storage_path        TEXT NOT NULL,
  classification      case_classification NOT NULL DEFAULT 'standard',
  uploaded_by         UUID NOT NULL,
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata            JSONB
);

CREATE INDEX idx_case_documents_case ON case_documents(case_id);
CREATE INDEX idx_case_documents_centre ON case_documents(centre_id);

ALTER TABLE case_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY case_documents_select_centre ON case_documents
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY case_documents_insert_admin ON case_documents
  FOR INSERT WITH CHECK (false);
CREATE POLICY case_documents_delete_admin ON case_documents
  FOR DELETE USING (false);
CREATE POLICY case_documents_deny_authenticated_insert ON case_documents
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY case_documents_deny_authenticated_delete ON case_documents
  FOR DELETE TO authenticated USING (false);

-- ─── Safeguarding Concerns ───────────────────────────────────

CREATE TABLE safeguarding_concerns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  child_id            UUID NOT NULL REFERENCES children(id),
  case_id             UUID REFERENCES cases(id),
  concern_type        safeguarding_concern_type NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT NOT NULL,
  severity            safeguarding_severity NOT NULL DEFAULT 'medium',
  status              safeguarding_status NOT NULL DEFAULT 'reported',
  reported_by         UUID NOT NULL,
  reported_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_to         UUID,
  location            TEXT,
  witnesses           TEXT,
  evidence_summary    TEXT,
  action_taken        TEXT,
  external_referral   BOOLEAN NOT NULL DEFAULT false,
  external_agency     TEXT,
  external_reference  TEXT,
  resolved_at         TIMESTAMPTZ,
  resolution_notes    TEXT,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_safeguarding_concerns_centre ON safeguarding_concerns(centre_id);
CREATE INDEX idx_safeguarding_concerns_child ON safeguarding_concerns(child_id);
CREATE INDEX idx_safeguarding_concerns_case ON safeguarding_concerns(case_id) WHERE case_id IS NOT NULL;
CREATE INDEX idx_safeguarding_concerns_status ON safeguarding_concerns(centre_id, status);
CREATE INDEX idx_safeguarding_concerns_severity ON safeguarding_concerns(centre_id, severity);
CREATE INDEX idx_safeguarding_concerns_assigned ON safeguarding_concerns(centre_id, assigned_to) WHERE assigned_to IS NOT NULL;

ALTER TABLE safeguarding_concerns ENABLE ROW LEVEL SECURITY;

CREATE POLICY safeguarding_concerns_select_centre ON safeguarding_concerns
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY safeguarding_concerns_insert_admin ON safeguarding_concerns
  FOR INSERT WITH CHECK (false);
CREATE POLICY safeguarding_concerns_update_admin ON safeguarding_concerns
  FOR UPDATE USING (false);
CREATE POLICY safeguarding_concerns_delete_admin ON safeguarding_concerns
  FOR DELETE USING (false);
CREATE POLICY safeguarding_concerns_deny_authenticated_insert ON safeguarding_concerns
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY safeguarding_concerns_deny_authenticated_update ON safeguarding_concerns
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY safeguarding_concerns_deny_authenticated_delete ON safeguarding_concerns
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_safeguarding_concerns_updated_at
  BEFORE UPDATE ON safeguarding_concerns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Safeguarding Status History ─────────────────────────────

CREATE TABLE safeguarding_status_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concern_id          UUID NOT NULL REFERENCES safeguarding_concerns(id),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  previous_status     safeguarding_status,
  new_status          safeguarding_status NOT NULL,
  changed_by          UUID,
  changed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason              TEXT
);

CREATE INDEX idx_safeguarding_status_history_concern ON safeguarding_status_history(concern_id);
CREATE INDEX idx_safeguarding_status_history_centre ON safeguarding_status_history(centre_id);

ALTER TABLE safeguarding_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY safeguarding_status_history_select_centre ON safeguarding_status_history
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY safeguarding_status_history_insert_admin ON safeguarding_status_history
  FOR INSERT WITH CHECK (false);
CREATE POLICY safeguarding_status_history_deny_authenticated_insert ON safeguarding_status_history
  FOR INSERT TO authenticated WITH CHECK (false);

-- ─── Safeguarding Actions ────────────────────────────────────

CREATE TABLE safeguarding_actions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concern_id          UUID NOT NULL REFERENCES safeguarding_concerns(id),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  action_type         TEXT NOT NULL,
  description         TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending',
  assigned_to         UUID,
  due_date            DATE,
  completed_date      DATE,
  outcome             TEXT,
  notes               TEXT,
  created_by          UUID NOT NULL,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_safeguarding_actions_concern ON safeguarding_actions(concern_id);
CREATE INDEX idx_safeguarding_actions_centre ON safeguarding_actions(centre_id);
CREATE INDEX idx_safeguarding_actions_status ON safeguarding_actions(centre_id, status);
CREATE INDEX idx_safeguarding_actions_assigned ON safeguarding_actions(centre_id, assigned_to) WHERE assigned_to IS NOT NULL;

ALTER TABLE safeguarding_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY safeguarding_actions_select_centre ON safeguarding_actions
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY safeguarding_actions_insert_admin ON safeguarding_actions
  FOR INSERT WITH CHECK (false);
CREATE POLICY safeguarding_actions_update_admin ON safeguarding_actions
  FOR UPDATE USING (false);
CREATE POLICY safeguarding_actions_delete_admin ON safeguarding_actions
  FOR DELETE USING (false);
CREATE POLICY safeguarding_actions_deny_authenticated_insert ON safeguarding_actions
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY safeguarding_actions_deny_authenticated_update ON safeguarding_actions
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY safeguarding_actions_deny_authenticated_delete ON safeguarding_actions
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_safeguarding_actions_updated_at
  BEFORE UPDATE ON safeguarding_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Safeguarding Escalations ────────────────────────────────

CREATE TABLE safeguarding_escalations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concern_id          UUID NOT NULL REFERENCES safeguarding_concerns(id),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  title               TEXT NOT NULL,
  description         TEXT NOT NULL,
  reason              TEXT NOT NULL,
  status              escalation_status NOT NULL DEFAULT 'pending',
  escalated_by        UUID NOT NULL,
  escalated_to        UUID,
  escalated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at     TIMESTAMPTZ,
  resolved_at         TIMESTAMPTZ,
  resolution_notes    TEXT,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_safeguarding_escalations_concern ON safeguarding_escalations(concern_id);
CREATE INDEX idx_safeguarding_escalations_centre ON safeguarding_escalations(centre_id);
CREATE INDEX idx_safeguarding_escalations_status ON safeguarding_escalations(centre_id, status);

ALTER TABLE safeguarding_escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY safeguarding_escalations_select_centre ON safeguarding_escalations
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY safeguarding_escalations_insert_admin ON safeguarding_escalations
  FOR INSERT WITH CHECK (false);
CREATE POLICY safeguarding_escalations_update_admin ON safeguarding_escalations
  FOR UPDATE USING (false);
CREATE POLICY safeguarding_escalations_delete_admin ON safeguarding_escalations
  FOR DELETE USING (false);
CREATE POLICY safeguarding_escalations_deny_authenticated_insert ON safeguarding_escalations
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY safeguarding_escalations_deny_authenticated_update ON safeguarding_escalations
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY safeguarding_escalations_deny_authenticated_delete ON safeguarding_escalations
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_safeguarding_escalations_updated_at
  BEFORE UPDATE ON safeguarding_escalations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Safeguarding Documents ──────────────────────────────────

CREATE TABLE safeguarding_documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concern_id          UUID NOT NULL REFERENCES safeguarding_concerns(id),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  file_name           TEXT NOT NULL,
  file_type           TEXT,
  file_size           BIGINT,
  storage_path        TEXT NOT NULL,
  uploaded_by         UUID NOT NULL,
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata            JSONB
);

CREATE INDEX idx_safeguarding_documents_concern ON safeguarding_documents(concern_id);
CREATE INDEX idx_safeguarding_documents_centre ON safeguarding_documents(centre_id);

ALTER TABLE safeguarding_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY safeguarding_documents_select_centre ON safeguarding_documents
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY safeguarding_documents_insert_admin ON safeguarding_documents
  FOR INSERT WITH CHECK (false);
CREATE POLICY safeguarding_documents_delete_admin ON safeguarding_documents
  FOR DELETE USING (false);
CREATE POLICY safeguarding_documents_deny_authenticated_insert ON safeguarding_documents
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY safeguarding_documents_deny_authenticated_delete ON safeguarding_documents
  FOR DELETE TO authenticated USING (false);

-- ─── Permissions ─────────────────────────────────────────────

INSERT INTO permissions (module, action, description)
VALUES
  ('cases', 'view', 'View case records within own centre'),
  ('cases', 'create', 'Create new case records'),
  ('cases', 'update', 'Update case records'),
  ('cases', 'status.update', 'Update case status'),
  ('cases', 'close', 'Close case records'),
  ('cases', 'assessments.view', 'View case assessments'),
  ('cases', 'assessments.create', 'Create case assessments'),
  ('cases', 'assessments.update', 'Update case assessments'),
  ('cases', 'plans.view', 'View case plans'),
  ('cases', 'plans.create', 'Create case plans'),
  ('cases', 'plans.update', 'Update case plans'),
  ('cases', 'plans.approve', 'Approve case plans'),
  ('cases', 'notes.view', 'View case notes'),
  ('cases', 'notes.create', 'Create case notes'),
  ('cases', 'interventions.view', 'View interventions'),
  ('cases', 'interventions.create', 'Create interventions'),
  ('cases', 'interventions.update', 'Update interventions'),
  ('cases', 'documents.view', 'View case documents'),
  ('cases', 'documents.upload', 'Upload case documents'),
  ('cases', 'documents.download', 'Download case documents'),
  ('cases', 'documents.delete', 'Delete case documents'),
  ('safeguarding', 'view', 'View safeguarding concerns within own centre'),
  ('safeguarding', 'create', 'Create safeguarding concerns'),
  ('safeguarding', 'update', 'Update safeguarding concerns'),
  ('safeguarding', 'status.update', 'Update safeguarding status'),
  ('safeguarding', 'escalate', 'Escalate safeguarding concerns'),
  ('safeguarding', 'actions.view', 'View safeguarding actions'),
  ('safeguarding', 'actions.create', 'Create safeguarding actions'),
  ('safeguarding', 'actions.update', 'Update safeguarding actions'),
  ('safeguarding', 'documents.view', 'View safeguarding documents'),
  ('safeguarding', 'documents.upload', 'Upload safeguarding documents'),
  ('safeguarding', 'documents.download', 'Download safeguarding documents'),
  ('safeguarding', 'documents.delete', 'Delete safeguarding documents'),
  ('safeguarding', 'escalations.view', 'View safeguarding escalations'),
  ('safeguarding', 'escalations.acknowledge', 'Acknowledge safeguarding escalations'),
  ('safeguarding', 'escalations.resolve', 'Resolve safeguarding escalations')
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

  -- CENTRE_MANAGER: all cases + safeguarding permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT mgr, id FROM permissions WHERE module IN ('cases', 'safeguarding')
  ON CONFLICT DO NOTHING;

  -- SOCIAL_WORKER: all cases + safeguarding permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT sw, id FROM permissions WHERE module IN ('cases', 'safeguarding')
  ON CONFLICT DO NOTHING;

  -- CAREGIVER: cases.view, safeguarding.view only
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT cg, id FROM permissions
  WHERE (module = 'cases' AND action = 'view')
     OR (module = 'safeguarding' AND action = 'view')
  ON CONFLICT DO NOTHING;

  -- RECORDS_OFFICER: cases.view, cases.documents.*, safeguarding.view
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT ro, id FROM permissions
  WHERE (module = 'cases' AND action IN ('view', 'documents.view', 'documents.upload', 'documents.download'))
     OR (module = 'safeguarding' AND action IN ('view', 'documents.view', 'documents.upload', 'documents.download'))
  ON CONFLICT DO NOTHING;
END $$;

-- ─── Done ────────────────────────────────────────────────────
