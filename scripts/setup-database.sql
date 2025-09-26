-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  sport TEXT NOT NULL,
  category TEXT DEFAULT 'jersey',
  image_url TEXT NOT NULL,
  image_filename TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_sport ON products(sport);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY IF NOT EXISTS "Public read access for products"
  ON products FOR SELECT
  USING (true);

-- Create policy to allow authenticated insert/update (for admin)
CREATE POLICY IF NOT EXISTS "Authenticated users can insert products"
  ON products FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Authenticated users can update products"
  ON products FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  '{"image/png","image/jpeg","image/jpg","image/webp"}'
) ON CONFLICT (id) DO NOTHING;

-- Create storage policy for public read access
CREATE POLICY IF NOT EXISTS "Public read access for product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Create storage policy for authenticated upload (for admin)
CREATE POLICY IF NOT EXISTS "Authenticated users can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Authenticated users can update product images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');