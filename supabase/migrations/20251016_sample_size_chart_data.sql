-- Sample Size Chart Data for Testing
-- This file contains realistic size chart data for soccer jerseys

-- First, let's make sure we have a sport to reference (Soccer should be ID 1)
-- If not, you'll need to adjust the sport_id values below

-- Boys Soccer Jerseys (Ages 8-16, Heights ~125-175cm)
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm,
  sleeve_length_cm, is_active
) VALUES
  -- XXS (8-9 years)
  (1, 'jersey', 'boys', 'XXS', 125, 135, 38, 52, 14, true),
  -- XS (10-11 years)
  (1, 'jersey', 'boys', 'XS', 136, 145, 41, 56, 15, true),
  -- S (12-13 years)
  (1, 'jersey', 'boys', 'S', 146, 155, 44, 60, 16, true),
  -- M (14-15 years)
  (1, 'jersey', 'boys', 'M', 156, 165, 47, 64, 17, true),
  -- L (15-16 years)
  (1, 'jersey', 'boys', 'L', 166, 175, 50, 68, 18, true);

-- Girls Soccer Jerseys (Ages 8-16, Heights ~125-170cm)
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm,
  sleeve_length_cm, is_active
) VALUES
  -- XXS (8-9 years)
  (1, 'jersey', 'girls', 'XXS', 125, 135, 37, 51, 14, true),
  -- XS (10-11 years)
  (1, 'jersey', 'girls', 'XS', 136, 145, 40, 55, 15, true),
  -- S (12-13 years)
  (1, 'jersey', 'girls', 'S', 146, 155, 43, 58, 16, true),
  -- M (14-15 years)
  (1, 'jersey', 'girls', 'M', 156, 165, 46, 61, 17, true),
  -- L (15-16 years)
  (1, 'jersey', 'girls', 'L', 166, 170, 48, 64, 18, true);

-- Men Soccer Jerseys (Adult, Heights ~165-195cm)
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm,
  sleeve_length_cm, weight_min_kg, weight_max_kg, is_active
) VALUES
  -- XS (Adult small)
  (1, 'jersey', 'men', 'XS', 165, 170, 48, 68, 19, 55, 65, true),
  -- S
  (1, 'jersey', 'men', 'S', 171, 176, 51, 70, 20, 65, 75, true),
  -- M
  (1, 'jersey', 'men', 'M', 177, 182, 54, 72, 21, 75, 85, true),
  -- L
  (1, 'jersey', 'men', 'L', 183, 188, 57, 74, 22, 85, 95, true),
  -- XL
  (1, 'jersey', 'men', 'XL', 189, 195, 60, 76, 23, 95, 105, true),
  -- XXL
  (1, 'jersey', 'men', 'XXL', 195, 200, 63, 78, 24, 105, 115, true);

-- Women Soccer Jerseys (Adult, Heights ~155-185cm)
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm,
  sleeve_length_cm, weight_min_kg, weight_max_kg, is_active
) VALUES
  -- XS
  (1, 'jersey', 'women', 'XS', 155, 160, 44, 62, 17, 45, 55, true),
  -- S
  (1, 'jersey', 'women', 'S', 161, 166, 47, 64, 18, 55, 65, true),
  -- M
  (1, 'jersey', 'women', 'M', 167, 172, 50, 66, 19, 65, 75, true),
  -- L
  (1, 'jersey', 'women', 'L', 173, 178, 53, 68, 20, 75, 85, true),
  -- XL
  (1, 'jersey', 'women', 'XL', 179, 185, 56, 70, 21, 85, 95, true);

-- Soccer Shorts (Unisex Youth - can be used for both boys and girls)
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm, shorts_length_cm,
  waist_width_cm, is_active
) VALUES
  -- Youth shorts use chest_width for reference, jersey_length is not critical
  (1, 'shorts', 'boys', 'XXS', 125, 135, 38, 52, 35, 30, true),
  (1, 'shorts', 'boys', 'XS', 136, 145, 41, 56, 38, 32, true),
  (1, 'shorts', 'boys', 'S', 146, 155, 44, 60, 41, 34, true),
  (1, 'shorts', 'boys', 'M', 156, 165, 47, 64, 44, 36, true),
  (1, 'shorts', 'boys', 'L', 166, 175, 50, 68, 47, 38, true);

INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm, shorts_length_cm,
  waist_width_cm, is_active
) VALUES
  (1, 'shorts', 'girls', 'XXS', 125, 135, 37, 51, 34, 29, true),
  (1, 'shorts', 'girls', 'XS', 136, 145, 40, 55, 37, 31, true),
  (1, 'shorts', 'girls', 'S', 146, 155, 43, 58, 40, 33, true),
  (1, 'shorts', 'girls', 'M', 156, 165, 46, 61, 42, 35, true),
  (1, 'shorts', 'girls', 'L', 166, 170, 48, 64, 44, 37, true);

-- Men Shorts
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm, shorts_length_cm,
  waist_width_cm, weight_min_kg, weight_max_kg, is_active
) VALUES
  (1, 'shorts', 'men', 'XS', 165, 170, 48, 68, 45, 38, 55, 65, true),
  (1, 'shorts', 'men', 'S', 171, 176, 51, 70, 47, 40, 65, 75, true),
  (1, 'shorts', 'men', 'M', 177, 182, 54, 72, 49, 42, 75, 85, true),
  (1, 'shorts', 'men', 'L', 183, 188, 57, 74, 51, 44, 85, 95, true),
  (1, 'shorts', 'men', 'XL', 189, 195, 60, 76, 53, 46, 95, 105, true),
  (1, 'shorts', 'men', 'XXL', 195, 200, 63, 78, 55, 48, 105, 115, true);

-- Women Shorts
INSERT INTO size_charts (
  sport_id, product_type_slug, gender, size,
  height_min_cm, height_max_cm,
  chest_width_cm, jersey_length_cm, shorts_length_cm,
  waist_width_cm, hip_width_cm, weight_min_kg, weight_max_kg, is_active
) VALUES
  (1, 'shorts', 'women', 'XS', 155, 160, 44, 62, 40, 34, 44, 45, 55, true),
  (1, 'shorts', 'women', 'S', 161, 166, 47, 64, 42, 36, 46, 55, 65, true),
  (1, 'shorts', 'women', 'M', 167, 172, 50, 66, 44, 38, 48, 65, 75, true),
  (1, 'shorts', 'women', 'L', 173, 178, 53, 68, 46, 40, 50, 75, 85, true),
  (1, 'shorts', 'women', 'XL', 179, 185, 56, 70, 48, 42, 52, 85, 95, true);

-- Add a comment
COMMENT ON TABLE size_charts IS 'Size chart data updated with sample data for testing - 2025-10-16';
