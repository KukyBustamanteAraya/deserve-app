-- ============================================================================
-- DESERVE ATHLETICS - REAL SIZING DATA
-- Date: 2025-10-16
-- Source: Official Deserve Athletics Size Charts
-- ============================================================================
-- This migration contains the ACTUAL sizing data for Deserve Athletics products
-- All measurements are in centimeters (cm)
-- Ages 12-18+ years (youth sizing)
-- ============================================================================

-- NOTE: Assumes sports table has:
-- 1 = Soccer (Fútbol)
-- 2 = Basketball
-- 3 = Volleyball
-- Run this query first to verify: SELECT id, name FROM sports ORDER BY id;

-- ============================================================================
-- BASKETBALL - BOYS/MEN (Ages 12-18+)
-- ============================================================================
-- Jerseys
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm, sleeve_length_cm,
  is_active
) VALUES
  (2, 'jersey', 'boys', 'XXS', 150, 158, 46, 69, NULL, true),
  (2, 'jersey', 'boys', 'XS', 155, 163, 48, 71, NULL, true),
  (2, 'jersey', 'boys', 'S', 160, 170, 51, 74, NULL, true),
  (2, 'jersey', 'boys', 'M', 168, 175, 53, 76, NULL, true),
  (2, 'jersey', 'boys', 'L', 173, 180, 56, 79, NULL, true),
  (2, 'jersey', 'boys', 'XL', 178, 185, 58, 84, NULL, true),
  (2, 'jersey', 'boys', 'XXL', 183, 190, 64, 89, NULL, true);

-- Shorts
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm, shorts_length_cm,
  waist_width_cm, hip_width_cm,
  is_active
) VALUES
  (2, 'shorts', 'boys', 'XXS', 150, 158, 46, 69, 48, 30.5, 42, true),
  (2, 'shorts', 'boys', 'XS', 155, 163, 48, 71, 51, 33, 44, true),
  (2, 'shorts', 'boys', 'S', 160, 170, 51, 74, 53, 35.5, 46, true),
  (2, 'shorts', 'boys', 'M', 168, 175, 53, 76, 56, 38, 48, true),
  (2, 'shorts', 'boys', 'L', 173, 180, 56, 79, 58, 40.5, 50, true),
  (2, 'shorts', 'boys', 'XL', 178, 185, 58, 84, 61, 43, 52, true),
  (2, 'shorts', 'boys', 'XXL', 183, 190, 64, 89, 64, 45.5, 54, true);

-- ============================================================================
-- BASKETBALL - GIRLS (Ages 12-18+)
-- ============================================================================
-- Jerseys
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm,
  is_active
) VALUES
  (2, 'jersey', 'girls', 'XXS', 145, 153, 47.5, 64, true),
  (2, 'jersey', 'girls', 'XS', 150, 158, 50, 67, true),
  (2, 'jersey', 'girls', 'S', 155, 163, 52.5, 69, true),
  (2, 'jersey', 'girls', 'M', 160, 168, 55, 72, true),
  (2, 'jersey', 'girls', 'L', 165, 173, 57.5, 74, true),
  (2, 'jersey', 'girls', 'XL', 170, 178, 60, 77, true),
  (2, 'jersey', 'girls', 'XXL', 176, 183, 62.5, 79, true);

-- Shorts
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm, shorts_length_cm,
  waist_width_cm, hip_width_cm,
  is_active
) VALUES
  (2, 'shorts', 'girls', 'XXS', 145, 153, 47.5, 64, 44, 28.5, 44, true),
  (2, 'shorts', 'girls', 'XS', 150, 158, 50, 67, 46, 29.5, 46, true),
  (2, 'shorts', 'girls', 'S', 155, 163, 52.5, 69, 49, 30.5, 48, true),
  (2, 'shorts', 'girls', 'M', 160, 168, 55, 72, 51, 31.5, 50, true),
  (2, 'shorts', 'girls', 'L', 165, 173, 57.5, 74, 54, 32.5, 52, true),
  (2, 'shorts', 'girls', 'XL', 170, 178, 60, 77, 56, 35.5, 55, true),
  (2, 'shorts', 'girls', 'XXL', 176, 183, 62.5, 79, 59, 37, 57, true);

-- ============================================================================
-- SOCCER (FÚTBOL) - BOYS (Ages 12-18+)
-- ============================================================================
-- Jerseys
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm,
  is_active
) VALUES
  (1, 'jersey', 'boys', 'XXS', 150, 158, 46, 64, true),
  (1, 'jersey', 'boys', 'XS', 155, 163, 48, 66, true),
  (1, 'jersey', 'boys', 'S', 160, 168, 50, 69, true),
  (1, 'jersey', 'boys', 'M', 168, 175, 52, 72, true),
  (1, 'jersey', 'boys', 'L', 173, 180, 54, 75, true),
  (1, 'jersey', 'boys', 'XL', 178, 185, 56, 77, true),
  (1, 'jersey', 'boys', 'XXL', 183, 190, 59, 80, true);

-- Shorts
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm, shorts_length_cm,
  waist_width_cm, hip_width_cm,
  is_active
) VALUES
  (1, 'shorts', 'boys', 'XXS', 150, 158, 46, 64, 29, 30.5, 42.5, true),
  (1, 'shorts', 'boys', 'XS', 155, 163, 48, 66, 30.5, 33, 45, true),
  (1, 'shorts', 'boys', 'S', 160, 168, 50, 69, 32, 35.5, 47.5, true),
  (1, 'shorts', 'boys', 'M', 168, 175, 52, 72, 33, 38, 50, true),
  (1, 'shorts', 'boys', 'L', 173, 180, 54, 75, 34, 40.5, 52.5, true),
  (1, 'shorts', 'boys', 'XL', 178, 185, 56, 77, 35, 43, 55, true),
  (1, 'shorts', 'boys', 'XXL', 183, 190, 59, 80, 36, 45.5, 57.5, true);

-- ============================================================================
-- SOCCER (FÚTBOL) - GIRLS (Ages 12-18+)
-- ============================================================================
-- Jerseys
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm,
  is_active
) VALUES
  (1, 'jersey', 'girls', 'XXS', 145, 153, 40, 61, true),
  (1, 'jersey', 'girls', 'XS', 150, 158, 42, 64, true),
  (1, 'jersey', 'girls', 'S', 155, 163, 44, 67, true),
  (1, 'jersey', 'girls', 'M', 160, 168, 46, 69, true),
  (1, 'jersey', 'girls', 'L', 165, 173, 48.5, 72, true),
  (1, 'jersey', 'girls', 'XL', 170, 178, 51.5, 74, true),
  (1, 'jersey', 'girls', 'XXL', 176, 183, 54.5, 77, true);

-- Shorts
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm, shorts_length_cm,
  waist_width_cm, hip_width_cm,
  is_active
) VALUES
  (1, 'shorts', 'girls', 'XXS', 145, 153, 40, 61, 38, 26, 40, true),
  (1, 'shorts', 'girls', 'XS', 150, 158, 42, 64, 39, 28, 43.5, true),
  (1, 'shorts', 'girls', 'S', 155, 163, 44, 67, 40, 30, 47.5, true),
  (1, 'shorts', 'girls', 'M', 160, 168, 46, 69, 41, 32, 50.5, true),
  (1, 'shorts', 'girls', 'L', 165, 173, 48.5, 72, 43, 34, 54, true),
  (1, 'shorts', 'girls', 'XL', 170, 178, 51.5, 74, 45, 36, 57.5, true),
  (1, 'shorts', 'girls', 'XXL', 176, 183, 54.5, 77, 47, 38, 60.5, true);

-- ============================================================================
-- VOLLEYBALL - BOYS/MEN (Ages 12-18+)
-- ============================================================================
-- Jerseys
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm,
  is_active
) VALUES
  (3, 'jersey', 'boys', 'XXS', 150, 158, 46, 64, true),
  (3, 'jersey', 'boys', 'XS', 155, 163, 48, 66, true),
  (3, 'jersey', 'boys', 'S', 160, 170, 50, 69, true),
  (3, 'jersey', 'boys', 'M', 168, 175, 52, 72, true),
  (3, 'jersey', 'boys', 'L', 173, 180, 54, 75, true),
  (3, 'jersey', 'boys', 'XL', 178, 185, 56, 77, true),
  (3, 'jersey', 'boys', 'XXL', 183, 190, 59, 80, true);

-- Shorts
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm, shorts_length_cm,
  waist_width_cm, hip_width_cm,
  is_active
) VALUES
  (3, 'shorts', 'boys', 'XXS', 150, 158, 46, 64, 38, 30.5, 42, true),
  (3, 'shorts', 'boys', 'XS', 155, 163, 48, 66, 40, 33, 44, true),
  (3, 'shorts', 'boys', 'S', 160, 170, 50, 69, 42, 35.5, 46, true),
  (3, 'shorts', 'boys', 'M', 168, 175, 52, 72, 44, 38, 48, true),
  (3, 'shorts', 'boys', 'L', 173, 180, 54, 75, 46, 40.5, 50, true),
  (3, 'shorts', 'boys', 'XL', 178, 185, 56, 77, 48, 43, 52, true),
  (3, 'shorts', 'boys', 'XXL', 183, 190, 59, 80, 50, 45.5, 54, true);

-- ============================================================================
-- VOLLEYBALL - GIRLS/WOMEN (Ages 12-18+)
-- ============================================================================
-- Jerseys
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm,
  is_active
) VALUES
  (3, 'jersey', 'girls', 'XXS', 145, 153, 42, 58, true),
  (3, 'jersey', 'girls', 'XS', 150, 158, 44, 61, true),
  (3, 'jersey', 'girls', 'S', 155, 163, 46, 64, true),
  (3, 'jersey', 'girls', 'M', 160, 168, 48, 67, true),
  (3, 'jersey', 'girls', 'L', 165, 173, 50, 70, true),
  (3, 'jersey', 'girls', 'XL', 170, 178, 52, 72, true),
  (3, 'jersey', 'girls', 'XXL', 176, 183, 54, 74, true);

-- Shorts
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm, shorts_length_cm,
  waist_width_cm, hip_width_cm,
  is_active
) VALUES
  (3, 'shorts', 'girls', 'XXS', 145, 153, 42, 58, 28, 26, 40, true),
  (3, 'shorts', 'girls', 'XS', 150, 158, 44, 61, 29, 28, 43.5, true),
  (3, 'shorts', 'girls', 'S', 155, 163, 46, 64, 30, 30, 47.5, true),
  (3, 'shorts', 'girls', 'M', 160, 168, 48, 67, 31, 32, 50.5, true),
  (3, 'shorts', 'girls', 'L', 165, 173, 50, 70, 32, 34, 54, true),
  (3, 'shorts', 'girls', 'XL', 170, 178, 52, 72, 33, 36, 57.5, true),
  (3, 'shorts', 'girls', 'XXL', 176, 183, 54, 74, 34, 38, 60.5, true);

-- ============================================================================
-- TRACKSUIT - BOYS/MEN (Ages 12-18+)
-- ============================================================================
-- Note: Tracksuits are usually sport-agnostic, using sport_id = 1 as default
-- You may want to add for other sports too (2, 3, etc.)

-- Tracksuit Jacket
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm, sleeve_length_cm,
  is_active
) VALUES
  (1, 'tracksuit-jacket', 'boys', 'XXS', 158, 158, 46, 56, 69, true),
  (1, 'tracksuit-jacket', 'boys', 'XS', 165, 165, 50, 58, 72, true),
  (1, 'tracksuit-jacket', 'boys', 'S', 170, 170, 54, 66, 76, true),
  (1, 'tracksuit-jacket', 'boys', 'M', 175, 175, 56, 68, 78, true),
  (1, 'tracksuit-jacket', 'boys', 'L', 180, 180, 58, 70, 80, true),
  (1, 'tracksuit-jacket', 'boys', 'XL', 185, 185, 60, 72, 82, true),
  (1, 'tracksuit-jacket', 'boys', 'XXL', 190, 190, 62, 74, 84, true);

-- Tracksuit Pants
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm,
  waist_width_cm, hip_width_cm,
  is_active
) VALUES
  (1, 'tracksuit-pants', 'boys', 'XXS', 158, 158, 46, 96, 30, 43, true),
  (1, 'tracksuit-pants', 'boys', 'XS', 165, 165, 50, 99, 32, 47.5, true),
  (1, 'tracksuit-pants', 'boys', 'S', 170, 170, 54, 101, 34, 55, true),
  (1, 'tracksuit-pants', 'boys', 'M', 175, 175, 56, 103, 36, 57.5, true),
  (1, 'tracksuit-pants', 'boys', 'L', 180, 180, 58, 105, 38, 60, true),
  (1, 'tracksuit-pants', 'boys', 'XL', 185, 185, 60, 107, 40, 62.5, true),
  (1, 'tracksuit-pants', 'boys', 'XXL', 190, 190, 62, 109, 42, 65, true);

-- ============================================================================
-- TRACKSUIT - GIRLS/WOMEN (Ages 12-18+)
-- ============================================================================
-- Tracksuit Jacket
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm, sleeve_length_cm,
  is_active
) VALUES
  (1, 'tracksuit-jacket', 'girls', 'XXS', 155, 158, 46, 54, 67, true),
  (1, 'tracksuit-jacket', 'girls', 'XS', 160, 163, 50, 56, 70, true),
  (1, 'tracksuit-jacket', 'girls', 'S', 165, 168, 54, 64, 74, true),
  (1, 'tracksuit-jacket', 'girls', 'M', 170, 173, 56, 66, 76, true),
  (1, 'tracksuit-jacket', 'girls', 'L', 174, 176, 58, 68, 78, true),
  (1, 'tracksuit-jacket', 'girls', 'XL', 177, 180, 60, 70, 80, true),
  (1, 'tracksuit-jacket', 'girls', 'XXL', 181, 183, 62, 72, 82, true);

-- Tracksuit Pants
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm,
  waist_width_cm, hip_width_cm,
  is_active
) VALUES
  (1, 'tracksuit-pants', 'girls', 'XXS', 155, 158, 46, 94, 30, 46, true),
  (1, 'tracksuit-pants', 'girls', 'XS', 160, 163, 50, 97, 32, 50, true),
  (1, 'tracksuit-pants', 'girls', 'S', 165, 168, 54, 99, 34, 58, true),
  (1, 'tracksuit-pants', 'girls', 'M', 170, 173, 56, 101, 36, 60, true),
  (1, 'tracksuit-pants', 'girls', 'L', 174, 176, 58, 103, 38, 63, true),
  (1, 'tracksuit-pants', 'girls', 'XL', 177, 180, 60, 105, 40, 66, true),
  (1, 'tracksuit-pants', 'girls', 'XXL', 181, 183, 62, 107, 42, 69, true);

-- ============================================================================
-- POLO - BOYS/MEN (Ages 12-18+)
-- ============================================================================
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm, sleeve_length_cm,
  is_active
) VALUES
  (1, 'polo', 'boys', 'XXS', 158, 160, 47, 65, 76, true),
  (1, 'polo', 'boys', 'XS', 165, 165, 50, 68, 78, true),
  (1, 'polo', 'boys', 'S', 170, 170, 54, 70, 80, true),
  (1, 'polo', 'boys', 'M', 175, 175, 56, 72, 82, true),
  (1, 'polo', 'boys', 'L', 180, 180, 58, 74, 84, true),
  (1, 'polo', 'boys', 'XL', 185, 185, 60, 76, 86, true),
  (1, 'polo', 'boys', 'XXL', 190, 190, 62, 78, 88, true);

-- ============================================================================
-- POLO - GIRLS/WOMEN (Ages 12-18+)
-- ============================================================================
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm, sleeve_length_cm,
  is_active
) VALUES
  (1, 'polo', 'girls', 'XXS', 150, 156, 42, 60, 70, true),
  (1, 'polo', 'girls', 'XS', 155, 162, 44, 62, 72, true),
  (1, 'polo', 'girls', 'S', 160, 167, 46, 64, 74, true),
  (1, 'polo', 'girls', 'M', 165, 172, 48, 66, 76, true),
  (1, 'polo', 'girls', 'L', 170, 176, 50, 68, 78, true),
  (1, 'polo', 'girls', 'XL', 174, 180, 52, 70, 80, true),
  (1, 'polo', 'girls', 'XXL', 178, 183, 54, 72, 82, true);

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this after the migration to verify all data was inserted correctly:
--
-- SELECT
--   s.name as sport,
--   sc.product_type_slug as product,
--   sc.gender,
--   COUNT(*) as num_sizes,
--   string_agg(sc.size::text, ', ' ORDER BY
--     CASE sc.size
--       WHEN 'XXS' THEN 1
--       WHEN 'XS' THEN 2
--       WHEN 'S' THEN 3
--       WHEN 'M' THEN 4
--       WHEN 'L' THEN 5
--       WHEN 'XL' THEN 6
--       WHEN 'XXL' THEN 7
--     END
--   ) as sizes
-- FROM size_charts sc
-- JOIN sports s ON s.id = sc.sport_id
-- WHERE sc.is_active = true
-- GROUP BY s.name, sc.product_type_slug, sc.gender
-- ORDER BY s.name, sc.product_type_slug, sc.gender;

-- ============================================================================
-- SUCCESS!
-- ============================================================================
COMMENT ON TABLE size_charts IS 'Deserve Athletics official sizing data - imported 2025-10-16';
