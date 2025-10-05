-- Migration: Pricing Tiers
-- Create pricing_tiers table for tiered pricing based on quantity

CREATE TABLE IF NOT EXISTS public.pricing_tiers (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  min_quantity INT NOT NULL CHECK (min_quantity > 0),
  max_quantity INT CHECK (max_quantity IS NULL OR max_quantity >= min_quantity),
  price_per_unit_cents INT NOT NULL CHECK (price_per_unit_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure tiers don't overlap for the same product
  CONSTRAINT unique_product_quantity_range UNIQUE (product_id, min_quantity, max_quantity)
);

-- Index for faster tier lookups
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_product_quantity
  ON public.pricing_tiers(product_id, min_quantity, max_quantity);

-- RLS Policies
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can see pricing tiers)
CREATE POLICY "pricing_tiers_select_public"
  ON public.pricing_tiers
  FOR SELECT
  USING (true);

-- Only admins can insert/update/delete pricing tiers
CREATE POLICY "pricing_tiers_insert_admin"
  ON public.pricing_tiers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "pricing_tiers_update_admin"
  ON public.pricing_tiers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "pricing_tiers_delete_admin"
  ON public.pricing_tiers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Helper function to get the applicable tier for a product and quantity
CREATE OR REPLACE FUNCTION get_pricing_tier(p_product_id BIGINT, p_quantity INT)
RETURNS TABLE (
  min_quantity INT,
  max_quantity INT,
  price_per_unit_cents INT,
  discount_pct INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pt.min_quantity,
    pt.max_quantity,
    pt.price_per_unit_cents,
    -- Calculate discount percentage based on base price
    CASE
      WHEN p.display_price_cents > 0
      THEN ROUND(((p.display_price_cents - pt.price_per_unit_cents)::DECIMAL / p.display_price_cents * 100))::INT
      ELSE 0
    END as discount_pct
  FROM public.pricing_tiers pt
  JOIN (
    SELECT
      id,
      COALESCE(retail_price_cents, price_cents, base_price_cents, 0) as display_price_cents
    FROM public.products
    WHERE id = p_product_id
  ) p ON p.id = pt.product_id
  WHERE pt.product_id = p_product_id
    AND pt.min_quantity <= p_quantity
    AND (pt.max_quantity IS NULL OR pt.max_quantity >= p_quantity)
  ORDER BY pt.min_quantity DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE public.pricing_tiers IS 'Tiered pricing for products based on order quantity';
COMMENT ON FUNCTION get_pricing_tier IS 'Get the applicable pricing tier for a product and quantity';
