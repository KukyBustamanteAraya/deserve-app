-- Migration: 012_storage_products_bucket.sql
-- Description: Storage bucket policies for products images

-- NOTE: You must create the 'products' bucket manually in Supabase dashboard first
-- Settings: Public bucket = true

-- Public read
CREATE POLICY "Public can read product images"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'products' );

-- Authenticated write (tighten to admins later)
CREATE POLICY "Authed can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'products' );

CREATE POLICY "Authed can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'products' )
WITH CHECK ( bucket_id = 'products' );

CREATE POLICY "Authed can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'products' );

-- Folder structure convention: products/{product_id}/{index}.jpg
-- Example: products/123e4567-e89b-12d3-a456-426614174000/0.jpg (hero)
--          products/123e4567-e89b-12d3-a456-426614174000/1.jpg
--          products/123e4567-e89b-12d3-a456-426614174000/2.jpg
