// src/hooks/useCatalog.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@/app/components/AuthProvider';
import type { CatalogPreviewResponse, SportSlug } from '@/types/catalog';
import type { ApiResponse } from '@/types/api';

interface UseCatalogOptions {
  sport?: SportSlug | string | null;
  limit?: number;
  autoFetch?: boolean;
}

interface UseCatalogReturn {
  data: CatalogPreviewResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCatalog(options: UseCatalogOptions = {}): UseCatalogReturn {
  const { sport, limit = 50, autoFetch = true } = options;
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<CatalogPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = async () => {
    if (!user) {
      setError('Authentication required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (sport) params.append('sport', sport);
      if (limit) params.append('limit', limit.toString());

      const response = await fetch(`/api/catalog/products?${params}`);
      const result: ApiResponse<CatalogPreviewResponse> = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch catalog');
      }

      setData(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when dependencies change
  useEffect(() => {
    if (autoFetch && !authLoading && user) {
      fetchCatalog();
    }
  }, [user, authLoading, sport, limit, autoFetch]);

  // Reset data when user logs out
  useEffect(() => {
    if (!user) {
      setData(null);
      setError(null);
    }
  }, [user]);

  return {
    data,
    loading,
    error,
    refetch: fetchCatalog,
  };
}

// Specialized hook for sports only
export function useSports() {
  const { data, loading, error, refetch } = useCatalog({ autoFetch: true });

  return {
    sports: data?.sports || [],
    loading,
    error,
    refetch,
  };
}

// Specialized hook for products by sport
export function useProductsBySport(sportSlug: SportSlug | string | null) {
  const { data, loading, error, refetch } = useCatalog({
    sport: sportSlug,
    autoFetch: !!sportSlug
  });

  return {
    products: data?.products || [],
    totalProducts: data?.total_products || 0,
    loading,
    error,
    refetch,
  };
}