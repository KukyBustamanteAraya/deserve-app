'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Sport {
  id: number;
  slug: string;
  name: string;
}

interface Product {
  product_id: number;
  product_name: string;
  product_slug: string;
  product_type_slug: string;
  product_type_name: string;
  category: string;
  price_cents: number;
  available_designs_count: number;
  sample_design_mockup: string | null;
  sort_order: number;
}

interface Design {
  design_id: string;
  slug: string;
  name: string;
  description: string | null;
  designer_name: string | null;
  style_tags: string[];
  color_scheme: string[];
  is_customizable: boolean;
  allows_recoloring: boolean;
  featured: boolean;
  primary_mockup_url: string;
  available_on_sports: any[];
}

interface CatalogWithSportSelectorProps {
  sports: Sport[];
}

export function CatalogWithSportSelector({ sports }: CatalogWithSportSelectorProps) {
  const [selectedSport, setSelectedSport] = useState<Sport | null>(sports[0] || null);
  const [products, setProducts] = useState<Product[]>([]);
  const [designsBySport, setDesignsBySport] = useState<Map<string, Design[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch products and designs for selected sport
  useEffect(() => {
    if (!selectedSport) return;

    async function fetchCatalogData() {
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch products for this sport
        const productsResponse = await fetch(`/api/catalog/${selectedSport.slug}/products`);
        if (!productsResponse.ok) {
          throw new Error('Failed to fetch products');
        }
        const productsData = await productsResponse.json();

        if (!productsData.success) {
          throw new Error(productsData.error || 'Failed to load products');
        }

        const fetchedProducts = productsData.data.products || [];
        setProducts(fetchedProducts);

        // 2. Fetch designs for each product
        const designsMap = new Map<string, Design[]>();

        await Promise.all(
          fetchedProducts.map(async (product: Product) => {
            const designsResponse = await fetch(
              `/api/catalog/${selectedSport.slug}/${product.product_type_slug}/designs`
            );

            if (designsResponse.ok) {
              const designsData = await designsResponse.json();
              if (designsData.success && designsData.data.designs) {
                designsMap.set(product.product_type_slug, designsData.data.designs);
              }
            }
          })
        );

        setDesignsBySport(designsMap);
      } catch (err) {
        console.error('Error fetching catalog data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchCatalogData();
  }, [selectedSport]);

  if (sports.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No hay deportes disponibles</p>
      </div>
    );
  }

  return (
    <div>
      {/* Sport Selector - Tabs */}
      <div className="mb-8 border-b border-gray-700">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sports.map((sport) => (
            <button
              key={sport.id}
              onClick={() => setSelectedSport(sport)}
              className={`px-6 py-3 rounded-t-lg font-semibold transition-all whitespace-nowrap ${
                selectedSport?.id === sport.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {sport.name}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-blue-500"></div>
          <p className="text-gray-400 mt-4">Cargando productos...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-xl p-6 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Products with Design Rows */}
      {!loading && !error && products.length === 0 && (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-12 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="text-xl font-semibold text-white mb-2">
            No hay productos disponibles
          </h3>
          <p className="text-gray-400">
            Los productos para {selectedSport?.name} estarán disponibles pronto.
          </p>
        </div>
      )}

      {/* Product Rows */}
      {!loading && !error && products.length > 0 && (
        <div className="space-y-12">
          {products.map((product) => {
            const designs = designsBySport.get(product.product_type_slug) || [];

            return (
              <div key={product.product_id} className="space-y-4">
                {/* Product Row Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-white">
                      {product.product_type_name}
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                      ${product.price_cents.toLocaleString()} CLP • {designs.length} {designs.length === 1 ? 'diseño' : 'diseños'}
                    </p>
                  </div>
                  {designs.length > 0 && (
                    <Link
                      href={`/catalog/${selectedSport?.slug}/${product.product_type_slug}`}
                      className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-2 transition-colors"
                    >
                      Ver todos
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}
                </div>

                {/* Designs Row - Horizontal Scroll */}
                {designs.length === 0 ? (
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
                    <p className="text-gray-500">No hay diseños disponibles para este producto</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="flex gap-4 pb-4">
                      {designs.map((design) => (
                        <Link
                          key={design.design_id}
                          href={`/designs/${design.slug}?sport=${selectedSport?.slug}`}
                          className="flex-shrink-0 w-64 group"
                        >
                          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700 overflow-hidden hover:border-blue-500/50 transition-all shadow-lg hover:shadow-blue-500/20">
                            {/* Design Image */}
                            <div className="relative h-64 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                              {design.primary_mockup_url ? (
                                <img
                                  src={design.primary_mockup_url}
                                  alt={design.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="text-gray-500">
                                  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}

                              {/* Featured Badge */}
                              {design.featured && (
                                <div className="absolute top-3 left-3 bg-yellow-500 text-gray-900 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                                  Destacado
                                </div>
                              )}
                            </div>

                            {/* Design Info */}
                            <div className="p-4">
                              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
                                {design.name}
                              </h3>
                              {design.designer_name && (
                                <p className="text-sm text-gray-400 mb-2">
                                  por {design.designer_name}
                                </p>
                              )}
                              {design.style_tags && design.style_tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {design.style_tags.slice(0, 2).map((tag, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/50"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
