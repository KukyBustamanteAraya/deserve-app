'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from './useDebounce';

// New API response format (CLP integers)
export interface PriceQuote {
  unit_price: number;  // CLP integer
  quantity: number;
  total: number;       // CLP integer
  discount_pct?: number;  // Optional bundle discount
}

interface UsePricingParams {
  productId?: number;
  quantity: number;
  bundleCode?: string;
}

export function usePricing({ productId, quantity, bundleCode }: UsePricingParams) {
  const [data, setData] = useState<PriceQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce quantity changes to avoid excessive API calls
  const debouncedQuantity = useDebounce(quantity, 300);

  useEffect(() => {
    if (!productId || debouncedQuantity < 1) {
      setData(null);
      return;
    }

    const fetchPrice = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          productId: productId.toString(),
          quantity: debouncedQuantity.toString(),
        });

        if (bundleCode) {
          params.append('bundleCode', bundleCode);
        }

        const response = await fetch(`/api/pricing/calculate?${params}`, {
          cache: 'no-store',
        });

        const json = await response.json();

        if (!response.ok) {
          throw new Error(json.error || 'No pudimos calcular el precio');
        }

        setData(json);
      } catch (err: any) {
        setError(err.message || 'No pudimos calcular el precio. Intenta de nuevo.');
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrice();
  }, [productId, debouncedQuantity, bundleCode]);

  return { data, isLoading, error };
}
