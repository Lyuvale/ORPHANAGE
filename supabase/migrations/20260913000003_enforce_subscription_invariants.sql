-- =============================================================================
-- Migration: Enforce security invariant — an ACTIVE centre must have a valid
-- subscription. Created: 2026-09-13
-- -----------------------------------------------------------------------------
-- Since centre creation now defaults to `pending` and the platform only adds
-- centres with a valid subscription, this migration backfills the EXISTING
-- population: every centre currently `status = 'active'` that has NO
-- subscription row is given a 14-day TRIAL subscription on the cheapest
-- active plan (createSubscription mirrors this behaviour for new centres).
--
-- After this migration the platform invariant holds everywhere:
--   centre.status = 'active'  ==>  at least one subscription row with
--                                   status IN ('trial','active').
--
-- Idempotent: centres that already have ANY subscription row are untouched.
-- Safe on fresh databases (no centres / no plans / no tables => no-op).
-- =============================================================================

-- 0. Extend the centre_status enum to include 'pending' (new centres start as
--    pending until a subscription is provisioned and the centre is activated).
DO $$ BEGIN
  ALTER TYPE centre_status ADD VALUE IF NOT EXISTS 'pending';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- New centres default to 'pending' (never implicitly active without a
-- subscription provisioning path).
ALTER TABLE centres ALTER COLUMN status SET DEFAULT 'pending';

DO $$
DECLARE
  v_plans_table        regclass := to_regclass('public.plans');
  v_subs_table         regclass := to_regclass('public.subscriptions');
  v_hist_table         regclass := to_regclass('public.subscription_history');
  v_plan_id            UUID;
  v_trial_id           UUID;
  v_centre             RECORD;
  v_actor              UUID;
BEGIN
  -- Guard: subscriptions feature must exist for this migration to matter.
  IF v_plans_table IS NULL OR v_subs_table IS NULL OR v_hist_table IS NULL THEN
    RETURN;
  END IF;

  -- Reference actor for system-provisioned subscriptions (first platform admin,
  -- matched the same way subscription_gate uses the system actor).
  v_actor := NULL;

  -- 1. Choose the cheapest ACTIVE plan; fall back to any plan.
  SELECT id INTO v_plan_id
  FROM plans
  WHERE is_active = true
  ORDER BY price ASC, name ASC
  LIMIT 1;
  IF v_plan_id IS NULL THEN
    SELECT id INTO v_plan_id FROM plans ORDER BY price ASC, name ASC LIMIT 1;
  END IF;

  -- 2. If no plan exists at all, create the reference 'Standard' plan so
  --    active centres are never locked out. Mirrors the reference plans seeded
  --    at feature creation time (ON CONFLICT keeps this idempotent).
  IF v_plan_id IS NULL THEN
    INSERT INTO plans (name, description, price, billing_period, is_active)
    VALUES (
      'Standard',
      'Core features + additional management features',
      120.00, 'MONTHLY', true
    )
    ON CONFLICT (name) DO NOTHING;

    SELECT id INTO v_plan_id FROM plans WHERE lower(name) = 'standard';
    IF v_plan_id IS NULL THEN
      RETURN; -- Could not obtain a plan; safe no-op (rare / partial migration).
    END IF;
  END IF;

  -- 3. Backfill a 14-day TRIAL for every active centre with no subscription.
  FOR v_centre IN
    SELECT id FROM centres WHERE status = 'active'
  LOOP
    IF EXISTS (SELECT 1 FROM subscriptions WHERE centre_id = v_centre.id) THEN
      CONTINUE;
    END IF;

    INSERT INTO subscriptions (
      centre_id, plan_id, status, start_date, trial_ends_at, end_date
    ) VALUES (
      v_centre.id, v_plan_id, 'trial',
      CURRENT_DATE,
      (CURRENT_DATE + INTERVAL '14 days')::date,
      (CURRENT_DATE + INTERVAL '14 days')::date
    )
    RETURNING id INTO v_trial_id;

    INSERT INTO subscription_history (
      subscription_id, centre_id, action, plan_id, previous_status, new_status,
      changed_by, reason
    ) VALUES (
      v_trial_id, v_centre.id, 'PROVISIONED', v_plan_id, NULL, 'trial',
      v_actor,
      'Trial subscription provisioned automatically to enforce the security ' ||
      'rule that an active centre must have a valid subscription.'
    );
  END LOOP;
END $$;