-- Check what size chart data exists
SELECT
  sport_id,
  product_type_slug,
  gender,
  COUNT(*) as num_sizes,
  string_agg(DISTINCT size::text, ', ' ORDER BY size::text) as sizes
FROM size_charts
GROUP BY sport_id, product_type_slug, gender
ORDER BY sport_id, product_type_slug, gender;

-- Also show a few example rows
SELECT * FROM size_charts LIMIT 10;
