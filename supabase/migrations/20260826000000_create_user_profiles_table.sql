-- =============================================================================
-- Migration: Create user_profiles table (user & centre identity foundation)
-- Created: 2026-08-26
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Custom types
-- -----------------------------------------------------------------------------

CREATE TYPE user_profile_status AS ENUM ('active', 'deactivated');

-- -----------------------------------------------------------------------------
-- 2. User profiles table
-- -----------------------------------------------------------------------------

CREATE TABLE user_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
  centre_id     UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  first_name    TEXT NOT NULL,
  middle_name   TEXT,
  last_name     TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  status        user_profile_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_user_profiles_centre_id ON user_profiles (centre_id);
CREATE INDEX idx_user_profiles_status ON user_profiles (status);
CREATE INDEX idx_user_profiles_auth_user_id ON user_profiles (auth_user_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 3. Updated tenant isolation: derive centre_id from user_profiles
-- -----------------------------------------------------------------------------
-- SECURITY: The centre_id is now derived from the database (user_profiles table),
-- NOT from JWT claims. This ensures the authoritative source is the DB,
-- and clients cannot fabricate or modify their centre assignment.

CREATE OR REPLACE FUNCTION public.current_centre_id()
RETURNS UUID AS $$
  SELECT centre_id FROM user_profiles
  WHERE auth_user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: check if the current user has an active profile
CREATE OR REPLACE FUNCTION public.has_active_profile()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE auth_user_id = auth.uid()
      AND status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 4. Row Level Security: user_profiles
-- -----------------------------------------------------------------------------

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "user_profiles_select_own"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- Policy: Users can read profiles in their own centre (for future user management)
CREATE POLICY "user_profiles_select_centre"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (centre_id = public.current_centre_id());

-- Policy: All inserts are admin-only (service_role)
CREATE POLICY "user_profiles_insert_admin"
  ON user_profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: All updates are admin-only (service_role)
CREATE POLICY "user_profiles_update_admin"
  ON user_profiles
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: All deletes are admin-only (service_role)
CREATE POLICY "user_profiles_delete_admin"
  ON user_profiles
  FOR DELETE
  TO service_role
  USING (true);

-- -----------------------------------------------------------------------------
-- 5. Update centres RLS: use user_profiles-based centre_id derivation
-- -----------------------------------------------------------------------------
-- Replace the old JWT-based centres_select_own with a user_profiles-based one.

DROP POLICY IF EXISTS "centres_select_own" ON centres;

CREATE POLICY "centres_select_own"
  ON centres
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.centre_id = centres.id
        AND user_profiles.auth_user_id = auth.uid()
        AND user_profiles.status = 'active'
    )
  );
