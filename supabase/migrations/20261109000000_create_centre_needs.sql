-- =============================================================================
-- Migration: Centre Needs (public donor showcase)
-- Created: 2026-11-09
-- =============================================================================
-- A centre can publish a list of current needs (uniforms, food, repairs…).
-- Each need has a target amount and receives contributions. Progress is
-- COMPUTED from centre_need_contributions, never stored on centre_needs.
--
-- SECURITY:
--   - centre_needs and centre_need_contributions are tenant-scoped by centre_id.
--   - Authenticated users may only SELECT rows for their own centre.
--   - Authenticated INSERT/UPDATE/DELETE is explicitly denied; all writes go
--     through the service-role client after the API route has checked
--     site.needs.manage.
--   - The public /s/[code] route reads with the service-role client, so it
--     selects explicit PUBLIC columns only (never notes, actors or payment refs).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. centre_needs
-- -----------------------------------------------------------------------------

CREATE TABLE centre_needs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id      UUID NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  image_url      TEXT,
  target_amount  NUMERIC(14,2) NOT NULL CHECK (target_amount > 0),
  status         TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'completed', 'archived')),
  is_public      BOOLEAN NOT NULL DEFAULT true,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_by     UUID,
  updated_by     UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_centre_needs_centre ON centre_needs (centre_id);
CREATE INDEX idx_centre_needs_public ON centre_needs (centre_id, is_public, status);
CREATE INDEX idx_centre_needs_sort ON centre_needs (centre_id, sort_order);

CREATE TRIGGER set_centre_needs_updated_at
  BEFORE UPDATE ON centre_needs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE centre_needs ENABLE ROW LEVEL SECURITY;

-- Centre users can read needs belonging to their own centre.
CREATE POLICY "centre_needs_select_centre"
  ON centre_needs FOR SELECT
  TO authenticated
  USING (centre_id = public.current_centre_id());

-- Service role has full access (API routes enforce permissions + tenant scope).
CREATE POLICY "centre_needs_service_all"
  ON centre_needs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Defense in depth: deny authenticated writes.
CREATE POLICY "centre_needs_deny_authenticated_insert"
  ON centre_needs FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "centre_needs_deny_authenticated_update"
  ON centre_needs FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "centre_needs_deny_authenticated_delete"
  ON centre_needs FOR DELETE
  TO authenticated
  USING (false);

-- -----------------------------------------------------------------------------
-- 2. centre_need_contributions
-- -----------------------------------------------------------------------------

CREATE TABLE centre_need_contributions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id                UUID NOT NULL REFERENCES centre_needs(id) ON DELETE CASCADE,
  centre_id              UUID NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
  amount                 NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  source                 TEXT NOT NULL CHECK (source IN ('ONLINE', 'MANUAL')),
  payment_transaction_id UUID UNIQUE
                         REFERENCES payment_transactions(id) ON DELETE SET NULL,
  note                   TEXT,
  created_by             UUID,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_centre_need_contributions_need
  ON centre_need_contributions (need_id);
CREATE INDEX idx_centre_need_contributions_centre
  ON centre_need_contributions (centre_id);

ALTER TABLE centre_need_contributions ENABLE ROW LEVEL SECURITY;

-- Centre users can read contributions belonging to their own centre.
CREATE POLICY "centre_need_contributions_select_centre"
  ON centre_need_contributions FOR SELECT
  TO authenticated
  USING (centre_id = public.current_centre_id());

-- Service role has full access.
CREATE POLICY "centre_need_contributions_service_all"
  ON centre_need_contributions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Defense in depth: deny authenticated writes.
CREATE POLICY "centre_need_contributions_deny_authenticated_insert"
  ON centre_need_contributions FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "centre_need_contributions_deny_authenticated_update"
  ON centre_need_contributions FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "centre_need_contributions_deny_authenticated_delete"
  ON centre_need_contributions FOR DELETE
  TO authenticated
  USING (false);

-- -----------------------------------------------------------------------------
-- 3. Permissions
-- -----------------------------------------------------------------------------
-- Only the codes confirmed in the audit are seeded:
--   site.needs.view   — read needs + progress
--   site.needs.manage — create / update / hide / delete needs
-- -----------------------------------------------------------------------------

INSERT INTO permissions (module, action, description) VALUES
  ('site', 'needs.view',   'View centre needs and donation progress'),
  ('site', 'needs.manage', 'Create, edit, hide and delete centre needs')
ON CONFLICT (module, action) DO NOTHING;

-- CENTRE_MANAGER + CENTRE_IT: manage needs.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  CROSS JOIN permissions p
 WHERE r.name IN ('CENTRE_MANAGER', 'CENTRE_IT')
   AND (p.module, p.action) IN (
     ('site', 'needs.view'),
     ('site', 'needs.manage')
   )
ON CONFLICT DO NOTHING;

-- ACCOUNTANT_BURSAR: view only. Also grant site.view so the /centre-site
-- navigation and page gate (which check site.view) remain reachable.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  CROSS JOIN permissions p
 WHERE r.name = 'ACCOUNTANT_BURSAR'
   AND (p.module, p.action) IN (
     ('site', 'needs.view'),
     ('site', 'view')
   )
ON CONFLICT DO NOTHING;
