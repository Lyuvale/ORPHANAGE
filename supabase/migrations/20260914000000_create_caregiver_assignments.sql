-- =============================================================================
-- Migration: Caregiver-to-Child Assignment
-- Created: 2026-09-14
-- =============================================================================
-- Links caregivers (users with CAREGIVER role) to specific children.
-- Centre Manager assigns Child → Caregiver.
-- A Caregiver can ONLY see children assigned to them.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Caregiver assignment table
-- -----------------------------------------------------------------------------

CREATE TABLE child_caregivers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id       UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  child_id        UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  caregiver_id    UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  assigned_by     UUID REFERENCES auth.users(id),
  start_date      DATE NOT NULL DEFAULT current_date,
  end_date        DATE,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (child_id, caregiver_id, centre_id)
);

CREATE INDEX idx_child_caregivers_centre ON child_caregivers (centre_id);
CREATE INDEX idx_child_caregivers_child ON child_caregivers (child_id);
CREATE INDEX idx_child_caregivers_caregiver ON child_caregivers (caregiver_id);
CREATE INDEX idx_child_caregivers_status ON child_caregivers (centre_id, status);

-- Prevent overlapping active assignments for the same child
CREATE UNIQUE INDEX idx_child_caregivers_active
  ON child_caregivers (child_id, centre_id)
  WHERE status = 'active';

CREATE TRIGGER set_child_caregivers_updated_at
  BEFORE UPDATE ON child_caregivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 2. RLS policies
-- -----------------------------------------------------------------------------

ALTER TABLE child_caregivers ENABLE ROW LEVEL SECURITY;

-- Centre-scoped read
CREATE POLICY child_caregivers_select_centre
  ON child_caregivers FOR SELECT TO authenticated
  USING (centre_id = public.current_centre_id());

-- Writes are service-role only (enforced via server actions/API)
CREATE POLICY child_caregivers_insert_admin
  ON child_caregivers FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY child_caregivers_update_admin
  ON child_caregivers FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY child_caregivers_delete_admin
  ON child_caregivers FOR DELETE TO service_role USING (true);

-- -----------------------------------------------------------------------------
-- 3. Helper: get children assigned to a caregiver
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_caregiver_child_ids(p_caregiver_profile_id UUID)
RETURNS SETOF UUID AS $$
  SELECT child_id FROM child_caregivers
  WHERE caregiver_id = p_caregiver_profile_id
    AND centre_id = public.current_centre_id()
    AND status = 'active'
$$ LANGUAGE sql STABLE SECURITY DEFINER;
