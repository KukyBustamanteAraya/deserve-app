'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
  price_clp: number;
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
  const searchParams = useSearchParams();
  const sportFromUrl = searchParams.get('sport');

  const [selectedSport, setSelectedSport] = useState<Sport | null>(() => {
    if (sportFromUrl) {
      const matchedSport = sports.find(s => s.slug === sportFromUrl);
      return matchedSport || sports[0] || null;
    }
    return sports[0] || null;
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch products for selected sport
  useEffect(() => {
    if (!selectedSport) return;

    async function fetchProducts() {
      setLoading(true);
      setError(null);
      setSelectedProduct(null);
      setDesigns([]);

      try {
        const productsResponse = await fetch(`/api/catalog/${selectedSport!.slug}/products`);
        if (!productsResponse.ok) {
          throw new Error('Failed to fetch products');
        }
        const productsData = await productsResponse.json();

        if (!productsData.success) {
          throw new Error(productsData.error || 'Failed to load products');
        }

        const fetchedProducts = productsData.data.products || [];
        setProducts(fetchedProducts);

        // Auto-select first product
        if (fetchedProducts.length > 0) {
          setSelectedProduct(fetchedProducts[0]);
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [selectedSport]);

  // Fetch designs for selected product
  useEffect(() => {
    if (!selectedSport || !selectedProduct) return;

    async function fetchDesigns() {
      setLoadingDesigns(true);

      try {
        const designsResponse = await fetch(
          `/api/catalog/${selectedSport!.slug}/${selectedProduct!.product_type_slug}/designs`
        );

        if (designsResponse.ok) {
          const designsData = await designsResponse.json();
          if (designsData.success && designsData.data.designs) {
            setDesigns(designsData.data.designs);
          } else {
            setDesigns([]);
          }
        } else {
          setDesigns([]);
        }
      } catch (err) {
        console.error('Error fetching designs:', err);
        setDesigns([]);
      } finally {
        setLoadingDesigns(false);
      }
    }

    fetchDesigns();
  }, [selectedSport, selectedProduct]);

  if (sports.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-300">No hay deportes disponibles</p>
      </div>
    );
  }

  return (
    <div>
      {/* Sport Selector - Tabs */}
      <div className="mb-4 border-b border-gray-700">
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
          {sports.map((sport) => (
            <button
              key={sport.id}
              onClick={() => setSelectedSport(sport)}
              className={`relative px-3 py-2 sm:px-6 sm:py-3 rounded-t-lg font-semibold transition-all whitespace-nowrap backdrop-blur-md overflow-hidden group ${
                selectedSport?.id === sport.id
                  ? 'bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white shadow-lg shadow-[#e21c21]/30 border border-[#e21c21]/50'
                  : 'bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 text-gray-300 border border-gray-700 hover:border-[#e21c21]/50 hover:text-white hover:shadow-md'
              }`}
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              {/* Glass shine effect */}
              <div className="absolute inset-0 rounded-t-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative text-xs sm:text-base">{sport.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-[#e21c21]"></div>
          <p className="text-gray-300 mt-4">Cargando productos...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-gradient-to-br from-red-900/20 via-red-800/10 to-red-900/20 border border-red-500/30 rounded-xl p-6 text-center backdrop-blur-md">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* No Products State */}
      {!loading && !error && products.length === 0 && (
        <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl p-12 text-center shadow-lg overflow-hidden group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="text-xl font-semibold text-white mb-2 relative">
            No hay productos disponibles
          </h3>
          <p className="text-gray-300 relative">
            Los productos para {selectedSport?.name} estarán disponibles pronto.
          </p>
        </div>
      )}

      {/* Product Toggles - Second Row */}
      {!loading && !error && products.length > 0 && (
        <>
          <div className="mb-6">
            <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
              {products.map((product) => (
                <button
                  key={product.product_id}
                  onClick={() => setSelectedProduct(product)}
                  className={`relative px-3 py-2 sm:px-5 sm:py-2.5 rounded-lg font-medium transition-all whitespace-nowrap backdrop-blur-md overflow-hidden group ${
                    selectedProduct?.product_id === product.product_id
                      ? 'bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white shadow-lg shadow-[#e21c21]/30 border border-[#e21c21]/50'
                      : 'bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 text-gray-300 border border-gray-700 hover:border-[#e21c21]/50 hover:text-white hover:shadow-md'
                  }`}
                  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                >
                  {/* Glass shine effect */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  <span className="relative text-xs sm:text-sm">{product.product_type_name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Designs Grid */}
          {loadingDesigns ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-[#e21c21]"></div>
              <p className="text-gray-300 mt-4">Cargando diseños...</p>
            </div>
          ) : designs.length === 0 ? (
            <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg p-8 text-center overflow-hidden group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <p className="text-gray-300 relative">No hay diseños disponibles para este producto</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {designs.map((design) => (
                <Link
                  key={design.design_id}
                  href={`/designs/${design.slug}?sport=${selectedSport?.slug}`}
                  className="group"
                >
                  <div
                    className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-xl border border-gray-700 overflow-hidden hover:border-[#e21c21]/50 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#e21c21]/30 transition-all"
                    style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  >
                    {/* Glass shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                    {/* Top border gradient that expands on hover */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#e21c21] via-white to-[#e21c21] scale-x-0 group-hover:scale-x-100 origin-center z-10"
                      style={{ transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    ></div>

                    {/* Design Image */}
                    <div className="relative aspect-square bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm flex items-center justify-center">
                      {design.primary_mockup_url ? (
                        <img
                          src={design.primary_mockup_url}
                          alt={design.name}
                          className="w-full h-full object-cover group-hover:scale-105"
                          style={{ transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                        />
                      ) : (
                        <div className="text-gray-400">
                          <svg className="w-12 h-12 sm:w-16 sm:h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}

                      {/* Featured Badge */}
                      {design.featured && (
                        <div className="absolute top-2 left-2 bg-[#e21c21] text-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold shadow-lg">
                          Destacado
                        </div>
                      )}
                    </div>

                    {/* Design Info */}
                    <div className="p-2 sm:p-4">
                      <h3 className="text-sm sm:text-lg font-bold text-white mb-1 group-hover:text-[#e21c21] transition-colors relative inline-block">
                        {design.name}
                        {/* Underline that expands on hover */}
                        <span
                          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-0 group-hover:w-full bg-gradient-to-r from-[#e21c21] via-white to-[#e21c21] rounded-full"
                          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                        ></span>
                      </h3>
                      {design.designer_name && (
                        <p className="text-[10px] sm:text-sm text-gray-300 mb-1 sm:mb-2">
                          por {design.designer_name}
                        </p>
                      )}
                      {design.style_tags && design.style_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 sm:mt-2">
                          {design.style_tags.slice(0, 2).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 sm:px-2 sm:py-1 text-[9px] sm:text-xs rounded-full bg-gradient-to-br from-[#e21c21]/20 via-[#c11a1e]/10 to-[#a01519]/20 text-[#e21c21] border border-[#e21c21]/30"
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
          )}
        </>
      )}
    </div>
  );
}
