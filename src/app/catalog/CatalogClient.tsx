'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SportFilterWithIcons } from '@/components/catalog/SportFilter';
import { InfiniteProductGrid } from '@/components/catalog/ProductGrid';
import { http } from '@/lib/http/json';
import type { Sport, ProductListResult } from '@/types/catalog';
import type { ApiResponse } from '@/types/api';
interface CatalogClientProps {
  sports: Sport[];
  initialProducts: ProductListResult;
  initialSport: string | null;
}

export function CatalogClient({ sports, initialProducts, initialSport }: CatalogClientProps) {
  const router = useRouter();

  // State - ensure initialProducts has required structure with safe defaults
  const [activeSport, setActiveSport] = useState<string | null>(initialSport);
  const [products, setProducts] = useState<ProductListResult>(
    initialProducts ?? { items: [], nextCursor: null, total: 0 }
  );
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch products for a specific sport
  const fetchProducts = useCallback(async (sportSlug: string | null, cursor?: string) => {
    try {
      const params = new URLSearchParams();
      if (sportSlug) params.append('sport', sportSlug);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '24');
      params.append('_t', Date.now().toString()); // Cache buster

      const url = `/api/catalog/products?${params}`;
      console.log('🌐 fetchProducts making request to:', url);

      const res = await fetch(url, {
        cache: 'no-store',
      });

      if (!res.ok) {
        console.error('❌ API request failed:', res.status, res.statusText);
        return { items: [], total: 0, nextCursor: null };
      }

      const body = (await res.json()) as ApiResponse<ProductListResult>;

      console.log('📨 fetchProducts response:', body);

      // Defensive validation
      if (!body || typeof body !== 'object' || !('data' in body) || !body.data) {
        console.error('❌ Invalid API response format:', body);
        return { items: [], total: 0, nextCursor: null };
      }

      const { items, total, nextCursor } = body.data;
      return {
        items: Array.isArray(items) ? items : [],
        total: typeof total === 'number' ? total : 0,
        nextCursor: nextCursor ?? null,
      };
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      return { items: [], total: 0, nextCursor: null };
    }
  }, []);

  // Handle sport change
  const handleSportChange = useCallback(async (sportSlug: string | null) => {
    console.log('🔄 handleSportChange called:', { sportSlug, activeSport, isSame: sportSlug === activeSport });

    // Always set state to trigger re-render
    setLoading(true);
    setError(null);
    setActiveSport(sportSlug);

    // Update URL without page reload
    const url = sportSlug ? `/catalog?sport=${sportSlug}` : '/catalog';
    router.push(url, { scroll: false });

    try {
      console.log('📡 Calling fetchProducts with:', sportSlug);
      const newProducts = await fetchProducts(sportSlug);
      console.log('📦 fetchProducts returned:', {
        itemsCount: newProducts?.items?.length,
        total: newProducts?.total,
        hasNextCursor: !!newProducts?.nextCursor,
        items: newProducts?.items
      });

      // Ensure response has proper structure
      const productsToSet = {
        items: Array.isArray(newProducts?.items) ? newProducts.items : [],
        total: typeof newProducts?.total === 'number' ? newProducts.total : 0,
        nextCursor: newProducts?.nextCursor ?? null,
      };
      console.log('✅ Setting products state:', productsToSet);
      setProducts(productsToSet);
    } catch (error) {
      console.error('❌ Error in handleSportChange:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar productos');
      setProducts({ items: [], total: 0, nextCursor: null });
      console.error('Error changing sport:', error);
    } finally {
      setLoading(false);
    }
  }, [activeSport, router, fetchProducts]);

  // Handle load more (infinite scroll)
  const handleLoadMore = useCallback(async () => {
    if (loadingMore) return;

    const cursor = products?.nextCursor;
    if (!cursor) return;

    setLoadingMore(true);
    setError(null);

    try {
      const moreProducts = await fetchProducts(activeSport, cursor);

      setProducts(prev => ({
        items: [...(prev?.items || []), ...(moreProducts?.items || [])],
        nextCursor: moreProducts?.nextCursor || null,
        total: moreProducts?.total || prev?.total || 0,
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al cargar más productos');
      console.error('Error loading more products:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [activeSport, loadingMore, fetchProducts, products?.nextCursor]);

  // Handle retry
  const handleRetry = useCallback(() => {
    handleSportChange(activeSport);
  }, [activeSport, handleSportChange]);

  return (
    <div className="space-y-8">
      {/* Sport Filter */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Filtrar por deporte
        </h2>
        <SportFilterWithIcons
          sports={sports}
          activeSlug={activeSport}
          onChange={handleSportChange}
          showIcons={true}
        />
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {activeSport
              ? `Productos de ${sports.find(s => s.slug === activeSport)?.name || activeSport}`
              : 'Todos los productos'
            }
          </h2>
          {!loading && (
            <p className="text-gray-600 mt-1">
              {products?.total && products.total > 0
                ? `${products.items.length} de ${products.total} productos`
                : 'No hay productos disponibles'
              }
            </p>
          )}
        </div>

        {/* View toggle could go here in the future */}
      </div>

      {/* Products Grid */}
      <InfiniteProductGrid
        items={products.items}
        loading={loading}
        error={error}
        onRetry={handleRetry}
        hasMore={!!products.nextCursor}
        onLoadMore={handleLoadMore}
        loadingMore={loadingMore}
        emptyMessage={
          activeSport
            ? `No hay productos disponibles para ${sports.find(s => s.slug === activeSport)?.name || activeSport} en este momento.`
            : 'No hay productos disponibles en este momento.'
        }
      />
    </div>
  );
}