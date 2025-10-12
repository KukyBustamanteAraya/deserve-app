-- Check existing ID types in your database
-- Run this first to see what we're working with

SELECT
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'id'
  AND table_name IN ('products', 'teams', 'profiles', 'orders', 'sports')
ORDER BY table_name;
