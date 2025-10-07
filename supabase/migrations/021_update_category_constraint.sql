-- Migration 021: Update category constraint to allow new component types
-- Removes old category constraint and adds new one with jersey, shorts, socks, jacket, pants, bag

-- Drop existing constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_allowed;

-- Add new constraint with updated category values
ALTER TABLE products ADD CONSTRAINT products_category_allowed
  CHECK (category IN ('jersey', 'shorts', 'socks', 'jacket', 'pants', 'bag', 'camiseta', 'poleron', 'medias', 'chaqueta'));

-- Update existing products to use new category names
UPDATE products SET category = 'jersey' WHERE category = 'camiseta';
UPDATE products SET category = 'jacket' WHERE category = 'chaqueta';
UPDATE products SET category = 'socks' WHERE category = 'medias';
UPDATE products SET category = 'jacket' WHERE category = 'poleron';

-- Now drop old values from constraint since we've migrated the data
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_allowed;
ALTER TABLE products ADD CONSTRAINT products_category_allowed
  CHECK (category IN ('jersey', 'shorts', 'socks', 'jacket', 'pants', 'bag'));

-- Verify the changes
SELECT id, name, category, product_type_slug FROM products ORDER BY id;
