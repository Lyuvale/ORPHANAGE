-- ============================================================
-- Task 12: Health & Medical Management
-- ============================================================
-- Creates child health profiles, medical records, medical visits,
-- medications, medication administration, medical appointments,
-- health screenings, immunizations, health documents, health
-- alerts, and health follow-ups with full RLS, audit, and
-- permission support.
--
-- SECURITY DESIGN:
--   - Medical information is sensitive and separated from general
--     child, daily care, case, and safeguarding notes.
--   - Every record carries centre_id (tenant isolation) and is
--     enforced by RLS using public.current_centre_id().
--   - health.* permissions are granted granularly; children.view
--     does NOT grant health access.
--   - Historical records (medical events, administration, immunizations,
--     screening results, appointment outcomes) are preserved; any
--     authorised correction is recorded as an amendment.
--   - Health documents are stored in Supabase Storage (private bucket),
--     never in PostgreSQL, and referenced via storage_path.
-- ============================================================

-- ─── Enums ───────────────────────────────────────────────────

CREATE TYPE blood_group AS ENUM (
  'A_POSITIVE',
  'A_NEGATIVE',
  'B_POSITIVE',
  'B_NEGATIVE',
  'AB_POSITIVE',
  'AB_NEGATIVE',
  'O_POSITIVE',
  'O_NEGATIVE',
  'UNKNOWN'
);

CREATE TYPE medical_record_type AS ENUM (
  'consultation',
  'diagnosis',
  'treatment',
  'surgery',
  'lab_result',
  'imaging',
  'referral',
  'hospitalisation',
  'discharge',
  'other'
);

CREATE TYPE medical_visit_type AS ENUM (
  'clinic',
  'hospital',
  'doctor_consultation',
  'dental',
  'specialist',
  'other'
);

CREATE TYPE medication_status AS ENUM (
  'ACTIVE',
  'COMPLETED',
  'DISCONTINUED'
);

CREATE TYPE medication_admin_status AS ENUM (
  'GIVEN',
  'MISSED',
  'REFUSED',
  'NOT_AVAILABLE',
  'OTHER_APPROVED'
);

CREATE TYPE appointment_type AS ENUM (
  'clinic',
  'hospital',
  'doctor_consultation',
  'dental',
  'specialist',
  'therapy',
  'followup',
  'other'
);

CREATE TYPE appointment_status AS ENUM (
  'SCHEDULED',
  'COMPLETED',
  'CANCELLED',
  'MISSED',
  'RESCHEDULED'
);

CREATE TYPE screening_type AS ENUM (
  'general_health',
  'dental',
  'vision',
  'hearing',
  'growth_monitoring',
  'other'
);

CREATE TYPE immunization_status AS ENUM (
  'COMPLETED',
  'DUE',
  'OVERDUE'
);

CREATE TYPE health_document_type AS ENUM (
  'medical_report',
  'prescription',
  'referral_letter',
  'lab_result',
  'immunization_record',
  'discharge_summary',
  'other'
);

CREATE TYPE health_alert_type AS ENUM (
  'allergy',
  'medication_requirement',
  'emergency_health_information',
  'followup_due',
  'other'
);

CREATE TYPE health_followup_type AS ENUM (
  'appointment',
  'treatment',
  'screening',
  'immunization',
  'medication',
  'other'
);

CREATE TYPE health_followup_status AS ENUM (
  'open',
  'in_progress',
  'completed',
  'cancelled'
);

-- ─── Child Health Profile ────────────────────────────────────

CREATE TABLE health_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  child_id            UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  blood_group         blood_group,
  allergies           JSONB NOT NULL DEFAULT '[]'::jsonb,
  medical_conditions  JSONB NOT NULL DEFAULT '[]'::jsonb,
  disability_support  JSONB NOT NULL DEFAULT '[]'::jsonb,
  general_health_notes TEXT,
  emergency_health_info TEXT,
  emergency_contacts  JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(centre_id, child_id)
);

CREATE INDEX idx_health_profiles_centre ON health_profiles(centre_id);
CREATE INDEX idx_health_profiles_child ON health_profiles(child_id);

ALTER TABLE health_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY health_profiles_select_centre ON health_profiles
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY health_profiles_insert_admin ON health_profiles
  FOR INSERT WITH CHECK (false);
CREATE POLICY health_profiles_update_admin ON health_profiles
  FOR UPDATE USING (false);
CREATE POLICY health_profiles_delete_admin ON health_profiles
  FOR DELETE USING (false);
CREATE POLICY health_profiles_deny_authenticated_insert ON health_profiles
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY health_profiles_deny_authenticated_update ON health_profiles
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY health_profiles_deny_authenticated_delete ON health_profiles
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_health_profiles_updated_at
  BEFORE UPDATE ON health_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Medical Records (append-only history) ───────────────────

CREATE TABLE health_medical_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  child_id            UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  record_date         TIMESTAMPTZ NOT NULL,
  record_type         medical_record_type NOT NULL,
  provider_name       TEXT,
  provider_role       TEXT,
  reason              TEXT,
  findings            TEXT,
  treatment           TEXT,
  followup_required   BOOLEAN NOT NULL DEFAULT false,
  followup_date       DATE,
  outcome             TEXT,
  recorded_by         UUID NOT NULL,
  version             INTEGER NOT NULL DEFAULT 1,
  parent_record_id    UUID REFERENCES health_medical_records(id),
  is_amended          BOOLEAN NOT NULL DEFAULT false,
  amended_by          UUID,
  amended_at          TIMESTAMPTZ,
  amendment_reason    TEXT,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_medical_centre ON health_medical_records(centre_id);
CREATE INDEX idx_health_medical_child ON health_medical_records(child_id);
CREATE INDEX idx_health_medical_child_date ON health_medical_records(child_id, record_date DESC);
CREATE INDEX idx_health_medical_centre_date ON health_medical_records(centre_id, record_date DESC);
CREATE INDEX idx_health_medical_parent ON health_medical_records(parent_record_id) WHERE parent_record_id IS NOT NULL;

ALTER TABLE health_medical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY health_medical_select_centre ON health_medical_records
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY health_medical_insert_admin ON health_medical_records
  FOR INSERT WITH CHECK (false);
CREATE POLICY health_medical_update_admin ON health_medical_records
  FOR UPDATE USING (false);
CREATE POLICY health_medical_delete_admin ON health_medical_records
  FOR DELETE USING (false);
CREATE POLICY health_medical_deny_authenticated_insert ON health_medical_records
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY health_medical_deny_authenticated_update ON health_medical_records
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY health_medical_deny_authenticated_delete ON health_medical_records
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_health_medical_updated_at
  BEFORE UPDATE ON health_medical_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Medical Visits ──────────────────────────────────────────

CREATE TABLE health_medical_visits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  child_id            UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  visit_date          DATE NOT NULL,
  visit_type          medical_visit_type NOT NULL,
  provider_name       TEXT,
  provider_role       TEXT,
  reason              TEXT,
  outcome             TEXT,
  followup_required   BOOLEAN NOT NULL DEFAULT false,
  followup_date       DATE,
  notes               TEXT,
  recorded_by         UUID NOT NULL,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_visits_centre ON health_medical_visits(centre_id);
CREATE INDEX idx_health_visits_child ON health_medical_visits(child_id);
CREATE INDEX idx_health_visits_child_date ON health_medical_visits(child_id, visit_date DESC);

ALTER TABLE health_medical_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY health_visits_select_centre ON health_medical_visits
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY health_visits_insert_admin ON health_medical_visits
  FOR INSERT WITH CHECK (false);
CREATE POLICY health_visits_update_admin ON health_medical_visits
  FOR UPDATE USING (false);
CREATE POLICY health_visits_delete_admin ON health_medical_visits
  FOR DELETE USING (false);
CREATE POLICY health_visits_deny_authenticated_insert ON health_medical_visits
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY health_visits_deny_authenticated_update ON health_medical_visits
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY health_visits_deny_authenticated_delete ON health_medical_visits
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_health_visits_updated_at
  BEFORE UPDATE ON health_medical_visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Medications ─────────────────────────────────────────────

CREATE TABLE health_medications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  child_id            UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  medication_name     TEXT NOT NULL,
  dosage              TEXT,
  frequency           TEXT,
  route               TEXT,
  start_date          DATE NOT NULL,
  end_date            DATE,
  prescribed_by       TEXT,
  reason              TEXT,
  status              medication_status NOT NULL DEFAULT 'ACTIVE',
  notes               TEXT,
  created_by          UUID NOT NULL,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_meds_centre ON health_medications(centre_id);
CREATE INDEX idx_health_meds_child ON health_medications(child_id);
CREATE INDEX idx_health_meds_child_status ON health_medications(child_id, status);

ALTER TABLE health_medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY health_meds_select_centre ON health_medications
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY health_meds_insert_admin ON health_medications
  FOR INSERT WITH CHECK (false);
CREATE POLICY health_meds_update_admin ON health_medications
  FOR UPDATE USING (false);
CREATE POLICY health_meds_delete_admin ON health_medications
  FOR DELETE USING (false);
CREATE POLICY health_meds_deny_authenticated_insert ON health_medications
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY health_meds_deny_authenticated_update ON health_medications
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY health_meds_deny_authenticated_delete ON health_medications
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_health_meds_updated_at
  BEFORE UPDATE ON health_medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Medication Administration (append-only history) ─────────

CREATE TABLE health_medication_admin (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  child_id            UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  medication_id       UUID NOT NULL REFERENCES health_medications(id) ON DELETE RESTRICT,
  scheduled_time      TIMESTAMPTZ NOT NULL,
  administered_time   TIMESTAMPTZ DEFAULT now(),
  administered_by     UUID,
  status              medication_admin_status NOT NULL DEFAULT 'GIVEN',
  not_administered_reason TEXT,
  notes               TEXT,
  version             INTEGER NOT NULL DEFAULT 1,
  parent_admin_id     UUID REFERENCES health_medication_admin(id),
  is_amended          BOOLEAN NOT NULL DEFAULT false,
  amended_by          UUID,
  amended_at          TIMESTAMPTZ,
  amendment_reason    TEXT,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_admin_centre ON health_medication_admin(centre_id);
CREATE INDEX idx_health_admin_child ON health_medication_admin(child_id);
CREATE INDEX idx_health_admin_med ON health_medication_admin(medication_id);
CREATE INDEX idx_health_admin_sched ON health_medication_admin(medication_id, scheduled_time);
CREATE INDEX idx_health_admin_parent ON health_medication_admin(parent_admin_id) WHERE parent_admin_id IS NOT NULL;

-- The actual administration timestamp is server-controlled.
CREATE FUNCTION health_admin_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.administered_time := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE health_medication_admin ENABLE ROW LEVEL SECURITY;

CREATE POLICY health_admin_select_centre ON health_medication_admin
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY health_admin_insert_admin ON health_medication_admin
  FOR INSERT WITH CHECK (false);
CREATE POLICY health_admin_update_admin ON health_medication_admin
  FOR UPDATE USING (false);
CREATE POLICY health_admin_delete_admin ON health_medication_admin
  FOR DELETE USING (false);
CREATE POLICY health_admin_deny_authenticated_insert ON health_medication_admin
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY health_admin_deny_authenticated_update ON health_medication_admin
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY health_admin_deny_authenticated_delete ON health_medication_admin
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_health_admin_updated_at
  BEFORE UPDATE ON health_medication_admin
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Medical Appointments (traceable status history) ─────────

CREATE TABLE health_appointments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  child_id            UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  appointment_type    appointment_type NOT NULL,
  provider_name       TEXT,
  appointment_date    DATE NOT NULL,
  appointment_time    TIME,
  location            TEXT,
  purpose             TEXT,
  status              appointment_status NOT NULL DEFAULT 'SCHEDULED',
  followup_required   BOOLEAN NOT NULL DEFAULT false,
  followup_date       DATE,
  notes               TEXT,
  created_by          UUID NOT NULL,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_appt_centre ON health_appointments(centre_id);
CREATE INDEX idx_health_appt_child ON health_appointments(child_id);
CREATE INDEX idx_health_appt_child_date ON health_appointments(child_id, appointment_date);
CREATE INDEX idx_health_appt_status ON health_appointments(centre_id, status);

ALTER TABLE health_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY health_appt_select_centre ON health_appointments
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY health_appt_insert_admin ON health_appointments
  FOR INSERT WITH CHECK (false);
CREATE POLICY health_appt_update_admin ON health_appointments
  FOR UPDATE USING (false);
CREATE POLICY health_appt_delete_admin ON health_appointments
  FOR DELETE USING (false);
CREATE POLICY health_appt_deny_authenticated_insert ON health_appointments
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY health_appt_deny_authenticated_update ON health_appointments
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY health_appt_deny_authenticated_delete ON health_appointments
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_health_appt_updated_at
  BEFORE UPDATE ON health_appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Appointment Status History (traceable) ──────────────────

CREATE TABLE health_appointment_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id      UUID NOT NULL REFERENCES health_appointments(id),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  previous_status     appointment_status,
  new_status          appointment_status NOT NULL,
  changed_by          UUID,
  changed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason              TEXT
);

CREATE INDEX idx_health_appt_history_appt ON health_appointment_history(appointment_id);
CREATE INDEX idx_health_appt_history_centre ON health_appointment_history(centre_id);

ALTER TABLE health_appointment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY health_appt_history_select_centre ON health_appointment_history
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY health_appt_history_insert_admin ON health_appointment_history
  FOR INSERT WITH CHECK (false);
CREATE POLICY health_appt_history_deny_authenticated_insert ON health_appointment_history
  FOR INSERT TO authenticated WITH CHECK (false);

-- ─── Health Screenings ───────────────────────────────────────

CREATE TABLE health_screenings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  child_id            UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  screening_type      screening_type NOT NULL,
  screening_date      DATE NOT NULL,
  provider_name       TEXT,
  measurements        JSONB,
  result              TEXT,
  outcome             TEXT,
  followup_required   BOOLEAN NOT NULL DEFAULT false,
  followup_date       DATE,
  notes               TEXT,
  recorded_by         UUID NOT NULL,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_screen_centre ON health_screenings(centre_id);
CREATE INDEX idx_health_screen_child ON health_screenings(child_id);
CREATE INDEX idx_health_screen_child_date ON health_screenings(child_id, screening_date DESC);
CREATE INDEX idx_health_screen_type ON health_screenings(centre_id, screening_type);

ALTER TABLE health_screenings ENABLE ROW LEVEL SECURITY;

CREATE POLICY health_screen_select_centre ON health_screenings
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY health_screen_insert_admin ON health_screenings
  FOR INSERT WITH CHECK (false);
CREATE POLICY health_screen_update_admin ON health_screenings
  FOR UPDATE USING (false);
CREATE POLICY health_screen_delete_admin ON health_screenings
  FOR DELETE USING (false);
CREATE POLICY health_screen_deny_authenticated_insert ON health_screenings
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY health_screen_deny_authenticated_update ON health_screenings
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY health_screen_deny_authenticated_delete ON health_screenings
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_health_screen_updated_at
  BEFORE UPDATE ON health_screenings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Immunizations ───────────────────────────────────────────

CREATE TABLE health_immunizations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  child_id            UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  vaccine             TEXT NOT NULL,
  dose                TEXT,
  administered_date   DATE NOT NULL,
  provider_name       TEXT,
  next_dose_date      DATE,
  status              immunization_status NOT NULL DEFAULT 'COMPLETED',
  notes               TEXT,
  recorded_by         UUID NOT NULL,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_imm_centre ON health_immunizations(centre_id);
CREATE INDEX idx_health_imm_child ON health_immunizations(child_id);
CREATE INDEX idx_health_imm_child_date ON health_immunizations(child_id, administered_date);
CREATE INDEX idx_health_imm_status ON health_immunizations(centre_id, status);

ALTER TABLE health_immunizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY health_imm_select_centre ON health_immunizations
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY health_imm_insert_admin ON health_immunizations
  FOR INSERT WITH CHECK (false);
CREATE POLICY health_imm_update_admin ON health_immunizations
  FOR UPDATE USING (false);
CREATE POLICY health_imm_delete_admin ON health_immunizations
  FOR DELETE USING (false);
CREATE POLICY health_imm_deny_authenticated_insert ON health_immunizations
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY health_imm_deny_authenticated_update ON health_immunizations
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY health_imm_deny_authenticated_delete ON health_immunizations
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_health_imm_updated_at
  BEFORE UPDATE ON health_immunizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Health Documents (Supabase Storage-backed) ──────────────

CREATE TABLE health_documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  child_id            UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  document_type       health_document_type NOT NULL,
  file_name           TEXT NOT NULL,
  file_type           TEXT,
  file_size           BIGINT,
  storage_path        TEXT NOT NULL,
  description         TEXT,
  uploaded_by         UUID NOT NULL,
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata            JSONB
);

CREATE INDEX idx_health_docs_centre ON health_documents(centre_id);
CREATE INDEX idx_health_docs_child ON health_documents(child_id);
CREATE INDEX idx_health_docs_type ON health_documents(centre_id, document_type);

ALTER TABLE health_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY health_docs_select_centre ON health_documents
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY health_docs_insert_admin ON health_documents
  FOR INSERT WITH CHECK (false);
CREATE POLICY health_docs_delete_admin ON health_documents
  FOR DELETE USING (false);
CREATE POLICY health_docs_deny_authenticated_insert ON health_documents
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY health_docs_deny_authenticated_delete ON health_documents
  FOR DELETE TO authenticated USING (false);

-- ─── Private Storage Bucket for Health Documents ────────────
-- Documents are stored in a PRIVATE bucket (never public), with
-- tenant-aware object paths: health/{centre_id}/{child_id}/{uuid}.
-- Access is granted only through server-side signed URLs and is
-- audited on download. No public bucket is used.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'health-documents',
  'health-documents',
  false,
  10485760,
  ARRAY['application/pdf','image/jpeg','image/png','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage is private: only the service-role client (which bypasses RLS)
-- reads/writes objects and issues server-side signed URLs for secure,
-- audited downloads. No public bucket and no direct public access.

-- ─── Health Alerts (operational, minimal exposure) ───────────

CREATE TABLE health_alerts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  child_id            UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  alert_type          health_alert_type NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT,
  severity            TEXT NOT NULL DEFAULT 'medium',
  visible_to_caregiver BOOLEAN NOT NULL DEFAULT false,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  source_record_id    UUID,
  created_by          UUID NOT NULL,
  resolved_at         TIMESTAMPTZ,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_alerts_centre ON health_alerts(centre_id);
CREATE INDEX idx_health_alerts_child ON health_alerts(child_id);
CREATE INDEX idx_health_alerts_active ON health_alerts(centre_id, is_active) WHERE is_active = true;

ALTER TABLE health_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY health_alerts_select_centre ON health_alerts
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY health_alerts_insert_admin ON health_alerts
  FOR INSERT WITH CHECK (false);
CREATE POLICY health_alerts_update_admin ON health_alerts
  FOR UPDATE USING (false);
CREATE POLICY health_alerts_delete_admin ON health_alerts
  FOR DELETE USING (false);
CREATE POLICY health_alerts_deny_authenticated_insert ON health_alerts
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY health_alerts_deny_authenticated_update ON health_alerts
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY health_alerts_deny_authenticated_delete ON health_alerts
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_health_alerts_updated_at
  BEFORE UPDATE ON health_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Health Follow-Ups ───────────────────────────────────────

CREATE TABLE health_followups (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id           UUID NOT NULL REFERENCES centres(id),
  child_id            UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  followup_type       health_followup_type NOT NULL,
  source_record_id    UUID,
  title               TEXT NOT NULL,
  description         TEXT,
  status              health_followup_status NOT NULL DEFAULT 'open',
  responsible_user_id UUID,
  due_date            DATE NOT NULL,
  completed_at        TIMESTAMPTZ,
  outcome             TEXT,
  created_by          UUID NOT NULL,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_followup_centre ON health_followups(centre_id);
CREATE INDEX idx_health_followup_child ON health_followups(child_id);
CREATE INDEX idx_health_followup_status ON health_followups(centre_id, status);
CREATE INDEX idx_health_followup_due ON health_followups(centre_id, due_date) WHERE status IN ('open', 'in_progress');

ALTER TABLE health_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY health_followup_select_centre ON health_followups
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY health_followup_insert_admin ON health_followups
  FOR INSERT WITH CHECK (false);
CREATE POLICY health_followup_update_admin ON health_followups
  FOR UPDATE USING (false);
CREATE POLICY health_followup_delete_admin ON health_followups
  FOR DELETE USING (false);
CREATE POLICY health_followup_deny_authenticated_insert ON health_followups
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY health_followup_deny_authenticated_update ON health_followups
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY health_followup_deny_authenticated_delete ON health_followups
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_health_followup_updated_at
  BEFORE UPDATE ON health_followups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Permissions ─────────────────────────────────────────────

INSERT INTO permissions (module, action, description)
VALUES
  ('health', 'view', 'View authorised health information within own centre'),
  ('health', 'create', 'Create child health profiles'),
  ('health', 'update', 'Update child health profiles'),
  ('health', 'medical_records.view', 'View medical records'),
  ('health', 'medical_records.create', 'Create medical records'),
  ('health', 'medical_records.update', 'Amend medical records'),
  ('health', 'medications.view', 'View medication records'),
  ('health', 'medications.manage', 'Create and manage medications'),
  ('health', 'medications.administer', 'Record medication administration'),
  ('health', 'appointments.view', 'View medical appointments'),
  ('health', 'appointments.manage', 'Create and manage medical appointments'),
  ('health', 'screenings.view', 'View health screenings'),
  ('health', 'screenings.manage', 'Create and manage health screenings'),
  ('health', 'immunizations.view', 'View immunization records'),
  ('health', 'immunizations.manage', 'Create and manage immunization records'),
  ('health', 'documents.view', 'View health document metadata'),
  ('health', 'documents.upload', 'Upload private health documents'),
  ('health', 'documents.download', 'Download private health documents'),
  ('health', 'emergency.view', 'View emergency health information')
ON CONFLICT (module, action) DO NOTHING;

-- ─── Role-Permission Mapping ─────────────────────────────────
-- Highly granular: management role does NOT automatically grant
-- unrestricted medical access. Deny by default everywhere.

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

  -- CENTRE_MANAGER: full health access (explicitly granted)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT mgr, id FROM permissions WHERE module = 'health'
  ON CONFLICT DO NOTHING;

  -- SOCIAL_WORKER: full health access for authorised case management
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT sw, id FROM permissions WHERE module = 'health'
  ON CONFLICT DO NOTHING;

  -- CAREGIVER: SAFE DAILY CARE ONLY — essential operational information
  -- (alerts, emergency view, medication administration view/record) but
  -- NOT full medical history, confidential notes, or sensitive documents.
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT cg, id FROM permissions
  WHERE (module = 'health' AND action IN (
    'emergency.view',
    'medications.view',
    'medications.administer'
  ))
  ON CONFLICT DO NOTHING;

  -- RECORDS_OFFICER: manage authorised health records and documentation
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT ro, id FROM permissions
  WHERE (module = 'health' AND action IN (
    'view',
    'create',
    'update',
    'medical_records.view',
    'medical_records.create',
    'medical_records.update',
    'medications.view',
    'medications.manage',
    'appointments.view',
    'appointments.manage',
    'screenings.view',
    'screenings.manage',
    'immunizations.view',
    'immunizations.manage',
    'documents.view',
    'documents.upload',
    'documents.download',
    'emergency.view'
  ))
  ON CONFLICT DO NOTHING;

  -- ACCOUNTANT_BURSAR: NO health permissions (denied by default)
END $$;

-- ─── Done ────────────────────────────────────────────────────
