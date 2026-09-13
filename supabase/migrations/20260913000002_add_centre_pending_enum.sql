-- =============================================================================
-- Migration: Add 'pending' to the centre_status enum
-- Created: 2026-09-13
-- -----------------------------------------------------------------------------
-- New centres are created as 'pending' until a subscription is provisioned and
-- the centre is activated — an ACTIVE centre must always have a valid
-- subscription (see 20260913000003_enforce_subscription_invariants.sql).
--
-- PostgreSQL requires new enum values to be committed BEFORE they can be used
-- in any other statement, so this enum change lives in its OWN migration
-- (Supabase/the CLI run each migration file as one transaction).
-- =============================================================================

DO $$ BEGIN
  ALTER TYPE centre_status ADD VALUE IF NOT EXISTS 'pending';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;