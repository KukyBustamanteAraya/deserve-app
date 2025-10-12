-- ============================================================================
-- DESIGN vs PRODUCT ARCHITECTURE - Database Schema
-- ============================================================================
-- Date: 2025-10-11
-- Purpose: Separate visual designs from physical products
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE NEW TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 🎨 DESIGNS TABLE
-- Pure visual patterns (independent of sport/product)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  designer_name TEXT,
  style_tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- ["modern", "classic", "geometric"]
  color_scheme TEXT[] DEFAULT ARRAY[]::TEXT[], -- ["blue", "red", "white"]
  is_customizable BOOLEAN DEFAULT true,
  allows_recoloring BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE designs IS 'Visual design patterns that can be applied to multiple sports and products';
COMMENT ON COLUMN designs.slug IS 'URL-friendly identifier (e.g., "blue-thunder")';
COMMENT ON COLUMN designs.style_tags IS 'Style categories for filtering (e.g., ["modern", "geometric"])';
COMMENT ON COLUMN designs.color_scheme IS 'Primary colors used in design';
COMMENT ON COLUMN designs.is_customizable IS 'Whether customer can modify this design';
COMMENT ON COLUMN designs.allows_recoloring IS 'Whether colors can be changed';

-- ----------------------------------------------------------------------------
-- 🖼️ DESIGN MOCKUPS TABLE
-- How a design looks on specific sport+product combinations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS design_mockups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  sport_id BIGINT NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  product_type_slug TEXT NOT NULL, -- "jersey", "shorts", "hoodie"
  mockup_url TEXT NOT NULL,
  view_angle TEXT, -- "front", "back", "side", "detail"
  is_primary BOOLEAN DEFAULT false, -- Primary mockup for this sport+product combo
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one primary mockup per design+sport+product+angle
  UNIQUE(design_id, sport_id, product_type_slug, view_angle)
);

COMMENT ON TABLE design_mockups IS 'Visual mockups showing how designs look on different sport+product combinations';
COMMENT ON COLUMN design_mockups.mockup_url IS 'URL to mockup image in Supabase Storage';
COMMENT ON COLUMN design_mockups.view_angle IS 'Which angle/view this mockup shows';
COMMENT ON COLUMN design_mockups.is_primary IS 'Primary mockup shown in catalog';

-- ----------------------------------------------------------------------------
-- 🎨👕 DESIGN_PRODUCTS JUNCTION TABLE
-- Links designs to compatible products
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS design_products (
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  is_recommended BOOLEAN DEFAULT true,
  preview_mockup_id UUID REFERENCES design_mockups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (design_id, product_id)
);

COMMENT ON TABLE design_products IS 'Junction table linking designs to products they can be applied to';
COMMENT ON COLUMN design_products.is_recommended IS 'Whether this design is recommended for this product';
COMMENT ON COLUMN design_products.preview_mockup_id IS 'Default mockup to show for this design+product combo';

-- ============================================================================
-- PART 2: MODIFY EXISTING TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 👕 PRODUCTS TABLE MODIFICATIONS
-- Add design_id to support new architecture
-- Keep existing structure for backward compatibility
-- ----------------------------------------------------------------------------
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_type_name TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

COMMENT ON COLUMN products.product_type_name IS 'Human-readable product type (e.g., "Camiseta de Fútbol")';
COMMENT ON COLUMN products.sort_order IS 'Display order in catalog';

-- ----------------------------------------------------------------------------
-- 📝 DESIGN_REQUESTS TABLE MODIFICATIONS
-- Link to new design_id
-- ----------------------------------------------------------------------------
ALTER TABLE design_requests
  ADD COLUMN IF NOT EXISTS design_id UUID REFERENCES designs(id) ON DELETE SET NULL;

COMMENT ON COLUMN design_requests.design_id IS 'Reference to selected design (new architecture)';

-- ----------------------------------------------------------------------------
-- 📦 ORDER_ITEMS TABLE MODIFICATIONS
-- Link to new design_id
-- ----------------------------------------------------------------------------
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS design_id UUID REFERENCES designs(id) ON DELETE SET NULL;

COMMENT ON COLUMN order_items.design_id IS 'Reference to design ordered (new architecture)';

-- ============================================================================
-- PART 3: CREATE INDEXES
-- ============================================================================

-- Designs indexes
CREATE INDEX IF NOT EXISTS idx_designs_slug ON designs(slug);
CREATE INDEX IF NOT EXISTS idx_designs_active ON designs(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_designs_featured ON designs(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_designs_style_tags ON designs USING GIN(style_tags);
CREATE INDEX IF NOT EXISTS idx_designs_color_scheme ON designs USING GIN(color_scheme);

-- Design mockups indexes
CREATE INDEX IF NOT EXISTS idx_design_mockups_design_id ON design_mockups(design_id);
CREATE INDEX IF NOT EXISTS idx_design_mockups_sport_id ON design_mockups(sport_id);
CREATE INDEX IF NOT EXISTS idx_design_mockups_product_type ON design_mockups(product_type_slug);
CREATE INDEX IF NOT EXISTS idx_design_mockups_primary ON design_mockups(is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_design_mockups_composite ON design_mockups(design_id, sport_id, product_type_slug);

-- Design products indexes
CREATE INDEX IF NOT EXISTS idx_design_products_design_id ON design_products(design_id);
CREATE INDEX IF NOT EXISTS idx_design_products_product_id ON design_products(product_id);

-- Updated table indexes
CREATE INDEX IF NOT EXISTS idx_design_requests_design_id ON design_requests(design_id);
CREATE INDEX IF NOT EXISTS idx_order_items_design_id ON order_items(design_id);

-- ============================================================================
-- PART 4: CREATE TRIGGERS
-- ============================================================================

-- Updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Designs updated_at trigger
DROP TRIGGER IF EXISTS update_designs_updated_at ON designs;
CREATE TRIGGER update_designs_updated_at
  BEFORE UPDATE ON designs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Design mockups updated_at trigger
DROP TRIGGER IF EXISTS update_design_mockups_updated_at ON design_mockups;
CREATE TRIGGER update_design_mockups_updated_at
  BEFORE UPDATE ON design_mockups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 5: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_mockups ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_products ENABLE ROW LEVEL SECURITY;

-- Designs policies: Public read, admin write
DROP POLICY IF EXISTS "Public can view active designs" ON designs;
CREATE POLICY "Public can view active designs" ON designs
  FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Admins can manage designs" ON designs;
CREATE POLICY "Admins can manage designs" ON designs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Design mockups policies: Public read, admin write
DROP POLICY IF EXISTS "Public can view design mockups" ON design_mockups;
CREATE POLICY "Public can view design mockups" ON design_mockups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM designs
      WHERE designs.id = design_mockups.design_id
      AND designs.active = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage design mockups" ON design_mockups;
CREATE POLICY "Admins can manage design mockups" ON design_mockups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Design products policies: Public read, admin write
DROP POLICY IF EXISTS "Public can view design products" ON design_products;
CREATE POLICY "Public can view design products" ON design_products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM designs
      WHERE designs.id = design_products.design_id
      AND designs.active = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage design products" ON design_products;
CREATE POLICY "Admins can manage design products" ON design_products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- PART 6: VALIDATION QUERIES
-- ============================================================================

-- Verify tables were created
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('designs', 'design_mockups', 'design_products')
ORDER BY table_name;

-- Verify indexes were created
SELECT
  indexname,
  tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('designs', 'design_mockups', 'design_products')
ORDER BY tablename, indexname;

-- Verify RLS is enabled
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('designs', 'design_mockups', 'design_products');

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Design/Product Architecture Schema Created Successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables Created:';
  RAISE NOTICE '  - designs (visual patterns)';
  RAISE NOTICE '  - design_mockups (sport+product mockups)';
  RAISE NOTICE '  - design_products (junction table)';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables Modified:';
  RAISE NOTICE '  - products (added design fields)';
  RAISE NOTICE '  - design_requests (added design_id)';
  RAISE NOTICE '  - order_items (added design_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Export schema: node scripts/export-live-schema.mjs';
  RAISE NOTICE '  2. Update SCHEMA_REFERENCE.sql';
  RAISE NOTICE '  3. Start adding test designs!';
END $$;
