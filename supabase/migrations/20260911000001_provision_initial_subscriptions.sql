-- =============================================================================
-- Migration: Provision initial subscriptions for existing centres
-- Created: 2026-09-11
-- -----------------------------------------------------------------------------
-- The SaaS gate (`requireAppAccess`) now restricts normal system access to
-- centres with a valid subscription. This bootstrap migration assigns an active
-- STANDARD subscription (Core + Management + Export features) to every centre
-- that currently has NO subscription, so no existing tenant is locked out.
--
-- Idempotent: a centre with any subscription row is left untouched. On a fresh
-- database this is a no-op (there are no centres yet); the platform admin assigns
-- plans going forward via the Platform Administration area.
-- =============================================================================

DO $$
DECLARE
  v_plan_id UUID;
  v_centre RECORD;
  v_subscription_id UUID;
BEGIN
  -- Reference plan: Standard. If it was removed this is a safe no-op.
  SELECT id INTO v_plan_id FROM plans WHERE lower(name) = 'standard';
  IF v_plan_id IS NULL THEN
    RETURN;
  END IF;

  FOR v_centre IN SELECT id FROM centres WHERE status = 'active' LOOP
    -- Skip centres that already hold any subscription row (past or current).
    IF EXISTS (SELECT 1 FROM subscriptions WHERE centre_id = v_centre.id) THEN
      CONTINUE;
    END IF;

    INSERT INTO subscriptions (
      centre_id, plan_id, status, start_date, end_date
    ) VALUES (
      v_centre.id, v_plan_id, 'active',
      CURRENT_DATE,
      (CURRENT_DATE + INTERVAL '1 year')::date
    )
    RETURNING id INTO v_subscription_id;

    INSERT INTO subscription_history (
      subscription_id, centre_id, action, plan_id, previous_status, new_status, reason
    ) VALUES (
      v_subscription_id, v_centre.id, 'PROVISIONED', v_plan_id, NULL, 'active',
      'Initial subscription provisioned during platform upgrade to prevent service lockout.'
    );
  END LOOP;
END $$;
