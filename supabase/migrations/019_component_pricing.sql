-- Migration 019: Component Pricing System
-- Creates table for component base prices and updates jersey prices

-- Create component_pricing table
CREATE TABLE IF NOT EXISTS component_pricing (
  id SERIAL PRIMARY KEY,
  component_type_slug TEXT NOT NULL UNIQUE,
  component_name TEXT NOT NULL,
  base_price_cents INTEGER NOT NULL, -- Base price at qty 10-24 tier
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert component base prices from Deserve CSV (qty 10-24 tier)
INSERT INTO component_pricing (component_type_slug, component_name, base_price_cents, display_order) VALUES
  ('socks', 'Calcetines', 1500000, 1),      -- $15,000 CLP
  ('shorts', 'Short', 2000000, 2),          -- $20,000 CLP
  ('jersey', 'Camiseta', 3500000, 3),       -- $35,000 CLP
  ('pants', 'Pantalón', 5000000, 4),        -- $50,000 CLP
  ('jacket', 'Polerón', 6000000, 5),        -- $60,000 CLP
  ('bag', 'Bolso', 6000000, 6)              -- $60,000 CLP
ON CONFLICT (component_type_slug) DO UPDATE SET
  base_price_cents = EXCLUDED.base_price_cents,
  component_name = EXCLUDED.component_name,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- Update existing jersey products from $20,000 to $35,000
-- Multiply all jersey prices by 1.75 (20,000 * 1.75 = 35,000)
UPDATE products
SET
  price_cents = 3500000,
  retail_price_cents = 3500000,
  base_price_cents = 3500000,
  updated_at = NOW()
WHERE product_type_slug = 'jersey'
  AND status = 'active';

-- Add comment
COMMENT ON TABLE component_pricing IS 'Base prices for each component type (socks, shorts, jersey, etc.) used in bundle pricing calculations';

-- Verify the changes
SELECT
  component_type_slug,
  component_name,
  base_price_cents,
  base_price_cents / 100 as "Display Price (CLP)"
FROM component_pricing
ORDER BY display_order;
