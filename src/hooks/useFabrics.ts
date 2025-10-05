'use client';

import { useState, useEffect } from 'react';

interface Fabric {
  id: string;
  name: string;
  composition: string;
  gsm: number;
  description: string;
  use_case: string;
  price_modifier_cents: number;
  video_url: string | null;
  sort_order: number;
}

interface UseFabricsReturn {
  items: Fabric[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch fabrics from /api/fabrics
 * Safely unwraps { data: { items } } wrapper
 */
export function useFabrics(): UseFabricsReturn {
  const [items, setItems] = useState<Fabric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFabrics = async () => {
      try {
        const res = await fetch('/api/fabrics', { cache: 'no-store' });
        const json = await res.json();

        // Safely unwrap { data: { items } } structure
        const fabricsList = Array.isArray(json?.data?.items) ? json.data.items : [];
        setItems(fabricsList);

        // Show error if API returned one
        if (json.error) {
          setError(json.error);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch fabrics');
        setItems([]); // Ensure items is always an array
      } finally {
        setIsLoading(false);
      }
    };

    fetchFabrics();
  }, []);

  return { items, isLoading, error };
}
