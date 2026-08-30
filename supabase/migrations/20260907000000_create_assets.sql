-- ============================================================
-- Prompt 16: Assets (inside Resources & Support)
-- ============================================================
-- Extends the Resources & Support module with an Assets feature.
--
-- An Asset is a physical item the centre owns or uses (e.g. furniture,
-- kitchen equipment, a vehicle, electronics). Assets are tracked inside
-- Resources & Support — NOT a separate module.
--
-- RELATIONSHIP CHAINS:
--   SOURCE -> FUND -> EXPENSE -> ASSET            (when purchased from
--                                                   an existing fund)
--   ASSET -> BENEFIT -> CHILD                     (when the asset relates
--                                                   to an existing benefit)
--
-- Asset Source: an Asset connects to an existing Source (support_sources)
-- when it is known. When it is not (e.g. an asset the centre already had
-- before the system), we allow "Existing Centre Asset / Unknown" by leaving
-- source_id NULL and marking source_unknown = true. We never invent a source.
--
-- ASSET COSTS:
--   - Purchase Cost   : stored on the asset row (NULL = Unknown). It may
--                       reference an existing Expense (real transaction).
--   - Repair/Maintain : stored as rows in support_asset_costs. Each may
--                       reference an existing Expense.
--   - Total Cost is AUTO-COMPUTED (Purchase + Repair + Maintenance);
--     never typed manually.
--   - Actual money flows stay in the existing Expense system (no
--     duplication; Fund balances follow the present expense approval rules).
--
-- ASSET STATUS:  ACTIVE, IN_USE, MAINTENANCE, DAMAGED, LOST, DISPOSED
-- ASSET CONDITION (separate from status): GOOD, FAIR, NEEDS_REPAIR, DAMAGED
-- Change history is kept in support_asset_history + the existing audit trail.
--
-- SECURITY DESIGN (same as the rest of Resources):
--   - Every row carries centre_id (tenant isolation) enforced by RLS via
--     public.current_centre_id().
--   - assets.* permissions granted granularly and deny-by-default.
--   - Documents reuse the existing support-documents bucket.
--   - Audit is recorded via the existing audit_logs trail.
-- ============================================================

-- ─── Extend the support document entity enum with ASSET ─────

ALTER TYPE support_document_entity ADD VALUE IF NOT EXISTS 'ASSET';

-- ─── Enums ───────────────────────────────────────────────────

CREATE TYPE asset_category AS ENUM (
  'FURNITURE',
  'EQUIPMENT',
  'VEHICLE',
  'ELECTRONICS',
  'APPLIANCE',
  'BEDDING',
  'OTHER'
);

CREATE TYPE asset_status AS ENUM (
  'ACTIVE',
  'IN_USE',
  'MAINTENANCE',
  'DAMAGED',
  'LOST',
  'DISPOSED'
);

CREATE TYPE asset_condition AS ENUM (
  'GOOD',
  'FAIR',
  'NEEDS_REPAIR',
  'DAMAGED'
);

CREATE TYPE asset_cost_type AS ENUM (
  'REPAIR',
  'MAINTENANCE'
);

CREATE TYPE asset_history_event AS ENUM (
  'CREATED',
  'UPDATED',
  'COST_RECORDED',
  'STATUS_CHANGED',
  'LOCATION_CHANGED',
  'CONDITION_CHANGED',
  'DISPOSED'
);

-- ─── ASSETS ──────────────────────────────────────────────────
-- A physical item owned/used by the centre.

CREATE TABLE support_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id       UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  asset_id        TEXT,                 -- individually tracked ID, e.g. AST-001
  asset_name      TEXT NOT NULL,
  asset_category  asset_category NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  date_acquired   DATE,
  location        TEXT,
  asset_status    asset_status NOT NULL DEFAULT 'ACTIVE',
  asset_condition asset_condition NOT NULL DEFAULT 'GOOD',
  source_id       UUID REFERENCES support_sources(id) ON DELETE SET NULL,
  fund_id         UUID REFERENCES support_funds(id) ON DELETE SET NULL,
  expense_id      UUID REFERENCES support_expenses(id) ON DELETE SET NULL,
  benefit_id      UUID REFERENCES support_benefits(id) ON DELETE SET NULL,
  source_unknown  BOOLEAN NOT NULL DEFAULT false, -- true => "Existing Centre Asset / Unknown"
  purchase_cost   NUMERIC(14,2) CHECK (purchase_cost IS NULL OR purchase_cost >= 0), -- NULL = Unknown
  notes           TEXT,
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_assets_centre ON support_assets(centre_id);
CREATE INDEX idx_support_assets_centre_category ON support_assets(centre_id, asset_category);
CREATE INDEX idx_support_assets_centre_status ON support_assets(centre_id, asset_status);

ALTER TABLE support_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_asset_select_centre ON support_assets
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY support_asset_insert_admin ON support_assets
  FOR INSERT WITH CHECK (false);
CREATE POLICY support_asset_update_admin ON support_assets
  FOR UPDATE USING (false);
CREATE POLICY support_asset_delete_admin ON support_assets
  FOR DELETE USING (false);
CREATE POLICY support_asset_deny_auth_insert ON support_assets
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY support_asset_deny_auth_update ON support_assets
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY support_asset_deny_auth_delete ON support_assets
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_support_asset_updated_at
  BEFORE UPDATE ON support_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── ASSET COSTS (Repair / Maintenance) ──────────────────────
-- Repeatable cost records. Each may point at an EXISTING Expense so the
-- real transaction is never duplicated. amount NULL = Unknown.

CREATE TABLE support_asset_costs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id   UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  asset_id    UUID NOT NULL REFERENCES support_assets(id) ON DELETE CASCADE,
  cost_type   asset_cost_type NOT NULL,
  amount      NUMERIC(14,2) CHECK (amount IS NULL OR amount >= 0),
  cost_date   DATE,
  expense_id  UUID REFERENCES support_expenses(id) ON DELETE SET NULL,
  notes       TEXT,
  created_by  UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_asset_costs_centre ON support_asset_costs(centre_id);
CREATE INDEX idx_support_asset_costs_asset ON support_asset_costs(asset_id);

ALTER TABLE support_asset_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_asset_cost_select_centre ON support_asset_costs
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY support_asset_cost_insert_admin ON support_asset_costs
  FOR INSERT WITH CHECK (false);
CREATE POLICY support_asset_cost_update_admin ON support_asset_costs
  FOR UPDATE USING (false);
CREATE POLICY support_asset_cost_delete_admin ON support_asset_costs
  FOR DELETE USING (false);
CREATE POLICY support_asset_cost_deny_auth_insert ON support_asset_costs
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY support_asset_cost_deny_auth_update ON support_asset_costs
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY support_asset_cost_deny_auth_delete ON support_asset_costs
  FOR DELETE TO authenticated USING (false);

-- ─── ASSET HISTORY ───────────────────────────────────────────
-- Simple history of notable asset events (status/location/condition/cost).
-- Complements (not a replacement for) the existing audit trail.

CREATE TABLE support_asset_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id      UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  asset_id       UUID NOT NULL REFERENCES support_assets(id) ON DELETE CASCADE,
  event_type     asset_history_event NOT NULL,
  description    TEXT,
  previous_value TEXT,
  new_value      TEXT,
  changed_by     UUID NOT NULL,
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_asset_history_asset ON support_asset_history(asset_id);

ALTER TABLE support_asset_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_asset_history_select_centre ON support_asset_history
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY support_asset_history_insert_admin ON support_asset_history
  FOR INSERT WITH CHECK (false);
CREATE POLICY support_asset_history_update_admin ON support_asset_history
  FOR UPDATE USING (false);
CREATE POLICY support_asset_history_delete_admin ON support_asset_history
  FOR DELETE USING (false);
CREATE POLICY support_asset_history_deny_auth_insert ON support_asset_history
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY support_asset_history_deny_auth_update ON support_asset_history
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY support_asset_history_deny_auth_delete ON support_asset_history
  FOR DELETE TO authenticated USING (false);

-- ─── PERMISSIONS ─────────────────────────────────────────────
-- Granular asset permissions inside the resources module, deny-by-default.

INSERT INTO permissions (module, action, description)
VALUES
  ('resources', 'assets.view', 'View assets'),
  ('resources', 'assets.manage', 'Create and edit assets'),
  ('resources', 'assets.costs', 'Record asset repair and maintenance costs'),
  ('resources', 'assets.status', 'Change asset status, location and condition'),
  ('resources', 'assets.dispose', 'Dispose of assets')
ON CONFLICT (module, action) DO NOTHING;

-- ─── ROLE-PERMISSION MAPPING ────────────────────────────────
--   CENTRE_MANAGER    : full asset management + status + costs + dispose.
--   ACCOUNTANT_BURSAR : full asset management + status + costs + dispose.
--   SOCIAL_WORKER     : view assets only.
--   RECORDS_OFFICER   : view assets only.
--   CAREGIVER         : no access.

DO $$
DECLARE
  mgr UUID;
  sw UUID;
  ro UUID;
  ab UUID;
BEGIN
  SELECT id INTO mgr FROM roles WHERE name = 'CENTRE_MANAGER' AND is_system = true;
  SELECT id INTO sw FROM roles WHERE name = 'SOCIAL_WORKER' AND is_system = true;
  SELECT id INTO ro FROM roles WHERE name = 'RECORDS_OFFICER' AND is_system = true;
  SELECT id INTO ab FROM roles WHERE name = 'ACCOUNTANT_BURSAR' AND is_system = true;

  -- CENTRE_MANAGER: all asset permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT mgr, id FROM permissions WHERE (module = 'resources' AND action LIKE 'assets.%')
  ON CONFLICT DO NOTHING;

  -- ACCOUNTANT_BURSAR: all asset permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT ab, id FROM permissions WHERE (module = 'resources' AND action LIKE 'assets.%')
  ON CONFLICT DO NOTHING;

  -- SOCIAL_WORKER: view only
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT sw, id FROM permissions WHERE (module = 'resources' AND action = 'assets.view')
  ON CONFLICT DO NOTHING;

  -- RECORDS_OFFICER: view only
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT ro, id FROM permissions WHERE (module = 'resources' AND action = 'assets.view')
  ON CONFLICT DO NOTHING;

  -- CAREGIVER: intentionally omitted
END $$;

-- ─── Done ────────────────────────────────────────────────────
