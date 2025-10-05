-- Add discount_pct to bundles table (idempotent)
ALTER TABLE public.bundles
  ADD COLUMN IF NOT EXISTS discount_pct INT;

-- Set discount percentages for all bundles
UPDATE public.bundles
SET discount_pct = CASE code
  WHEN 'B1' THEN 5
  WHEN 'B2' THEN 7
  WHEN 'B3' THEN 5
  WHEN 'B4' THEN 6
  WHEN 'B5' THEN 8
  WHEN 'B6' THEN 10
  ELSE 0
END;
