-- Migration 020: Fix Component Base Prices
-- Updates component_pricing table to use correct base prices from CSV qty 1-4 column

UPDATE component_pricing
SET
  base_price_cents = CASE component_type_slug
    WHEN 'socks' THEN 3000000      -- $30,000 CLP (was $15,000)
    WHEN 'shorts' THEN 4000000     -- $40,000 CLP (was $20,000)
    WHEN 'jersey' THEN 7000000     -- $70,000 CLP (already correct)
    WHEN 'pants' THEN 10000000     -- $100,000 CLP (was $50,000)
    WHEN 'jacket' THEN 12000000    -- $120,000 CLP (was $60,000)
    WHEN 'bag' THEN 12000000       -- $120,000 CLP (was $60,000)
    ELSE base_price_cents
  END,
  updated_at = NOW();

-- Verify the changes
SELECT
  component_type_slug,
  component_name,
  base_price_cents,
  base_price_cents / 100 as "Display Price (CLP)"
FROM component_pricing
ORDER BY display_order;
