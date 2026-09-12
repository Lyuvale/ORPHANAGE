-- -----------------------------------------------------------------------------
-- Centre website tables.
--
-- Every centre can build its own public website:
--   centre_site_theme  – one appearance row per centre (colours, fonts, logo,
--                        footer, optional custom CSS).
--   centre_site_pages  – pages the centre creates. Content is stored as a
--                        validated JSON block array. Slugs are unique within a
--                        centre; the site home page is flagged is_home.
--
-- Tenant isolation: rows belong to a centre and are only readable via the
-- session client when they match the caller's JWT centre_id. Writes go
-- through the service role (application layer enforces the site.* permission).
-- Public visitors receive only PUBLISHED pages via the service-role public
-- API (never drafts).
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 1. centre_site_theme
-- -----------------------------------------------------------------------------

CREATE TABLE centre_site_theme (
  centre_id      UUID PRIMARY KEY REFERENCES centres(id) ON DELETE CASCADE,
  site_name      TEXT NOT NULL DEFAULT '',
  tagline        TEXT,
  primary_color  TEXT NOT NULL DEFAULT '#4f46e5',
  accent_color   TEXT NOT NULL DEFAULT '#0ea5e9',
  heading_font   TEXT NOT NULL DEFAULT 'ui-sans-serif',
  body_font      TEXT NOT NULL DEFAULT 'ui-sans-serif',
  logo_url       TEXT,
  favicon_url    TEXT,
  hero_image_url TEXT,
  footer_text    TEXT,
  contact_email  TEXT,
  contact_phone  TEXT,
  custom_css     TEXT,
  updated_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE centre_site_theme ENABLE ROW LEVEL SECURITY;

CREATE POLICY "centre_site_theme_select_own"
  ON centre_site_theme FOR SELECT
  TO authenticated
  USING (centre_id = public.current_centre_id());

CREATE POLICY "centre_site_theme_admin"
  ON centre_site_theme FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 2. centre_site_pages
-- -----------------------------------------------------------------------------

CREATE TABLE centre_site_pages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id        UUID NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  slug             TEXT NOT NULL,
  nav_label        TEXT,
  show_in_nav      BOOLEAN NOT NULL DEFAULT true,
  nav_order        INTEGER NOT NULL DEFAULT 0,
  is_published     BOOLEAN NOT NULL DEFAULT false,
  is_home          BOOLEAN NOT NULL DEFAULT false,
  meta_description TEXT,
  content          JSONB NOT NULL DEFAULT '[]',
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (centre_id, slug)
);

CREATE INDEX idx_centre_site_pages_centre ON centre_site_pages (centre_id);
CREATE INDEX idx_centre_site_pages_published ON centre_site_pages (centre_id, is_published);

ALTER TABLE centre_site_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "centre_site_pages_select_own"
  ON centre_site_pages FOR SELECT
  TO authenticated
  USING (centre_id = public.current_centre_id());

CREATE POLICY "centre_site_pages_admin"
  ON centre_site_pages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- One home page per centre.
CREATE UNIQUE INDEX idx_centre_site_pages_home
  ON centre_site_pages (centre_id)
  WHERE is_home = true;

-- -----------------------------------------------------------------------------
-- 3. Auto-update updated_at
-- -----------------------------------------------------------------------------

CREATE TRIGGER set_centre_site_pages_updated_at
  BEFORE UPDATE ON centre_site_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();