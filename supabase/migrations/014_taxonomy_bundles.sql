-- Migration 014: Taxonomy & Bundles
-- Implements finalized catalog plan: product types, sports, bundles, fabric recommendations

-- ============================================================================
-- PART 1: CREATE TABLES
-- ============================================================================

-- Product Types (jersey, shorts, polo, etc.)
CREATE TABLE IF NOT EXISTS product_types (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Top', 'Bottom', 'Outerwear', 'Socks', 'Accessory')),
  variant TEXT, -- marketing variant (e.g., "AeroFleece", "No Pockets")
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sports taxonomy
CREATE TABLE IF NOT EXISTS sports (
  slug TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bundles (universal kits)
CREATE TABLE IF NOT EXISTS bundles (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  components JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{type_slug, qty}, ...]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fabric aliases (normalize variants to canonical names)
CREATE TABLE IF NOT EXISTS fabric_aliases (
  alias TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL REFERENCES fabrics(name) ON DELETE CASCADE
);

-- Fabric recommendations per product type (universal)
CREATE TABLE IF NOT EXISTS product_fabric_recommendations (
  id BIGSERIAL PRIMARY KEY,
  product_type_slug TEXT NOT NULL REFERENCES product_types(slug) ON DELETE CASCADE,
  fabric_name TEXT NOT NULL,
  suitability SMALLINT NOT NULL CHECK (suitability BETWEEN 1 AND 5),
  UNIQUE(product_type_slug, fabric_name)
);

-- Sport-specific fabric overrides (e.g., rugby uses heavier fabrics)
CREATE TABLE IF NOT EXISTS sport_fabric_overrides (
  id BIGSERIAL PRIMARY KEY,
  sport_slug TEXT NOT NULL REFERENCES sports(slug) ON DELETE CASCADE,
  product_type_slug TEXT NOT NULL REFERENCES product_types(slug) ON DELETE CASCADE,
  fabric_name TEXT NOT NULL,
  suitability SMALLINT NOT NULL CHECK (suitability BETWEEN 1 AND 5),
  UNIQUE(sport_slug, product_type_slug, fabric_name)
);

-- ============================================================================
-- PART 2: INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_product_types_slug ON product_types(slug);
CREATE INDEX IF NOT EXISTS idx_product_fabric_recs_type ON product_fabric_recommendations(product_type_slug);
CREATE INDEX IF NOT EXISTS idx_sport_fabric_overrides_sport ON sport_fabric_overrides(sport_slug, product_type_slug);

-- ============================================================================
-- PART 3: RLS POLICIES
-- ============================================================================

ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_fabric_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sport_fabric_overrides ENABLE ROW LEVEL SECURITY;

-- Read-only for authenticated users (no anon access)
DROP POLICY IF EXISTS "Authenticated users can read product types" ON product_types;
CREATE POLICY "Authenticated users can read product types" ON product_types FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can read sports" ON sports;
CREATE POLICY "Authenticated users can read sports" ON sports FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can read bundles" ON bundles;
CREATE POLICY "Authenticated users can read bundles" ON bundles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can read fabric aliases" ON fabric_aliases;
CREATE POLICY "Authenticated users can read fabric aliases" ON fabric_aliases FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can read fabric recommendations" ON product_fabric_recommendations;
CREATE POLICY "Authenticated users can read fabric recommendations" ON product_fabric_recommendations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can read sport overrides" ON sport_fabric_overrides;
CREATE POLICY "Authenticated users can read sport overrides" ON sport_fabric_overrides FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- PART 4: HELPER FUNCTIONS (IDEMPOTENT UPSERTS)
-- ============================================================================

-- Upsert fabric suitability for a product type
CREATE OR REPLACE FUNCTION upsert_fabric_suitability(
  p_type_slug TEXT,
  p_fabric_name TEXT,
  p_suitability SMALLINT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO product_fabric_recommendations (product_type_slug, fabric_name, suitability)
  VALUES (p_type_slug, p_fabric_name, p_suitability)
  ON CONFLICT (product_type_slug, fabric_name)
  DO UPDATE SET suitability = EXCLUDED.suitability;
END;
$$ LANGUAGE plpgsql;

-- Upsert sport-specific fabric override
CREATE OR REPLACE FUNCTION upsert_sport_fabric_override(
  p_sport_slug TEXT,
  p_type_slug TEXT,
  p_fabric_name TEXT,
  p_suitability SMALLINT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO sport_fabric_overrides (sport_slug, product_type_slug, fabric_name, suitability)
  VALUES (p_sport_slug, p_type_slug, p_fabric_name, p_suitability)
  ON CONFLICT (sport_slug, product_type_slug, fabric_name)
  DO UPDATE SET suitability = EXCLUDED.suitability;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 5: SEED NEW FABRICS (if not exist)
-- ============================================================================

-- Golf pants fabrics
INSERT INTO fabrics (name, composition, description, use_case, price_modifier_cents)
VALUES
  ('TwillFlex', '97% Cotton, 3% Spandex', 'Stretch twill fabric for performance golf wear', 'Golf pants with athletic stretch', 4000),
  ('TwillShield', '97% Cotton, 3% Spandex with DWR', 'Stretch twill with light water repellent coating', 'Golf pants with weather protection', 5000)
ON CONFLICT (name) DO NOTHING;

-- Outerwear/base fabrics (if missing)
INSERT INTO fabrics (name, composition, description, use_case, price_modifier_cents)
VALUES
  ('Cotton', '100% Cotton', 'Classic cotton fleece', 'Casual hoodies and sweatshirts', 0),
  ('Heavy Cotton', '100% Heavy Cotton', 'Heavyweight cotton fleece', 'Premium hoodies with warmth', 1500),
  ('WindShell', 'Polyester ripstop with wind-resistant coating', 'Lightweight wind protection', 'Windbreakers and outer layers', 3000),
  ('RainShell', 'Nylon with waterproof membrane', 'Full weather protection shell', 'Rain jackets', 6000)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- PART 6: SEED PRODUCT TYPES
-- ============================================================================

INSERT INTO product_types (slug, display_name, category, variant) VALUES
  -- Tops
  ('jersey', 'Jersey', 'Top', NULL),
  ('training-jersey', 'Training Jersey', 'Top', NULL),
  ('training-polo', 'Training Polo', 'Top', NULL),
  ('golf-polo', 'Golf Polo', 'Top', NULL),
  ('tank', 'Tank (Sleeveless)', 'Top', NULL),
  ('long-sleeve', 'Long Sleeve Training Shirt', 'Top', NULL),
  ('yoga-top', 'Yoga/Pilates Top', 'Top', NULL),
  -- Outerwear
  ('pullover-3q', '3/4 Pullover', 'Outerwear', NULL),
  ('hoodie-light', 'Lightweight Hoodie', 'Outerwear', 'AeroFleece'),
  ('hoodie-cotton', 'Cotton Hoodie', 'Outerwear', 'ClassicFleece'),
  ('hoodie-heavy', 'Heavy Cotton Hoodie', 'Outerwear', 'HeavyFleece'),
  ('windbreaker', 'Windbreaker', 'Outerwear', 'AeroShell'),
  ('rain-jacket', 'Rain Jacket', 'Outerwear', 'StormGuard'),
  ('tracksuit-jacket', 'Tracksuit Jacket', 'Outerwear', 'Transit Jacket'),
  -- Bottoms
  ('shorts', 'Shorts', 'Bottom', NULL),
  ('training-shorts', 'Training Shorts', 'Bottom', 'No Pockets'),
  ('training-shorts-pocket', 'Training Shorts (Pockets)', 'Bottom', 'Pockets'),
  ('golf-pants', 'Golf Pants', 'Bottom', NULL),
  ('tracksuit-pants', 'Tracksuit Pants', 'Bottom', 'Transit Pants'),
  ('travel-pants', 'Travel Pants', 'Bottom', 'Voyage Pants'),
  ('yoga-pants', 'Yoga/Pilates Pants', 'Bottom', NULL),
  ('yoga-shorts', 'Yoga/Pilates Shorts', 'Bottom', NULL),
  -- Socks
  ('socks', 'Socks', 'Socks', NULL),
  -- Accessories
  ('duffel-bag', 'Travel Duffel', 'Accessory', 'Voyage Duffel')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- PART 7: SEED SPORTS
-- ============================================================================

INSERT INTO sports (slug, display_name) VALUES
  ('soccer', 'Soccer'),
  ('basketball', 'Basketball'),
  ('volleyball', 'Volleyball'),
  ('rugby', 'Rugby'),
  ('golf', 'Golf'),
  ('training', 'Training'),
  ('yoga-pilates', 'Yoga/Pilates'),
  ('padel', 'Padel'),
  ('crossfit', 'CrossFit')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- PART 8: SEED BUNDLES
-- ============================================================================

INSERT INTO bundles (code, name, description, components) VALUES
  ('B1', 'Core Uniform', 'Jersey and shorts', '[{"type_slug":"jersey","qty":1},{"type_slug":"shorts","qty":1}]'::jsonb),
  ('B2', 'Full Kit', 'Complete match kit with socks', '[{"type_slug":"jersey","qty":1},{"type_slug":"shorts","qty":1},{"type_slug":"socks","qty":1}]'::jsonb),
  ('B3', 'Home & Away Jerseys', 'Two jerseys for home and away', '[{"type_slug":"jersey","qty":2}]'::jsonb),
  ('B4', 'H/A + Shorts + Jacket', 'Two kits with windbreaker', '[{"type_slug":"jersey","qty":2},{"type_slug":"shorts","qty":2},{"type_slug":"windbreaker","qty":1}]'::jsonb),
  ('B5', 'Full Kit + Tracksuit', 'Match kit with travel tracksuit', '[{"type_slug":"jersey","qty":1},{"type_slug":"shorts","qty":1},{"type_slug":"socks","qty":1},{"type_slug":"tracksuit-jacket","qty":1},{"type_slug":"tracksuit-pants","qty":1}]'::jsonb),
  ('B6', 'H/A Kits + Tracksuit + Duffel', 'Complete team package', '[{"type_slug":"jersey","qty":2},{"type_slug":"shorts","qty":2},{"type_slug":"socks","qty":2},{"type_slug":"tracksuit-jacket","qty":1},{"type_slug":"tracksuit-pants","qty":1},{"type_slug":"duffel-bag","qty":1}]'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- PART 9: SEED FABRIC ALIASES
-- ============================================================================

INSERT INTO fabric_aliases (alias, canonical_name) VALUES
  ('Premier', 'Primer'),
  ('StretchTwill', 'TwillFlex'),
  ('TechTwill', 'TwillShield')
ON CONFLICT (alias) DO NOTHING;

-- ============================================================================
-- PART 10: SEED FABRIC SUITABILITY RULES
-- ============================================================================

-- Universal fabrics for jersey/shorts (Premium, Primer, Agile, Breather, Fly = high; Firm = low)
SELECT upsert_fabric_suitability('jersey', 'Premium', 5);
SELECT upsert_fabric_suitability('jersey', 'Primer', 5);
SELECT upsert_fabric_suitability('jersey', 'Agile', 5);
SELECT upsert_fabric_suitability('jersey', 'Breather', 5);
SELECT upsert_fabric_suitability('jersey', 'Fly', 5);
SELECT upsert_fabric_suitability('jersey', 'Firm', 2);

SELECT upsert_fabric_suitability('shorts', 'Premium', 5);
SELECT upsert_fabric_suitability('shorts', 'Primer', 5);
SELECT upsert_fabric_suitability('shorts', 'Agile', 5);
SELECT upsert_fabric_suitability('shorts', 'Breather', 5);
SELECT upsert_fabric_suitability('shorts', 'Fly', 5);
SELECT upsert_fabric_suitability('shorts', 'Firm', 2);

-- Training jersey (same as universal)
SELECT upsert_fabric_suitability('training-jersey', 'Premium', 5);
SELECT upsert_fabric_suitability('training-jersey', 'Primer', 5);
SELECT upsert_fabric_suitability('training-jersey', 'Agile', 5);
SELECT upsert_fabric_suitability('training-jersey', 'Breather', 5);
SELECT upsert_fabric_suitability('training-jersey', 'Fly', 5);

-- Training shorts (same as universal)
SELECT upsert_fabric_suitability('training-shorts', 'Premium', 5);
SELECT upsert_fabric_suitability('training-shorts', 'Primer', 5);
SELECT upsert_fabric_suitability('training-shorts', 'Agile', 5);
SELECT upsert_fabric_suitability('training-shorts', 'Breather', 5);
SELECT upsert_fabric_suitability('training-shorts', 'Fly', 5);

SELECT upsert_fabric_suitability('training-shorts-pocket', 'Premium', 5);
SELECT upsert_fabric_suitability('training-shorts-pocket', 'Primer', 5);
SELECT upsert_fabric_suitability('training-shorts-pocket', 'Agile', 5);
SELECT upsert_fabric_suitability('training-shorts-pocket', 'Breather', 5);
SELECT upsert_fabric_suitability('training-shorts-pocket', 'Fly', 5);

-- Training polo: ONLY Agile or Primer
SELECT upsert_fabric_suitability('training-polo', 'Agile', 5);
SELECT upsert_fabric_suitability('training-polo', 'Primer', 5);

-- Golf polo: ONLY Agile or Primer
SELECT upsert_fabric_suitability('golf-polo', 'Agile', 5);
SELECT upsert_fabric_suitability('golf-polo', 'Primer', 5);

-- Golf pants: TwillFlex★5 > TwillShield★4
SELECT upsert_fabric_suitability('golf-pants', 'TwillFlex', 5);
SELECT upsert_fabric_suitability('golf-pants', 'TwillShield', 4);

-- Tank/long-sleeve (universal performance fabrics)
SELECT upsert_fabric_suitability('tank', 'Premium', 5);
SELECT upsert_fabric_suitability('tank', 'Primer', 5);
SELECT upsert_fabric_suitability('tank', 'Agile', 5);
SELECT upsert_fabric_suitability('tank', 'Breather', 5);
SELECT upsert_fabric_suitability('tank', 'Fly', 5);

SELECT upsert_fabric_suitability('long-sleeve', 'Premium', 5);
SELECT upsert_fabric_suitability('long-sleeve', 'Primer', 5);
SELECT upsert_fabric_suitability('long-sleeve', 'Agile', 5);
SELECT upsert_fabric_suitability('long-sleeve', 'Breather', 5);
SELECT upsert_fabric_suitability('long-sleeve', 'Fly', 5);

-- Yoga/Pilates: ONLY Lit and Lightweight
SELECT upsert_fabric_suitability('yoga-pants', 'Lit', 5);
SELECT upsert_fabric_suitability('yoga-pants', 'Lightweight', 5);

SELECT upsert_fabric_suitability('yoga-shorts', 'Lit', 5);
SELECT upsert_fabric_suitability('yoga-shorts', 'Lightweight', 5);

SELECT upsert_fabric_suitability('yoga-top', 'Lit', 5);
SELECT upsert_fabric_suitability('yoga-top', 'Lightweight', 5);

-- Outerwear/Travel
SELECT upsert_fabric_suitability('windbreaker', 'WindShell', 5);
SELECT upsert_fabric_suitability('windbreaker', 'Lightweight', 4);

SELECT upsert_fabric_suitability('rain-jacket', 'RainShell', 5);
SELECT upsert_fabric_suitability('rain-jacket', 'WindShell', 4);

SELECT upsert_fabric_suitability('hoodie-light', 'Lightweight', 5);
SELECT upsert_fabric_suitability('hoodie-cotton', 'Cotton', 5);
SELECT upsert_fabric_suitability('hoodie-heavy', 'Heavy Cotton', 5);

SELECT upsert_fabric_suitability('tracksuit-jacket', 'Lightweight', 4);
SELECT upsert_fabric_suitability('tracksuit-jacket', 'Premium', 3);

SELECT upsert_fabric_suitability('tracksuit-pants', 'Lightweight', 4);
SELECT upsert_fabric_suitability('tracksuit-pants', 'Premium', 3);

SELECT upsert_fabric_suitability('travel-pants', 'Lightweight', 4);
SELECT upsert_fabric_suitability('travel-pants', 'Premium', 3);

-- Socks (universal - no specific fabric restrictions for MVP)
-- (Will be handled separately if needed)

-- ============================================================================
-- PART 11: SPORT-SPECIFIC OVERRIDES
-- ============================================================================

-- Rugby: uses heavier fabrics
SELECT upsert_sport_fabric_override('rugby', 'jersey', 'Firm', 5);
SELECT upsert_sport_fabric_override('rugby', 'shorts', 'Firm', 4);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
