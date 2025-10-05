-- Add discount_pct to bundles table
ALTER TABLE public.bundles
ADD COLUMN IF NOT EXISTS discount_pct INT DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 100);

COMMENT ON COLUMN public.bundles.discount_pct IS 'Bundle discount percentage (0-100)';

-- Update existing bundles with their discount percentages
UPDATE public.bundles SET discount_pct = 5 WHERE code = 'B1';
UPDATE public.bundles SET discount_pct = 7 WHERE code = 'B2';
UPDATE public.bundles SET discount_pct = 5 WHERE code = 'B3';
UPDATE public.bundles SET discount_pct = 6 WHERE code = 'B4';
UPDATE public.bundles SET discount_pct = 8 WHERE code = 'B5';
UPDATE public.bundles SET discount_pct = 10 WHERE code = 'B6';
