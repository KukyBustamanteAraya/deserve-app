-- Create size charts table for storing product sizing information
-- This enables a flexible, database-driven sizing calculator

-- Gender enum for size charts
CREATE TYPE size_chart_gender AS ENUM ('boys', 'girls', 'men', 'women', 'unisex');

-- Size enum for standard sizes
CREATE TYPE size_value AS ENUM ('XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL');

-- Size charts table
CREATE TABLE IF NOT EXISTS size_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Product classification
  sport_id INTEGER REFERENCES sports(id) ON DELETE CASCADE,
  product_type_slug TEXT NOT NULL, -- 'jersey', 'shorts', 'polo', 'tracksuit', etc.
  gender size_chart_gender NOT NULL,

  -- Size information
  size size_value NOT NULL,

  -- Height range (required for all)
  height_min_cm INTEGER NOT NULL CHECK (height_min_cm > 0 AND height_min_cm <= 250),
  height_max_cm INTEGER NOT NULL CHECK (height_max_cm > 0 AND height_max_cm <= 250),

  -- Core measurements (required)
  chest_width_cm NUMERIC(5,1) NOT NULL CHECK (chest_width_cm > 0),
  jersey_length_cm NUMERIC(5,1) NOT NULL CHECK (jersey_length_cm > 0),

  -- Optional measurements (product-specific)
  shorts_length_cm NUMERIC(5,1) CHECK (shorts_length_cm IS NULL OR shorts_length_cm > 0),
  sleeve_length_cm NUMERIC(5,1) CHECK (sleeve_length_cm IS NULL OR sleeve_length_cm > 0),
  waist_width_cm NUMERIC(5,1) CHECK (waist_width_cm IS NULL OR waist_width_cm > 0),
  hip_width_cm NUMERIC(5,1) CHECK (hip_width_cm IS NULL OR hip_width_cm > 0),

  -- Weight range (optional, for BMI calculations)
  weight_min_kg INTEGER CHECK (weight_min_kg IS NULL OR weight_min_kg > 0),
  weight_max_kg INTEGER CHECK (weight_max_kg IS NULL OR weight_max_kg > 0),

  -- Metadata
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT height_range_valid CHECK (height_max_cm >= height_min_cm),
  CONSTRAINT weight_range_valid CHECK (weight_max_kg IS NULL OR weight_min_kg IS NULL OR weight_max_kg >= weight_min_kg),

  -- Unique constraint: one size per sport/product/gender combination
  CONSTRAINT unique_size_chart UNIQUE (sport_id, product_type_slug, gender, size)
);

-- Indexes for common queries
CREATE INDEX idx_size_charts_sport ON size_charts(sport_id);
CREATE INDEX idx_size_charts_product_type ON size_charts(product_type_slug);
CREATE INDEX idx_size_charts_gender ON size_charts(gender);
CREATE INDEX idx_size_charts_active ON size_charts(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE size_charts ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view size charts)
CREATE POLICY "size_charts_public_read" ON size_charts
  FOR SELECT USING (is_active = true);

-- Admin-only write access
CREATE POLICY "size_charts_admin_insert" ON size_charts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "size_charts_admin_update" ON size_charts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "size_charts_admin_delete" ON size_charts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_size_charts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER size_charts_updated_at
  BEFORE UPDATE ON size_charts
  FOR EACH ROW
  EXECUTE FUNCTION update_size_charts_updated_at();

-- Helper function to get size chart for a product
CREATE OR REPLACE FUNCTION get_size_chart(
  p_sport_id INTEGER,
  p_product_type TEXT,
  p_gender size_chart_gender
)
RETURNS TABLE (
  size TEXT,
  height_min_cm INTEGER,
  height_max_cm INTEGER,
  chest_width_cm NUMERIC,
  jersey_length_cm NUMERIC,
  shorts_length_cm NUMERIC,
  sleeve_length_cm NUMERIC,
  waist_width_cm NUMERIC,
  hip_width_cm NUMERIC,
  weight_min_kg INTEGER,
  weight_max_kg INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.size::TEXT,
    sc.height_min_cm,
    sc.height_max_cm,
    sc.chest_width_cm,
    sc.jersey_length_cm,
    sc.shorts_length_cm,
    sc.sleeve_length_cm,
    sc.waist_width_cm,
    sc.hip_width_cm,
    sc.weight_min_kg,
    sc.weight_max_kg
  FROM size_charts sc
  WHERE sc.sport_id = p_sport_id
    AND sc.product_type_slug = p_product_type
    AND sc.gender = p_gender
    AND sc.is_active = true
  ORDER BY
    CASE sc.size
      WHEN 'XXS' THEN 1
      WHEN 'XS' THEN 2
      WHEN 'S' THEN 3
      WHEN 'M' THEN 4
      WHEN 'L' THEN 5
      WHEN 'XL' THEN 6
      WHEN 'XXL' THEN 7
      WHEN '2XL' THEN 8
      WHEN '3XL' THEN 9
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_size_chart(INTEGER, TEXT, size_chart_gender) TO authenticated;
GRANT EXECUTE ON FUNCTION get_size_chart(INTEGER, TEXT, size_chart_gender) TO anon;

-- Comment on table
COMMENT ON TABLE size_charts IS 'Stores size chart data for sizing calculator. Each row represents one size for a specific sport/product/gender combination.';
