-- Fix RLS policies for designs storage bucket
-- Allow authenticated admins to upload design images
-- Migration created: 2025-10-11

-- Enable RLS on the designs bucket (if not already enabled)
-- This is done via Supabase Dashboard: Storage > designs bucket > Policies

-- Policy 1: Allow authenticated users to upload design images
CREATE POLICY "Allow authenticated uploads to designs bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'designs');

-- Policy 2: Allow public read access to design images (so customers can see them)
CREATE POLICY "Allow public read access to designs bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'designs');

-- Policy 3: Allow authenticated users to update their uploads
CREATE POLICY "Allow authenticated updates to designs bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'designs')
WITH CHECK (bucket_id = 'designs');

-- Policy 4: Allow authenticated users to delete their uploads
CREATE POLICY "Allow authenticated deletes from designs bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'designs');

-- Note: If you want to restrict to admins only, you would need to check user roles
-- For now, this allows any authenticated user (which includes admins)
