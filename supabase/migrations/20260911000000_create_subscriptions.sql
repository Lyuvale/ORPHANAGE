-- =============================================================================
-- Migration: SaaS Subscription Management
-- Created: 2026-09-11
-- =============================================================================
-- Adds simple SaaS subscription structures for the multi-tenant platform:
--   plans                 – subscription plans offered by the platform owner
--   plan_features         – optional feature access per plan (centre-level service access)
--   subscriptions         – which plan a centre subscribes to + status + dates
--   subscription_history  – important subscription changes (accountability)
--
-- RELATIONSHIP:
--   CENTRE -> PLAN -> SUBSCRIPTION -> STATUS -> SYSTEM ACCESS
--
-- PRINCIPLES:
--   - CENTRE data remains in `centres` (not duplicated here).
--   - SUBSCRIPTION = what the centre can use (service access at centre level).
--   - ROLE / PERMISSION = what each user can do (unchanged, existing model).
--   - Tenant isolation: a centre can only read its OWN subscription (RLS).
--     Platform administration (service_role / CENTRE_MANAGER + subscriptions.manage)
--     may access across centres.
--   - No subscription data is written into the app's business tables.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Custom types
-- -----------------------------------------------------------------------------
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'expired', 'suspended', 'cancelled');
CREATE TYPE billing_period   AS ENUM ('ONETIME', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- -----------------------------------------------------------------------------
-- 2. Plans table
-- -----------------------------------------------------------------------------
CREATE TABLE plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  description   TEXT,
  price         NUMERIC(10,2) NOT NULL DEFAULT 0,
  billing_period billing_period NOT NULL DEFAULT 'MONTHLY',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_plans_name_lower ON plans (lower(name));
CREATE INDEX idx_plans_is_active ON plans (is_active);

CREATE TRIGGER set_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 3. Plan features table (centre-level service access control where needed)
-- -----------------------------------------------------------------------------
CREATE TABLE plan_features (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  feature_key   TEXT NOT NULL,
  feature_label TEXT,
  enabled       BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, feature_key)
);

CREATE INDEX idx_plan_features_plan_id ON plan_features (plan_id);

-- -----------------------------------------------------------------------------
-- 4. Subscriptions table
-- -----------------------------------------------------------------------------
-- Each row represents one assigned subscription period for a centre.
-- A centre may have multiple rows over its lifetime (plan upgrades, renewals);
-- the "current" subscription is the most recent non-terminal row
-- (status in trial/active), otherwise the most recent row.
CREATE TABLE subscriptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id        UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  plan_id          UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status           subscription_status NOT NULL DEFAULT 'trial',
  start_date       DATE,
  end_date         DATE,
  trial_ends_at    DATE,
  payment_status   TEXT,
  payment_provider TEXT,
  payment_reference TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_centre_id ON subscriptions (centre_id);
CREATE INDEX idx_subscriptions_centre_created ON subscriptions (centre_id, created_at DESC);
CREATE INDEX idx_subscriptions_status ON subscriptions (status);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions (plan_id);
CREATE INDEX idx_subscriptions_end_date ON subscriptions (end_date);

CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 5. Subscription history (important changes for accountability)
-- -----------------------------------------------------------------------------
CREATE TABLE subscription_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  centre_id       UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  action          TEXT NOT NULL,
  plan_id         UUID REFERENCES plans(id) ON DELETE SET NULL,
  previous_status subscription_status,
  new_status      subscription_status,
  changed_by      UUID REFERENCES auth.users(id),
  reason          TEXT,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sub_history_subscription ON subscription_history (subscription_id);
CREATE INDEX idx_sub_history_centre ON subscription_history (centre_id, changed_at DESC);

-- -----------------------------------------------------------------------------
-- 6. Row Level Security
-- -----------------------------------------------------------------------------

-- Plans are platform catalogue data. Authenticated users may read active plans
-- (e.g. for the "my subscription" experience). Only service_role may mutate.
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_select_active"
  ON plans FOR SELECT TO authenticated
  USING (is_active = true);
CREATE POLICY "plans_mutate_admin"
  ON plans FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Plan features follow the plan they belong to (readable with the plan).
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_features_select"
  ON plan_features FOR SELECT TO authenticated
  USING (plan_id IN (SELECT id FROM plans WHERE is_active = true));
CREATE POLICY "plan_features_mutate_admin"
  ON plan_features FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Subscriptions: tenant isolation. A centre can read ONLY its own subscription.
-- All writes are platform-level (service_role).
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_select_own"
  ON subscriptions FOR SELECT TO authenticated
  USING (centre_id = public.current_centre_id());
CREATE POLICY "subscriptions_mutate_admin"
  ON subscriptions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Subscription history: tenant isolation for reads; service_role writes.
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub_history_select_own"
  ON subscription_history FOR SELECT TO authenticated
  USING (centre_id = public.current_centre_id());
CREATE POLICY "sub_history_mutate_admin"
  ON subscription_history FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 7. Seed: platform subscription permissions (idempotent)
-- -----------------------------------------------------------------------------
INSERT INTO permissions (module, action, description) VALUES
  ('subscriptions', 'view',     'View subscription/plan information (platform directory)'),
  ('subscriptions', 'manage',   'Create, change, activate, suspend, cancel and extend subscriptions (platform admin)'),
  ('subscriptions', 'view_own', 'View your own centre subscription (self-service)')
ON CONFLICT (module, action) DO NOTHING;

-- Grant platform subscription management to CENTRE_MANAGER only.
DO $$
DECLARE
  v_centre_manager UUID;
BEGIN
  SELECT id INTO v_centre_manager FROM roles WHERE name = 'CENTRE_MANAGER';

  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_centre_manager, id FROM permissions
  WHERE (module, action) IN (('subscriptions', 'view'), ('subscriptions', 'manage'), ('subscriptions', 'view_own'))
  ON CONFLICT DO NOTHING;
END $$;

-- Grant SELF-SERVICE own-subscription viewing to all centre roles (each user may
-- view their own centre's subscription status, including when access is restricted).
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('CENTRE_MANAGER', 'SOCIAL_WORKER', 'CAREGIVER', 'RECORDS_OFFICER', 'ACCOUNTANT_BURSAR')
  AND p.module = 'subscriptions' AND p.action = 'view_own'
ON CONFLICT DO NOTHING;

-- Seed reference plans (Basic / Standard / Premium) so the platform admin can
-- assign them immediately. These are NOT hardcoded into the application; they
-- are fully manageable through the Platform Administration area.
INSERT INTO plans (name, description, price, billing_period, is_active) VALUES
  ('Basic',    'Core child care features',                      50.00, 'MONTHLY', true),
  ('Standard', 'Core features + additional management features', 120.00, 'MONTHLY', true),
  ('Premium',  'Full available features',                        250.00, 'MONTHLY', true)
ON CONFLICT (name) DO NOTHING;

-- Seed plan features (centre-level service access).
-- CORE is available on every plan; MANAGEMENT & EXPORT & ANALYTICS are gated.
DO $$
DECLARE
  v_basic    UUID;
  v_standard UUID;
  v_premium  UUID;
BEGIN
  SELECT id INTO v_basic    FROM plans WHERE lower(name) = 'basic';
  SELECT id INTO v_standard FROM plans WHERE lower(name) = 'standard';
  SELECT id INTO v_premium  FROM plans WHERE lower(name) = 'premium';

  -- Basic: core care only
  INSERT INTO plan_features (plan_id, feature_key, feature_label, enabled) VALUES
    (v_basic, 'CORE',       'Core child care features', true),
    (v_basic, 'MANAGEMENT', 'Advanced management features', false),
    (v_basic, 'EXPORT',     'Data export & reports', false),
    (v_basic, 'ANALYTICS',  'Advanced analytics', false)
  ON CONFLICT (plan_id, feature_key) DO NOTHING;

  -- Standard: core + management + export, no advanced analytics-gated extras
  INSERT INTO plan_features (plan_id, feature_key, feature_label, enabled) VALUES
    (v_standard, 'CORE',       'Core child care features', true),
    (v_standard, 'MANAGEMENT', 'Advanced management features', true),
    (v_standard, 'EXPORT',     'Data export & reports', true),
    (v_standard, 'ANALYTICS',  'Advanced analytics', false)
  ON CONFLICT (plan_id, feature_key) DO NOTHING;

  -- Premium: full feature set
  INSERT INTO plan_features (plan_id, feature_key, feature_label, enabled) VALUES
    (v_premium, 'CORE',       'Core child care features', true),
    (v_premium, 'MANAGEMENT', 'Advanced management features', true),
    (v_premium, 'EXPORT',     'Data export & reports', true),
    (v_premium, 'ANALYTICS',  'Advanced analytics', true)
  ON CONFLICT (plan_id, feature_key) DO NOTHING;
END $$;
