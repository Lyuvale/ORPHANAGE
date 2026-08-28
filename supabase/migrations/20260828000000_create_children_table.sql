-- =============================================================================
-- Migration: Child Record Foundation
-- Created: 2026-08-28
-- =============================================================================
-- This migration creates the children table — the central entity for child
-- management. Every child belongs to exactly one centre.
--
-- PRINCIPLES:
--   - Centre-scoped: every record has centre_id for tenant isolation
--   - Unique reference numbers: human-readable, centre-scoped, never reused
--   - Append-only status history: status changes are recorded, not overwritten
--   - Soft lifecycle: children are never physically deleted
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Child status enum
-- -----------------------------------------------------------------------------

CREATE TYPE child_status AS ENUM (
  'active',
  'transferred',
  'graduated',
  'alumni',
  'deactivated'
);

-- -----------------------------------------------------------------------------
-- 2. Child reference number generation
-- -----------------------------------------------------------------------------
-- Generates a unique, stable reference in the format: {centre_code}-{sequence}
-- Example: ABC-00042
-- The reference is unique per centre and never reused.

CREATE OR REPLACE FUNCTION generate_child_reference(p_centre_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_centre_code TEXT;
  v_next_number INTEGER;
  v_ref TEXT;
BEGIN
  -- Look up the centre code
  SELECT code INTO v_centre_code
  FROM centres
  WHERE id = p_centre_id;

  IF v_centre_code IS NULL THEN
    RAISE EXCEPTION 'Centre not found: %', p_centre_id;
  END IF;

  -- Get the next sequence number for this centre
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(reference_number FROM '[0-9]+$') AS INTEGER)
  ), 0) + 1
  INTO v_next_number
  FROM children
  WHERE centre_id = p_centre_id;

  v_ref := v_centre_code || '-' || LPAD(v_next_number::TEXT, 6, '0');

  RETURN v_ref;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. Children table
-- -----------------------------------------------------------------------------

CREATE TABLE children (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id       UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  reference_number TEXT NOT NULL,
  first_name      TEXT NOT NULL,
  middle_name     TEXT,
  last_name       TEXT NOT NULL,
  preferred_name  TEXT,
  date_of_birth   DATE NOT NULL,
  gender          TEXT NOT NULL,
  nationality     TEXT,
  photo_url       TEXT,
  status          child_status NOT NULL DEFAULT 'active',
  admission_date  DATE NOT NULL,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Reference number must be unique within a centre
  CONSTRAINT children_centre_reference_unique UNIQUE (centre_id, reference_number),

  -- Gender must be a reasonable value
  CONSTRAINT children_gender_check CHECK (
    gender IN ('male', 'female', 'other', 'undisclosed')
  ),

  -- Date of birth must be in the past
  CONSTRAINT children_dob_check CHECK (date_of_birth <= CURRENT_DATE),

  -- Admission date must be today or in the past
  CONSTRAINT children_admission_date_check CHECK (admission_date <= CURRENT_DATE),

  -- Admission date must not be before date of birth
  CONSTRAINT children_admission_dob_check CHECK (admission_date >= date_of_birth)
);

-- -----------------------------------------------------------------------------
-- 4. Indexes for common queries
-- -----------------------------------------------------------------------------

CREATE INDEX idx_children_centre_id ON children (centre_id);
CREATE INDEX idx_children_reference_number ON children (reference_number);
CREATE INDEX idx_children_status ON children (status);
CREATE INDEX idx_children_centre_status ON children (centre_id, status);
CREATE INDEX idx_children_date_of_birth ON children (date_of_birth);
CREATE INDEX idx_children_centre_name ON children (centre_id, last_name, first_name);

-- -----------------------------------------------------------------------------
-- 5. Updated-at trigger
-- -----------------------------------------------------------------------------

CREATE TRIGGER set_children_updated_at
  BEFORE UPDATE ON children
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 6. Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE children ENABLE ROW LEVEL SECURITY;

-- Centre users can read children belonging to their centre
CREATE POLICY "children_select_centre"
  ON children FOR SELECT
  TO authenticated
  USING (centre_id = public.current_centre_id());

-- All writes are admin-only (service_role)
CREATE POLICY "children_insert_admin"
  ON children FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "children_update_admin"
  ON children FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "children_delete_admin"
  ON children FOR DELETE
  TO service_role
  USING (false);

-- Defense in depth: deny authenticated writes
CREATE POLICY "children_deny_authenticated_insert"
  ON children FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "children_deny_authenticated_update"
  ON children FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "children_deny_authenticated_delete"
  ON children FOR DELETE
  TO authenticated
  USING (false);

-- -----------------------------------------------------------------------------
-- 7. Child status history
-- -----------------------------------------------------------------------------
-- Records every status change. Never updated or deleted.

CREATE TABLE child_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id        UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  centre_id       UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  previous_status child_status,
  new_status      child_status NOT NULL,
  changed_by      UUID REFERENCES auth.users(id),
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason          TEXT
);

CREATE INDEX idx_child_status_history_child_id ON child_status_history (child_id);
CREATE INDEX idx_child_status_history_centre_id ON child_status_history (centre_id);
CREATE INDEX idx_child_status_history_changed_at ON child_status_history (changed_at);

-- RLS: same centre-scoped pattern
ALTER TABLE child_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "child_status_history_select_centre"
  ON child_status_history FOR SELECT
  TO authenticated
  USING (centre_id = public.current_centre_id());

CREATE POLICY "child_status_history_insert_admin"
  ON child_status_history FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "child_status_history_deny_authenticated_insert"
  ON child_status_history FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "child_status_history_deny_authenticated_update"
  ON child_status_history FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "child_status_history_deny_authenticated_delete"
  ON child_status_history FOR DELETE
  TO authenticated
  USING (false);
