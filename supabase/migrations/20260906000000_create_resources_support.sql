-- ============================================================
-- Prompt 15: Resources & Support
-- ============================================================
-- Tracks how support/financial resources flow through the centre
-- via ONE core relationship:
--
--     SOURCE -> FUND -> EXPENSE -> BENEFIT -> CHILD
--
-- SOURCE   : where support/finance comes from (donation, sponsorship,
--            grant, other).
-- FUND     : organises money received from a Source for a purpose
--            (general, education, health, food...). One Source can feed
--            many Funds.
-- EXPENSE  : how money from a Fund was used (approved/recorded spend).
-- BENEFIT  : what was provided as a result of an Expense.
-- CHILD    : the existing child record (REUSED - never duplicated) that
--            benefited. One Benefit can support many children.
--
-- SECURITY DESIGN:
--   - Every row carries centre_id (tenant isolation) enforced by RLS
--     using public.current_centre_id().
--   - resources.* permissions granted granularly and deny-by-default.
--   - Not a payroll system and does not process salaries.
--   - Balances are NEVER stored manually - they are computed from the
--     actual financial records (allocation / expense sums).
--   - Audit is recorded via the existing audit_logs trail (no separate
--     history tables).
--   - Documents reuse the existing private-document pattern (owner row +
--     private storage bucket). No duplicate document system.
-- ============================================================

-- ─── Enums ───────────────────────────────────────────────────

CREATE TYPE support_source_type AS ENUM (
  'DONATION',
  'SPONSORSHIP',
  'GRANT',
  'OTHER'
);

CREATE TYPE support_expense_status AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE support_benefit_type AS ENUM (
  'FOOD',
  'CLOTHES',
  'BOOKS',
  'EDUCATION_SUPPORT',
  'MEDICAL_SUPPORT',
  'OTHER'
);

CREATE TYPE support_document_entity AS ENUM (
  'SOURCE',
  'EXPENSE',
  'BENEFIT'
);

-- ─── SOURCES ─────────────────────────────────────────────────
-- Where the support/financial resource comes from.

CREATE TABLE support_sources (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id      UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  source_type    support_source_type NOT NULL,
  source_name    TEXT NOT NULL,
  amount         NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  source_date    DATE,
  purpose        TEXT,
  notes          TEXT,
  created_by     UUID NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_sources_centre ON support_sources(centre_id);
CREATE INDEX idx_support_sources_centre_type ON support_sources(centre_id, source_type);

ALTER TABLE support_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_source_select_centre ON support_sources
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY support_source_insert_admin ON support_sources
  FOR INSERT WITH CHECK (false);
CREATE POLICY support_source_update_admin ON support_sources
  FOR UPDATE USING (false);
CREATE POLICY support_source_delete_admin ON support_sources
  FOR DELETE USING (false);
CREATE POLICY support_source_deny_auth_insert ON support_sources
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY support_source_deny_auth_update ON support_sources
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY support_source_deny_auth_delete ON support_sources
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_support_source_updated_at
  BEFORE UPDATE ON support_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── FUNDS ───────────────────────────────────────────────────
-- Organises money received from a Source. One Source -> many Funds.
-- Sum of allocations for a Source can never exceed the Source amount.

CREATE TABLE support_funds (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id         UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  source_id         UUID NOT NULL REFERENCES support_sources(id) ON DELETE RESTRICT,
  fund_name         TEXT NOT NULL,
  amount_allocated  NUMERIC(14,2) NOT NULL CHECK (amount_allocated >= 0),
  purpose           TEXT,
  created_by        UUID NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_funds_centre ON support_funds(centre_id);
CREATE INDEX idx_support_funds_source ON support_funds(source_id);

ALTER TABLE support_funds ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_fund_select_centre ON support_funds
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY support_fund_insert_admin ON support_funds
  FOR INSERT WITH CHECK (false);
CREATE POLICY support_fund_update_admin ON support_funds
  FOR UPDATE USING (false);
CREATE POLICY support_fund_delete_admin ON support_funds
  FOR DELETE USING (false);
CREATE POLICY support_fund_deny_auth_insert ON support_funds
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY support_fund_deny_auth_update ON support_funds
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY support_fund_deny_auth_delete ON support_funds
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_support_fund_updated_at
  BEFORE UPDATE ON support_funds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enforce that a Source cannot be over-allocated across its Funds.
CREATE OR REPLACE FUNCTION support_check_fund_allocation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_source_amount NUMERIC(14,2);
  v_total NUMERIC(14,2);
BEGIN
  SELECT amount INTO v_source_amount FROM support_sources WHERE id = NEW.source_id;
  IF v_source_amount IS NULL THEN
    RAISE EXCEPTION 'V_INVALID: Fund references a non-existent Source';
  END IF;

  SELECT COALESCE(SUM(amount_allocated), 0) INTO v_total
  FROM support_funds
  WHERE source_id = NEW.source_id AND id <> NEW.id;

  IF v_total + NEW.amount_allocated > v_source_amount THEN
    RAISE EXCEPTION 'V_ALLOCATION: Total allocation would exceed the Source amount (% used of %)',
      v_total + NEW.amount_allocated, v_source_amount;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER support_trg_check_fund_allocation
  BEFORE INSERT OR UPDATE ON support_funds
  FOR EACH ROW EXECUTE FUNCTION support_check_fund_allocation();

-- ─── EXPENSES ────────────────────────────────────────────────
-- Shows how money from a Fund was used. Only APPROVED expenses
-- count toward the Fund's "used" amount and balance.

CREATE TABLE support_expenses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id         UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  fund_id           UUID NOT NULL REFERENCES support_funds(id) ON DELETE RESTRICT,
  description       TEXT NOT NULL,
  amount            NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  expense_date      DATE,
  approval_status   support_expense_status NOT NULL DEFAULT 'PENDING',
  approved_by       UUID,
  approved_at       TIMESTAMPTZ,
  notes             TEXT,
  created_by        UUID NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_expenses_centre ON support_expenses(centre_id);
CREATE INDEX idx_support_expenses_fund ON support_expenses(fund_id);
CREATE INDEX idx_support_expenses_status ON support_expenses(centre_id, approval_status);

ALTER TABLE support_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_expense_select_centre ON support_expenses
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY support_expense_insert_admin ON support_expenses
  FOR INSERT WITH CHECK (false);
CREATE POLICY support_expense_update_admin ON support_expenses
  FOR UPDATE USING (false);
CREATE POLICY support_expense_delete_admin ON support_expenses
  FOR DELETE USING (false);
CREATE POLICY support_expense_deny_auth_insert ON support_expenses
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY support_expense_deny_auth_update ON support_expenses
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY support_expense_deny_auth_delete ON support_expenses
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_support_expense_updated_at
  BEFORE UPDATE ON support_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- An APPROVED expense must not push a Fund's usage above its allocation.
CREATE OR REPLACE FUNCTION support_check_expense_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_allocated NUMERIC(14,2);
  v_approved_total NUMERIC(14,2);
  v_new_total NUMERIC(14,2);
BEGIN
  IF NEW.approval_status <> 'APPROVED' THEN
    RETURN NEW;
  END IF;

  SELECT amount_allocated INTO v_allocated FROM support_funds WHERE id = NEW.fund_id;
  IF v_allocated IS NULL THEN
    RAISE EXCEPTION 'V_INVALID: Expense references a non-existent Fund';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_approved_total
  FROM support_expenses
  WHERE fund_id = NEW.fund_id
    AND approval_status = 'APPROVED'
    AND id <> NEW.id;

  v_new_total := v_approved_total + NEW.amount;
  IF v_new_total > v_allocated THEN
    RAISE EXCEPTION 'V_EXPENSE: Approved usage would exceed the Fund balance (used % of allocated %)',
      v_new_total, v_allocated;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER support_trg_check_expense_usage
  BEFORE INSERT OR UPDATE ON support_expenses
  FOR EACH ROW EXECUTE FUNCTION support_check_expense_usage();

-- ─── BENEFITS ────────────────────────────────────────────────
-- What was provided as a result of an Expense.

CREATE TABLE support_benefits (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id      UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  expense_id     UUID NOT NULL REFERENCES support_expenses(id) ON DELETE RESTRICT,
  benefit_type   support_benefit_type NOT NULL,
  description    TEXT,
  benefit_date   DATE,
  created_by     UUID NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_benefits_centre ON support_benefits(centre_id);
CREATE INDEX idx_support_benefits_expense ON support_benefits(expense_id);

ALTER TABLE support_benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_benefit_select_centre ON support_benefits
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY support_benefit_insert_admin ON support_benefits
  FOR INSERT WITH CHECK (false);
CREATE POLICY support_benefit_update_admin ON support_benefits
  FOR UPDATE USING (false);
CREATE POLICY support_benefit_delete_admin ON support_benefits
  FOR DELETE USING (false);
CREATE POLICY support_benefit_deny_auth_insert ON support_benefits
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY support_benefit_deny_auth_update ON support_benefits
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY support_benefit_deny_auth_delete ON support_benefits
  FOR DELETE TO authenticated USING (false);

CREATE TRIGGER set_support_benefit_updated_at
  BEFORE UPDATE ON support_benefits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── BENEFIT -> CHILD (join) ─────────────────────────────────
-- Connects a Benefit to the EXISTING children who benefited.
-- Multiple children per benefit; a child can have many benefits.
-- Child records are NEVER duplicated - only referenced by id.

CREATE TABLE support_benefit_children (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id      UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  benefit_id     UUID NOT NULL REFERENCES support_benefits(id) ON DELETE CASCADE,
  child_id       UUID NOT NULL REFERENCES children(id) ON DELETE RESTRICT,
  created_by     UUID NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT support_benefit_children_unique UNIQUE (benefit_id, child_id)
);

CREATE INDEX idx_support_benefit_children_centre ON support_benefit_children(centre_id);
CREATE INDEX idx_support_benefit_children_benefit ON support_benefit_children(benefit_id);
CREATE INDEX idx_support_benefit_children_child ON support_benefit_children(child_id);

ALTER TABLE support_benefit_children ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_benefit_child_select_centre ON support_benefit_children
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY support_benefit_child_insert_admin ON support_benefit_children
  FOR INSERT WITH CHECK (false);
CREATE POLICY support_benefit_child_update_admin ON support_benefit_children
  FOR UPDATE USING (false);
CREATE POLICY support_benefit_child_delete_admin ON support_benefit_children
  FOR DELETE USING (false);
CREATE POLICY support_benefit_child_deny_auth_insert ON support_benefit_children
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY support_benefit_child_deny_auth_update ON support_benefit_children
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY support_benefit_child_deny_auth_delete ON support_benefit_children
  FOR DELETE TO authenticated USING (false);

-- ─── DOCUMENTS ───────────────────────────────────────────────
-- Reuses the existing private-document pattern. A single owner table
-- references sources, expenses or benefits via entity_type/entity_id.
-- No duplicate document system.

CREATE TABLE support_documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id      UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  entity_type    support_document_entity NOT NULL,
  entity_id      UUID NOT NULL,
  file_name      TEXT NOT NULL,
  file_type      TEXT,
  file_size      BIGINT,
  storage_path   TEXT NOT NULL,
  description    TEXT,
  uploaded_by    UUID NOT NULL,
  uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata       JSONB
);

CREATE INDEX idx_support_documents_centre ON support_documents(centre_id);
CREATE INDEX idx_support_documents_entity ON support_documents(entity_type, entity_id);

ALTER TABLE support_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_document_select_centre ON support_documents
  FOR SELECT USING (centre_id = public.current_centre_id());
CREATE POLICY support_document_insert_admin ON support_documents
  FOR INSERT WITH CHECK (false);
CREATE POLICY support_document_update_admin ON support_documents
  FOR UPDATE USING (false);
CREATE POLICY support_document_delete_admin ON support_documents
  FOR DELETE USING (false);
CREATE POLICY support_document_deny_auth_insert ON support_documents
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY support_document_deny_auth_update ON support_documents
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY support_document_deny_auth_delete ON support_documents
  FOR DELETE TO authenticated USING (false);

-- Private storage bucket for resource/support documents.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-documents', 'support-documents', false, 10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── PERMISSIONS ─────────────────────────────────────────────
-- Granular resources & support permissions, deny-by-default.

INSERT INTO permissions (module, action, description)
VALUES
  ('resources', 'view', 'View resources and support information'),
  ('resources', 'manage', 'Create and edit sources, funds, expenses and benefits'),
  ('resources', 'approve', 'Approve or reject support expenses'),
  ('resources', 'reports', 'Export resources and support reports'),
  ('resources', 'documents.view', 'View resource/support documents'),
  ('resources', 'documents.upload', 'Upload resource/support documents'),
  ('resources', 'documents.download', 'Download resource/support documents')
ON CONFLICT (module, action) DO NOTHING;

-- ─── ROLE-PERMISSION MAPPING ────────────────────────────────
-- Deliberate per-role grants.
--   ACCOUNTANT_BURSAR : full resources & support management + approval + reports.
--   CENTRE_MANAGER    : full resources & support management + approval + reports.
--   SOCIAL_WORKER     : view authorised child-benefit information only.
--   CAREGIVER         : no general financial access.
--   RECORDS_OFFICER   : view only (no financial management).

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

  -- CENTRE_MANAGER: full access
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT mgr, id FROM permissions WHERE module = 'resources'
  ON CONFLICT DO NOTHING;

  -- ACCOUNTANT_BURSAR: full access (authorised Resources & Support records)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT ab, id FROM permissions WHERE module = 'resources'
  ON CONFLICT DO NOTHING;

  -- SOCIAL_WORKER: view authorised child-benefit information only
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT sw, id FROM permissions WHERE (module = 'resources' AND action = 'view')
  ON CONFLICT DO NOTHING;

  -- RECORDS_OFFICER: view only (no financial management)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT ro, id FROM permissions WHERE (module = 'resources' AND action = 'view')
  ON CONFLICT DO NOTHING;

  -- CAREGIVER: intentionally omitted (no general financial access)
END $$;

-- ─── Done ────────────────────────────────────────────────────
