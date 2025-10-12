'use client';

// SWR hook for fetching products
import useSWR from 'swr';
import { buildQueryString } from '@/lib/swr/fetcher';
import type { ProductListResult } from '@/types/catalog';

interface UseProductsOptions {
  sport?: string | null;
  sportId?: string | null;
  limit?: number;
  cursor?: string | null;
}

interface UseProductsReturn {
  products: ProductListResult | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/**
 * Fetch products with optional filtering
 * Automatically revalidates when parameters change
 */
export function useProducts(options: UseProductsOptions = {}): UseProductsReturn {
  const { sport, sportId, limit = 24, cursor } = options;

  // Build query string from options
  const params = { sport, sport_id: sportId, limit, cursor };
  const queryString = buildQueryString(params);

  // Only fetch if we have a sport or sportId
  const shouldFetch = sport || sportId || (!sport && !sportId);
  const key = shouldFetch ? `/api/catalog/products${queryString}` : null;

  const { data, error, isLoading, mutate } = useSWR<ProductListResult>(key);

  return {
    products: data,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Fetch products by sport slug
 */
export function useProductsBySport(sportSlug: string | null): UseProductsReturn {
  return useProducts({ sport: sportSlug });
}
