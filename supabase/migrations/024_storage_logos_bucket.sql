-- Public bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies on storage.objects for 'logos'
CREATE POLICY "logos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

-- Enforce {userId}/{uuid}.png path ownership
CREATE POLICY "logos_user_insert_own_folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'logos' AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "logos_user_update_own_folder" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'logos' AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "logos_user_delete_own_folder" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'logos' AND split_part(name, '/', 1) = auth.uid()::text
  );
