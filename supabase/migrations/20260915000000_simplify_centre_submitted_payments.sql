-- =============================================================================
-- Migration: Simplify payments → centre-submitted subscription payments
-- Created: 2026-09-03
-- =============================================================================
-- Replaces the dual flow (online contributions + manual admin record) with a
-- single workflow:
--
--   1. A centre submits a subscription payment (plan, amount, transaction
--      reference) from its subscriptions page. It is stored as PENDING.
--   2. The platform administrator reviews it: approves (→ subscription becomes
--      active, plan auto-selected to best fit the confirmed amount) or rejects
--      with a feedback reason.
--
-- Because the table already has provider_reference / created_by / flow_type /
-- status, no columns are dropped — we ADD the review fields and repurpose the
-- status enum values. All previous payment data was empty, so no backfill is
-- needed.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Add review/feedback fields to payment_transactions
-- -----------------------------------------------------------------------------
ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS review_feedback    TEXT,   -- admin reason when rejecting
  ADD COLUMN IF NOT EXISTS reviewed_by        UUID,   -- platform admin who reviewed
  ADD COLUMN IF NOT EXISTS reviewed_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_id            UUID REFERENCES plans(id) ON DELETE SET NULL;

-- Help find submitted/reviewed payments quickly.
CREATE INDEX IF NOT EXISTS idx_payments_review ON payment_transactions (status, centre_id);

-- -----------------------------------------------------------------------------
-- 2. payment_provider / provider_reference still used for the transaction
--    reference the centre enters (rejea ya muamala). Ensure the MOCK provider
--    value accepts arbitrary references — keep as-is.
-- -----------------------------------------------------------------------------

-- Ensure a platform admin can read all payments (service_role already has it;
-- this just documents the intended centre-scoped SELECT for authenticated users).
DO $$
BEGIN
  -- Re-affirm the centre-scoped select policy exists (idempotent).
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE tablename = 'payment_transactions'
                   AND policyname = 'payments_select_own') THEN
    CREATE POLICY payments_select_own
      ON payment_transactions FOR SELECT TO authenticated
      USING (centre_id = public.current_centre_id());
  END IF;
END $$;
