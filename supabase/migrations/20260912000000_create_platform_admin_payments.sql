-- =============================================================================
-- Migration: Platform Administration & Online Payments / Donations / Contributions
-- Created: 2026-09-12
-- =============================================================================
-- Adds:
--   1. PLATFORM_ADMINISTRATOR role (platform-level, NOT a centre role) with
--      controlled `platform.*` permissions (deny-by-default).
--   2. Online payments / donations / contributions with a replaceable payment
--      provider layer and idempotent, webhook-confirmed flows.
--   3. Two DISTINCT financial contexts:
--        - SUBSCRIPTION payment  -> activates / extends the centre's SaaS
--          subscription (NEVER recorded as a support Source).
--        - CONTRIBUTION          -> an online donation to a specific centre;
--          on webhook confirmation a CONTRIBUTION Source (+ optional Fund) is
--          created in that centre's Resources & Support (the source of truth).
--   4. Fixes the notification enums which were never extended for the SaaS
--      subscriptions module (their notifications were silently failing).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Fix notification enums (add subscription + payment/contribution/platform)
-- -----------------------------------------------------------------------------
ALTER TYPE notification_event ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_EXPIRING';
ALTER TYPE notification_event ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_EXPIRED';
ALTER TYPE notification_event ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_ACTIVATED';
ALTER TYPE notification_event ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_SUSPENDED';
ALTER TYPE notification_event ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_TRIAL_EXPIRING';
ALTER TYPE notification_event ADD VALUE IF NOT EXISTS 'PAYMENT_RECEIVED';
ALTER TYPE notification_event ADD VALUE IF NOT EXISTS 'CONTRIBUTION_RECEIVED';
ALTER TYPE notification_event ADD VALUE IF NOT EXISTS 'PAYMENT_FAILED';
ALTER TYPE notification_event ADD VALUE IF NOT EXISTS 'PLATFORM_ALERT';

ALTER TYPE notification_entity ADD VALUE IF NOT EXISTS 'SUBSCRIPTION';
ALTER TYPE notification_entity ADD VALUE IF NOT EXISTS 'PAYMENT';
ALTER TYPE notification_entity ADD VALUE IF NOT EXISTS 'CONTRIBUTION';
ALTER TYPE notification_entity ADD VALUE IF NOT EXISTS 'PLATFORM';

-- -----------------------------------------------------------------------------
-- 1. Support source types: online contributions are a distinct source type.
--    "RESOURCE" is provided for a centre's own contributed resources/stock.
-- -----------------------------------------------------------------------------
ALTER TYPE support_source_type ADD VALUE IF NOT EXISTS 'CONTRIBUTION';
ALTER TYPE support_source_type ADD VALUE IF NOT EXISTS 'RESOURCE';

-- Sources that arrive via the online contribution flow carry a live status.
-- Manually recorded sources default to RECEIVED (a recorded source is in hand).
CREATE TYPE support_source_status AS ENUM (
  'PENDING',
  'RECEIVED',
  'FAILED',
  'CANCELLED',
  'REFUNDED'
);

ALTER TABLE support_sources
  ADD COLUMN IF NOT EXISTS status support_source_status NOT NULL DEFAULT 'RECEIVED';

-- -----------------------------------------------------------------------------
-- 2. PLATFORM_ADMINISTRATOR role + platform permissions
-- -----------------------------------------------------------------------------
INSERT INTO roles (name, description, is_system) VALUES
  ('PLATFORM_ADMINISTRATOR', 'Platform-level administration across centres (NOT a centre role).', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (module, action, description) VALUES
  ('platform', 'view',                    'Access platform administration area'),
  ('platform', 'centres',                 'View/list centres and manage centre status across the platform'),
  ('platform', 'subscriptions',           'Manage platform-wide subscriptions'),
  ('platform', 'payments',                'View and manage platform-wide payments'),
  ('platform', 'settings',                'Manage platform settings (e.g. online contribution availability)'),
  ('online_contributions', 'manage',      'Enable/configure online contributions for the platform'),
  ('payments', 'view',                    'View payment transactions for own centre'),
  ('payments', 'refund',                  'Issue refunds for own-centre payments (requires manage/approve context)')
ON CONFLICT (module, action) DO NOTHING;

-- Grant platform.* permissions ONLY to the PLATFORM_ADMINISTRATOR role.
DO $$
DECLARE
  v_platform_admin UUID;
BEGIN
  SELECT id INTO v_platform_admin FROM roles WHERE name = 'PLATFORM_ADMINISTRATOR';

  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_platform_admin, id FROM permissions
  WHERE (module, action) IN (
    ('platform', 'view'),
    ('platform', 'centres'),
    ('platform', 'subscriptions'),
    ('platform', 'payments'),
    ('platform', 'settings'),
    ('online_contributions', 'manage'),
    ('payments', 'view'),
    ('payments', 'refund')
  )
  ON CONFLICT DO NOTHING;
END $$;

-- CENTRE_MANAGER / ACCOUNTANT_BURSAR may view THEIR OWN centre's payment
-- transactions (contributions + subscription history) but never platform.*
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('CENTRE_MANAGER', 'ACCOUNTANT_BURSAR')
  AND p.module = 'payments' AND p.action = 'view'
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. payment_transactions  (idempotent, webhook-confirmed; dual financial context)
-- -----------------------------------------------------------------------------
CREATE TYPE payment_flow_type AS ENUM ('SUBSCRIPTION', 'CONTRIBUTION');
CREATE TYPE payment_status AS ENUM ('PENDING', 'SUCCESSFUL', 'FAILED', 'CANCELLED', 'REFUNDED');
CREATE TYPE payment_provider AS ENUM ('MOCK', 'EXTENSION');

CREATE TABLE payment_transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id             UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  flow_type             payment_flow_type NOT NULL,
  purpose               TEXT,                     -- e.g. "Subscription - Standard", "Education Fund"
  amount                NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency              TEXT NOT NULL DEFAULT 'KES',
  provider              payment_provider NOT NULL DEFAULT 'MOCK',
  provider_reference    TEXT NOT NULL,            -- provider txn reference (idempotency key)
  status                payment_status NOT NULL DEFAULT 'PENDING',
  contributor_name      TEXT,
  contributor_email     TEXT,
  contributor_contact   TEXT,
  -- Financial-context linkage:
  subscription_id       UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  source_id             UUID REFERENCES support_sources(id) ON DELETE SET NULL,
  fund_id               UUID REFERENCES support_funds(id) ON DELETE SET NULL,
  -- Webhook verification fields:
  verified_at           TIMESTAMPTZ,
  webhook_raw           JSONB,
  webhook_signature     TEXT,
  -- Audit/metadata:
  metadata              JSONB DEFAULT '{}'::jsonb,
  created_by            UUID,                     -- actor who initiated (may be null for public)
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_reference)
);

CREATE INDEX idx_payments_centre_created ON payment_transactions (centre_id, created_at DESC);
CREATE INDEX idx_payments_status ON payment_transactions (status);
CREATE INDEX idx_payments_flow ON payment_transactions (flow_type);
CREATE INDEX idx_payments_provider_ref ON payment_transactions (provider, provider_reference);

CREATE TRIGGER set_payment_transactions_updated_at
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- A user may read ONLY payment transactions for their OWN centre.
CREATE POLICY payments_select_own
  ON payment_transactions FOR SELECT TO authenticated
  USING (centre_id = public.current_centre_id());
CREATE POLICY payments_select_platform
  ON payment_transactions FOR SELECT TO service_role
  USING (true);
CREATE POLICY payments_mutate_admin
  ON payment_transactions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 4. Platform administration support tables
-- -----------------------------------------------------------------------------
-- Global platform settings (key/value, single-row semantics managed by app).
CREATE TABLE platform_settings (
  key          TEXT PRIMARY KEY,
  value        JSONB NOT NULL DEFAULT 'null'::jsonb,
  description  TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-centre online contribution configuration.
CREATE TABLE centre_online_contributions (
  centre_id        UUID PRIMARY KEY REFERENCES centres(id) ON DELETE CASCADE,
  enabled          BOOLEAN NOT NULL DEFAULT true,
  purpose_presets  JSONB NOT NULL DEFAULT '["General Support"]'::jsonb,
  default_purpose  TEXT NOT NULL DEFAULT 'General Support',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform-wide alerts surfaced on the platform admin dashboard.
CREATE TABLE platform_alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity    TEXT NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  title       TEXT NOT NULL,
  message     TEXT,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_platform_alerts_unresolved ON platform_alerts (is_resolved, created_at DESC);

-- -----------------------------------------------------------------------------
-- 5. RLS for platform administration tables
-- -----------------------------------------------------------------------------

-- platform_settings: readable only by authenticated users (platform admin gates
-- by permission at the app layer); writes are service-role only.
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_settings_select_auth
  ON platform_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY platform_settings_mutate_admin
  ON platform_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- centre_online_contributions: public read of the ENABLED-ONLY subset is needed
-- by the public donation landing page.
ALTER TABLE centre_online_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY online_contrib_select_enabled
  ON centre_online_contributions FOR SELECT TO anon
  USING (enabled = true);
CREATE POLICY online_contrib_select_auth
  ON centre_online_contributions FOR SELECT TO authenticated USING (true);
CREATE POLICY online_contrib_mutate_admin
  ON centre_online_contributions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- platform_alerts: service-role only (surfaced to platform admins via routes).
ALTER TABLE platform_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_alerts_mutate_admin
  ON platform_alerts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 6. Seed default platform settings (online contribution default ON is a
--    deliberate setting the platform admin can toggle).
-- -----------------------------------------------------------------------------
INSERT INTO platform_settings (key, value, description) VALUES
  ('online_contributions_enabled', 'true'::jsonb, 'Master switch for online contribution landing pages')
ON CONFLICT (key) DO NOTHING;

-- Bootstrap online contributions for every existing centre so the public
-- donation experience works out of the box. Platform admins can disable /
-- re-purpose per centre later.
INSERT INTO centre_online_contributions (centre_id, enabled, purpose_presets, default_purpose)
SELECT id, true, '["General Support", "Education Fund", "Medical Support", "Food"]'::jsonb, 'General Support'
FROM centres
ON CONFLICT (centre_id) DO NOTHING;
