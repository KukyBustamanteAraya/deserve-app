-- Add product_type_slug to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type_slug TEXT;

-- Map existing category values to product_type_slug
-- camiseta -> jersey
-- short -> shorts
UPDATE products
SET product_type_slug = CASE
  WHEN category = 'camiseta' THEN 'jersey'
  WHEN category = 'short' THEN 'shorts'
  WHEN category = 'calcetines' THEN 'socks'
  WHEN category = 'pantalon' THEN 'pants'
  WHEN category = 'poleron' THEN 'jacket'
  WHEN category = 'bolso' THEN 'bag'
  ELSE category
END
WHERE product_type_slug IS NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_product_type_slug ON products(product_type_slug);

-- Add comment
COMMENT ON COLUMN products.product_type_slug IS 'Product type slug for fabric recommendations mapping (jersey, shorts, etc.)';
