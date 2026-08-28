-- =============================================================================
-- Migration: Create centres table (multi-tenant foundation)
-- Created: 2026-08-25
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Custom types
-- -----------------------------------------------------------------------------

CREATE TYPE centre_status AS ENUM ('active', 'suspended', 'deactivated');

-- -----------------------------------------------------------------------------
-- 2. Helper: auto-update updated_at on row modification
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 3. Centres table
-- -----------------------------------------------------------------------------

CREATE TABLE centres (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  code          TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city          TEXT,
  state         TEXT,
  postal_code   TEXT,
  country       TEXT NOT NULL DEFAULT 'Nigeria',
  status        centre_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique centre code (case-insensitive via citext or lower() index)
CREATE UNIQUE INDEX idx_centres_code_lower ON centres (lower(code));

-- Filter by status
CREATE INDEX idx_centres_status ON centres (status);

-- Trigger to auto-update updated_at
CREATE TRIGGER set_centres_updated_at
  BEFORE UPDATE ON centres
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 4. Tenant isolation helper: extract centre_id from JWT
-- -----------------------------------------------------------------------------
-- This function reads the current Centre ID from the authenticated user's JWT.
-- The application layer must ensure the JWT contains the correct 'centre_id'
-- claim. This prevents client-supplied centre_id from being trusted directly.

CREATE OR REPLACE FUNCTION public.current_centre_id()
RETURNS UUID AS $$
  SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'centre_id')::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 5. Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE centres ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can only read centres matching their JWT centre_id.
-- This enforces tenant isolation at the database level.
CREATE POLICY "centres_select_own"
  ON centres
  FOR SELECT
  TO authenticated
  USING (id = public.current_centre_id());

-- Policy: Authenticated users cannot insert centres directly.
-- Centre creation must go through the service-role admin client.
CREATE POLICY "centres_insert_admin"
  ON centres
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Authenticated users cannot update other centres.
-- Updates must go through the service-role admin client or
-- be restricted to the user's own centre.
CREATE POLICY "centres_update_admin"
  ON centres
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Soft-delete is admin-only.
CREATE POLICY "centres_delete_admin"
  ON centres
  FOR DELETE
  TO service_role
  USING (true);

-- Note: When a user belongs to multiple centres in the future, the SELECT policy
-- must be updated to check against a user_centres junction table:
--   USING (id IN (SELECT centre_id FROM user_centres WHERE user_id = auth.uid()));
