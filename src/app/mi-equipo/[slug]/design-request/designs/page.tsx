'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { useTeamDesignRequest } from '@/hooks/useTeamDesignRequest';
import { logger } from '@/lib/logger';
import Image from 'next/image';

interface Design {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  style_tags: string[];
  featured: boolean;
  mockup_url?: string;
}

interface ProductDesigns {
  productId: string;
  productName: string;
  productSlug: string;
  designs: Design[];
  selectedDesigns: Design[];
  loading: boolean;
}

export default function DesignSelectionPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const supabase = getBrowserClient();
  const {
    teamSlug,
    selectedProducts,
    setProductDesigns,
  } = useTeamDesignRequest();

  const [productDesignsMap, setProductDesignsMap] = useState<Record<string, ProductDesigns>>({});
  const [sportId, setSportId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);

  // Redirect if no products selected
  useEffect(() => {
    if (selectedProducts.length === 0) {
      router.push(`/mi-equipo/${params.slug}/design-request/new`);
    }
  }, [selectedProducts, params.slug, router]);

  // Validate team slug matches
  useEffect(() => {
    if (teamSlug && teamSlug !== params.slug) {
      router.push(`/mi-equipo/${params.slug}/design-request/new`);
    }
  }, [teamSlug, params.slug, router]);

  // Load designs for all selected products
  useEffect(() => {
    loadAllDesigns();
  }, [params.slug, selectedProducts]);

  const loadAllDesigns = async () => {
    try {
      // Get team sport
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('sport_id')
        .eq('slug', params.slug)
        .single();

      if (teamError) throw teamError;
      if (!teamData?.sport_id) {
        setError('Equipo no tiene deporte configurado');
        return;
      }

      setSportId(teamData.sport_id);

      // Initialize product designs map
      const initialMap: Record<string, ProductDesigns> = {};
      selectedProducts.forEach(product => {
        initialMap[product.id] = {
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          designs: [],
          selectedDesigns: product.designs.map(d => ({
            id: d.id,
            name: d.name,
            slug: '',
            description: null,
            style_tags: [],
            featured: false
          })),
          loading: true,
        };
      });
      setProductDesignsMap(initialMap);

      // Load designs for each product
      for (const product of selectedProducts) {
        await loadDesignsForProduct(product.id, product.slug, teamData.sport_id);
      }
    } catch (err: any) {
      logger.error('Error loading designs:', err);
      setError(err.message || 'Error al cargar diseños');
    }
  };

  const loadDesignsForProduct = async (productId: string, productSlug: string, sportId: number) => {
    try {
      logger.info('[Design Selection] Searching for designs:', {
        sport_id: sportId,
        product_type_slug: productSlug,
      });

      const { data: mockupsData, error: mockupsError } = await supabase
        .from('design_mockups')
        .select(`
          design_id,
          mockup_url,
          is_primary,
          design:designs!inner(
            id,
            slug,
            name,
            description,
            style_tags,
            featured,
            active
          )
        `)
        .eq('sport_id', sportId)
        .eq('product_type_slug', productSlug)
        .eq('design.active', true);

      if (mockupsError) {
        logger.error('Error fetching designs:', mockupsError);
        throw mockupsError;
      }

      logger.info('[Design Selection] Found mockups:', mockupsData?.length || 0);

      // Transform data to unique designs with mockups
      const uniqueDesigns = new Map<string, Design>();

      mockupsData?.forEach((mockup: any) => {
        if (mockup.design) {
          const existing = uniqueDesigns.get(mockup.design.id);
          if (!existing || (mockup.is_primary && !existing.mockup_url)) {
            uniqueDesigns.set(mockup.design.id, {
              id: mockup.design.id,
              slug: mockup.design.slug,
              name: mockup.design.name,
              description: mockup.design.description,
              style_tags: mockup.design.style_tags || [],
              featured: mockup.design.featured,
              mockup_url: mockup.mockup_url,
            });
          }
        }
      });

      const designsArray = Array.from(uniqueDesigns.values());

      // Sort: featured first, then alphabetically
      designsArray.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return a.name.localeCompare(b.name);
      });

      setProductDesignsMap(prev => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          designs: designsArray,
          loading: false,
        },
      }));

      logger.info('[Design Selection] Loaded designs for product:', { productId, count: designsArray.length });
    } catch (err: any) {
      logger.error('Error loading designs for product:', { productId, error: err });
      setProductDesignsMap(prev => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          loading: false,
        },
      }));
    }
  };

  const handleDesignToggle = (productId: string, design: Design) => {
    setProductDesignsMap(prev => {
      const productDesigns = prev[productId];
      const isSelected = productDesigns.selectedDesigns.some(d => d.id === design.id);

      let newSelectedDesigns;
      if (isSelected) {
        // Remove design
        newSelectedDesigns = productDesigns.selectedDesigns.filter(d => d.id !== design.id);
      } else {
        // Add design (max 2)
        if (productDesigns.selectedDesigns.length < 2) {
          newSelectedDesigns = [...productDesigns.selectedDesigns, design];
        } else {
          // Already have 2 designs, don't add more
          return prev;
        }
      }

      return {
        ...prev,
        [productId]: {
          ...productDesigns,
          selectedDesigns: newSelectedDesigns,
        },
      };
    });
  };

  const handleBack = () => {
    router.push(`/mi-equipo/${params.slug}/design-request/new`);
  };

  const handleContinue = () => {
    // Save all selected designs to the store
    Object.values(productDesignsMap).forEach(productDesign => {
      setProductDesigns(
        productDesign.productId,
        productDesign.selectedDesigns.map(d => ({ id: d.id, name: d.name }))
      );
    });
    router.push(`/mi-equipo/${params.slug}/design-request/customize`);
  };

  if (selectedProducts.length === 0) {
    return null; // Will redirect
  }

  const currentProduct = selectedProducts[currentProductIndex];
  const currentProductDesigns = productDesignsMap[currentProduct?.id];
  const allProductsLoaded = Object.values(productDesignsMap).every(pd => !pd.loading);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border-b border-gray-700">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <button
            onClick={() => router.push(`/mi-equipo/${params.slug}`)}
            className="mb-3 text-gray-300 hover:text-white font-medium flex items-center gap-2 transition-colors text-sm"
          >
            ← Volver
          </button>

          <div>
            <div className="inline-block px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded-full text-xs text-gray-400 mb-2">
              Paso 2 de 7
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Selecciona los Diseños</h1>
            <p className="text-gray-300 text-sm">
              Elige hasta 2 diseños por producto
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border-b border-gray-700">
        <div className="max-w-5xl mx-auto px-6 py-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Product Tabs */}
        {selectedProducts.length > 1 && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {selectedProducts.map((product, index) => {
              const productDesigns = productDesignsMap[product.id];
              const selectedCount = productDesigns?.selectedDesigns.length || 0;
              return (
                <button
                  key={product.id}
                  onClick={() => setCurrentProductIndex(index)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentProductIndex === index
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {product.name}
                  {selectedCount > 0 && (
                    <span className="ml-2 text-xs">({selectedCount})</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Current Product Designs */}
        {!currentProductDesigns || currentProductDesigns.loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-300">Cargando diseños...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-sm p-6 text-center">
            <h2 className="text-xl font-bold text-white mb-2">Error</h2>
            <p className="text-gray-300 mb-4">{error}</p>
            <button
              onClick={handleBack}
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              ← Volver
            </button>
          </div>
        ) : currentProductDesigns.designs.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-sm p-6 text-center">
            <span className="text-5xl mb-4 block">🎨</span>
            <h2 className="text-xl font-bold text-white mb-2">No hay diseños disponibles</h2>
            <p className="text-gray-300 mb-4 text-sm">
              No se encontraron diseños para {currentProductDesigns.productName}
            </p>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6 text-left max-w-md mx-auto">
              <p className="text-sm text-gray-300">
                Puedes continuar sin seleccionar diseños para este producto.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Info Banner */}
            <div className="mb-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-sm text-gray-300">
                {currentProductDesigns.productName}: Selecciona hasta 2 diseños que te gusten ({currentProductDesigns.selectedDesigns.length}/2 seleccionados)
              </p>
            </div>

            {/* Design Grid */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {currentProductDesigns.designs.map((design) => {
                const isSelected = currentProductDesigns.selectedDesigns.some(d => d.id === design.id);
                const canSelect = currentProductDesigns.selectedDesigns.length < 2 || isSelected;

                return (
                  <button
                    key={design.id}
                    onClick={() => handleDesignToggle(currentProduct.id, design)}
                    disabled={!canSelect}
                    className={`relative group bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-sm overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] border-2 ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/50'
                        : canSelect
                        ? 'border-gray-700 hover:border-gray-600'
                        : 'border-gray-700 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    {/* Design Image */}
                    <div className="relative h-40 bg-gray-900">
                      {design.mockup_url ? (
                        <Image
                          src={design.mockup_url}
                          alt={design.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <span className="text-4xl">👕</span>
                        </div>
                      )}
                      {design.featured && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold">
                          ⭐
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-2 left-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Design Info */}
                    <div className="p-3 relative">
                      <h3 className="text-sm font-bold text-white mb-2 line-clamp-2 text-center">{design.name}</h3>
                      {design.style_tags && design.style_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {design.style_tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Navigation Buttons */}
        <div className="mt-6 flex items-center justify-between gap-4">
          <button
            onClick={handleBack}
            className="px-4 py-2 text-sm bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md text-gray-200 border border-gray-700 rounded-lg hover:bg-gray-800 font-medium transition-colors"
          >
            ← Volver
          </button>
          <button
            onClick={handleContinue}
            disabled={!allProductsLoaded}
            className={`px-6 py-2.5 text-sm rounded-lg font-medium transition-colors ${
              allProductsLoaded
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            Continuar →
          </button>
        </div>
      </div>
    </div>
  );
}
