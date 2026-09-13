-- -----------------------------------------------------------------------------
-- Centre website uploads.
--
-- Creates a PUBLIC storage bucket where centre site images live (page images,
-- logo, favicon, hero). Images are uploaded through the guarded
-- POST /api/centre-site/upload route (service role), so writes need no
-- client-facing policy; the public bucket makes object URLs directly readable
-- by visitors on the centre's public site.
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('centre-site', 'centre-site', true)
ON CONFLICT (id) DO NOTHING;

-- Public read (public site visitors).
CREATE POLICY "centre_site_objects_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'centre-site');

-- Full access for the service role (used by the upload route).
CREATE POLICY "centre_site_objects_service_all"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'centre-site')
  WITH CHECK (bucket_id = 'centre-site');