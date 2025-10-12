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

export default function DesignSelectionPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const supabase = getBrowserClient();
  const {
    teamColors,
    teamSlug,
    selectedProductId,
    selectedProductName,
    selectedProductSlug,
    selectedDesignId,
    setDesign,
  } = useTeamDesignRequest();

  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sportId, setSportId] = useState<number | null>(null);

  // Redirect if no product selected
  useEffect(() => {
    if (!selectedProductName) {
      router.push(`/mi-equipo/${params.slug}/design-request/new`);
    }
  }, [selectedProductName, params.slug, router]);

  // Validate team slug matches
  useEffect(() => {
    if (teamSlug && teamSlug !== params.slug) {
      router.push(`/mi-equipo/${params.slug}/design-request/new`);
    }
  }, [teamSlug, params.slug, router]);

  // Load team sport and designs
  useEffect(() => {
    loadDesigns();
  }, [params.slug, selectedProductSlug]);

  const loadDesigns = async () => {
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
        setLoading(false);
        return;
      }

      setSportId(teamData.sport_id);

      logger.info('[Design Selection] Searching for designs with:', {
        sport_id: teamData.sport_id,
        product_type_slug: selectedProductSlug || 'jersey',
      });

      // Get designs for this product type and sport
      // Query design_mockups that match both product_type_slug and sport_id
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
        .eq('sport_id', teamData.sport_id)
        .eq('product_type_slug', selectedProductSlug || 'jersey')
        .eq('design.active', true);

      if (mockupsError) {
        logger.error('Error fetching designs:', mockupsError);
        throw mockupsError;
      }

      logger.info('[Design Selection] Found mockups:', mockupsData?.length || 0);

      // Transform data to unique designs with mockups
      // Prioritize is_primary=true mockups if available
      const uniqueDesigns = new Map<string, Design>();

      mockupsData?.forEach((mockup: any) => {
        if (mockup.design) {
          const existing = uniqueDesigns.get(mockup.design.id);
          // Add design if not exists, or replace with primary mockup if current is not primary
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

      setDesigns(designsArray);
      logger.info('[Design Selection] Loaded designs:', designsArray.length);
    } catch (err: any) {
      logger.error('Error loading designs:', err);
      setError(err.message || 'Error al cargar diseños');
    } finally {
      setLoading(false);
    }
  };

  const handleDesignSelect = (design: Design) => {
    setDesign(design.id, design.name);
    // Navigate to color customization
    router.push(`/mi-equipo/${params.slug}/design-request/customize`);
  };

  const handleBack = () => {
    router.push(`/mi-equipo/${params.slug}/design-request/new`);
  };

  const handleSkip = () => {
    // Skip design selection and go to customize (custom design flow)
    setDesign(null, null);
    router.push(`/mi-equipo/${params.slug}/design-request/customize`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando diseños...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push(`/mi-equipo/${params.slug}/design-request/new`)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  if (!selectedProductName) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${teamColors.primary} 0%, ${teamColors.secondary} 100%)`,
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-8">
          <button
            onClick={() => router.push(`/mi-equipo/${params.slug}`)}
            className="mb-4 text-white/90 hover:text-white font-medium flex items-center gap-2"
          >
            ← Volver al equipo
          </button>

          <div>
            <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white/90 mb-3">
              🎨 Nueva Solicitud de Diseño
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Paso 2: Selecciona el Diseño</h1>
            <p className="text-white/80 text-lg">{selectedProductName}</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-2 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Producto</span>
            <span className="font-semibold text-blue-600">Diseño</span>
            <span>Colores</span>
            <span>Detalles</span>
            <span>Logo</span>
            <span>Nombres</span>
            <span>Revisar</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {designs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <span className="text-6xl mb-4 block">🎨</span>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No hay diseños disponibles</h2>
            <p className="text-gray-600 mb-4">
              No se encontraron diseños para {selectedProductName} en tu deporte
            </p>
            {sportId && (
              <p className="text-sm text-gray-500 mb-6">
                Buscando diseños para: Sport ID {sportId}, Producto: {selectedProductSlug}
              </p>
            )}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 text-left max-w-md mx-auto">
              <p className="text-sm text-gray-700 mb-2">
                <strong>¿Qué significa esto?</strong>
              </p>
              <p className="text-sm text-gray-600">
                No hay diseños pre-creados en nuestra galería para esta combinación. Puedes continuar con un diseño completamente personalizado y nuestro equipo lo creará desde cero según tus especificaciones.
              </p>
            </div>
            <button
              onClick={handleSkip}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              ✨ Continuar con Diseño Personalizado
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-gray-600">
                Selecciona un diseño de nuestra colección o solicita un diseño completamente personalizado
              </p>
            </div>

            {/* Design Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {designs.map((design) => (
                <button
                  key={design.id}
                  onClick={() => handleDesignSelect(design)}
                  className={`bg-white rounded-lg shadow-sm overflow-hidden text-left transition-all hover:shadow-lg hover:scale-105 border-2 ${
                    selectedDesignId === design.id
                      ? 'border-blue-500 ring-2 ring-blue-500/50'
                      : 'border-transparent hover:border-blue-300'
                  }`}
                >
                  {/* Design Image */}
                  <div className="relative h-64 bg-gray-100">
                    {design.mockup_url ? (
                      <Image
                        src={design.mockup_url}
                        alt={design.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-6xl">👕</span>
                      </div>
                    )}
                    {design.featured && (
                      <div className="absolute top-3 right-3 px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold">
                        ⭐ Destacado
                      </div>
                    )}
                    {selectedDesignId === design.id && (
                      <div className="absolute top-3 left-3 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Design Info */}
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{design.name}</h3>
                    {design.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{design.description}</p>
                    )}
                    {design.style_tags && design.style_tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {design.style_tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Design Option */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border-2 border-purple-300">
              <div className="flex items-start gap-4">
                <span className="text-4xl">✨</span>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">¿Tienes un diseño en mente?</h3>
                  <p className="text-gray-700 mb-4">
                    Si ninguno de estos diseños te convence, puedes solicitar un diseño completamente personalizado. Nuestro equipo de diseño lo creará desde cero según tus especificaciones.
                  </p>
                  <button
                    onClick={handleSkip}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                  >
                    Solicitar Diseño Personalizado
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            ← Volver
          </button>
        </div>
      </div>
    </div>
  );
}
