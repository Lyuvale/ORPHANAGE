-- ============================================================
-- Prompt 17: Central Notification System
-- ============================================================
-- ONE notification system used by every module for IMPORTANT events.
--
-- MODEL:
--   A notification belongs to a Centre and a single recipient User.
--   It references an existing record (entity_type + entity_id) and a
--   client-side route so clicking opens the real protected record.
--   Notification content is a SAFE SUMMARY — never raw sensitive child
--   or safeguarding details. Authorised users reach the detail by
--   following the route to the protected record.
--
-- DELIVERY:
--   Notifications are created server-side via the service-role client
--   (bypasses RLS). Read/unread is also managed server-side behind a
--   permission check. Direct client writes are denied by default.
--
-- SECURITY / TENANT ISOLATION:
--   - Every row carries centre_id (tenant) and recipient_user_id.
--   - RLS: a user can SELECT only their OWN notifications within their
--     centre. All INSERT/UPDATE/DELETE are admin-only (deny by default).
--   - Sensitive details are NOT stored in the notification; only a safe
--     summary and a link to the real record.
--
-- PREFERENCES:
--   Each recipient can disable OPTIONAL notification categories.
--   CRITICAL notifications (safeguarding / security / financial
--   accountability) are always delivered regardless of preferences.
-- ============================================================

-- ─── Enums ───────────────────────────────────────────────────

CREATE TYPE notification_type AS ENUM (
  'INFORMATION',
  'ACTION_REQUIRED',
  'WARNING',
  'URGENT'
);

CREATE TYPE notification_event AS ENUM (
  'CHILD_ADMITTED',
  'CHILD_STATUS_CHANGED',
  'HEALTH_FOLLOWUP',
  'EDUCATION_UPDATE',
  'SAFEGUARDING_CONCERN',
  'SAFEGUARDING_ACTION',
  'VISIT_SCHEDULED',
  'SOURCE_RECORDED',
  'FUND_APPROVED',
  'EXPENSE_AWAITING_APPROVAL',
  'EXPENSE_APPROVED',
  'EXPENSE_REJECTED',
  'FUND_BALANCE_ALERT',
  'ASSET_MAINTENANCE',
  'ASSET_DAMAGED',
  'ACCOUNT_ACTION',
  'CENTRE_STATUS_CHANGED'
);

CREATE TYPE notification_entity AS ENUM (
  'CHILD',
  'CASE',
  'HEALTH',
  'EDUCATION',
  'SAFEGUARDING',
  'VISIT',
  'SOURCE',
  'FUND',
  'EXPENSE',
  'ASSET',
  'ACCOUNT',
  'CENTRE'
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────

CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id         UUID NOT NULL REFERENCES centres(id) ON DELETE RESTRICT,
  recipient_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  message           TEXT NOT NULL,
  type              notification_type NOT NULL DEFAULT 'INFORMATION',
  event_type        notification_event,
  entity_type       notification_entity,   -- related record kind
  entity_id         UUID,                  -- related record id (existing record)
  route             TEXT,                  -- client-side route to the related record
  is_critical       BOOLEAN NOT NULL DEFAULT false, -- always delivered, cannot be disabled
  is_read           BOOLEAN NOT NULL DEFAULT false,
  read_at           TIMESTAMPTZ,
  created_by        UUID,                  -- actor who triggered the event (if known)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for the common queries: a user's inbox + unread badge
CREATE INDEX idx_notifications_recipient ON notifications(recipient_user_id, created_at DESC);
CREATE INDEX idx_notifications_recipient_unread ON notifications(recipient_user_id) WHERE is_read = false;
CREATE INDEX idx_notifications_centre ON notifications(centre_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- A user may read ONLY their own notifications, within their own centre.
CREATE POLICY notifications_select_own ON notifications
  FOR SELECT TO authenticated
  USING (
    centre_id = public.current_centre_id()
    AND recipient_user_id IN (
      SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
    )
  );

-- All writes are admin (service-role) only. Deny by default.
CREATE POLICY notifications_insert_admin ON notifications
  FOR INSERT WITH CHECK (false);
CREATE POLICY notifications_update_admin ON notifications
  FOR UPDATE USING (false);
CREATE POLICY notifications_delete_admin ON notifications
  FOR DELETE USING (false);
CREATE POLICY notifications_deny_auth_insert ON notifications
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY notifications_deny_auth_update ON notifications
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY notifications_deny_auth_delete ON notifications
  FOR DELETE TO authenticated USING (false);

-- ─── NOTIFICATION PREFERENCES ────────────────────────────────
-- Simple per-user opt-out for OPTIONAL events. CRITICAL events are
-- always delivered (safeguarding / security / financial accountability).

CREATE TABLE notification_preferences (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  event_type notification_event NOT NULL,
  enabled    BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_type)
);

CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_preferences_select_own ON notification_preferences
  FOR SELECT TO authenticated
  USING (
    user_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())
  );

-- Managed server-side (admin client + permission check).
CREATE POLICY notification_preferences_insert_admin ON notification_preferences
  FOR INSERT WITH CHECK (false);
CREATE POLICY notification_preferences_deny_auth_insert ON notification_preferences
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY notification_preferences_deny_auth_update ON notification_preferences
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY notification_preferences_deny_auth_delete ON notification_preferences
  FOR DELETE TO authenticated USING (false);

-- ─── PERMISSIONS ─────────────────────────────────────────────
--   notifications.view     : view your own notifications (all roles).
--   notifications.manage   : manage notification preferences/delivery
--                            (CENTRE_MANAGER; other roles receive what is
--                             relevant to their role without managing prefs).

INSERT INTO permissions (module, action, description)
VALUES
  ('notifications', 'view', 'View own notifications'),
  ('notifications', 'manage', 'Manage notification preferences and delivery')
ON CONFLICT (module, action) DO NOTHING;

-- All system roles can VIEW their own notifications.
DO $$
DECLARE
  r RECORD;
  view_perm UUID;
BEGIN
  SELECT id INTO view_perm FROM permissions WHERE module = 'notifications' AND action = 'view';

  FOR r IN SELECT id FROM roles WHERE is_system = true LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (r.id, view_perm)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ─── Done ────────────────────────────────────────────────────
