'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { useTeamDesignRequest } from '@/hooks/useTeamDesignRequest';
import { logger } from '@/lib/logger';

export default function ReviewSubmitPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const supabase = getBrowserClient();

  const {
    teamId,
    teamSlug,
    teamColors,
    teamLogoUrl,
    selectedProducts,
    customColors,
    uniformDetails,
    logoPlacements,
    namesNumbers,
    reset,
  } = useTeamDesignRequest();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Load current user
  useEffect(() => {
    loadUser();
  }, []);

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

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const handleBack = () => {
    router.push(`/mi-equipo/${params.slug}/design-request/names`);
  };

  const handleEdit = (step: string) => {
    router.push(`/mi-equipo/${params.slug}/design-request/${step}`);
  };

  const handleSubmit = async () => {
    if (!user || !teamId) {
      setError('Usuario o equipo no encontrado');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create design requests for each product × design × color variant combination
      const requests = [];

      for (const product of selectedProducts) {
        const designs = product.designs.length > 0 ? product.designs : [{ id: null, name: null }];
        const colorOptions = product.colorOptions || { includeHome: true, includeAway: false, homeColors: customColors, awayColors: customColors };

        // Create requests for each design
        for (const design of designs) {
          // Create home variant if selected
          if (colorOptions.includeHome) {
            requests.push({
              team_id: teamId,
              requested_by: user.id,
              user_id: user.id,
              user_type: 'manager',
              team_slug: teamSlug,
              design_id: design.id,
              primary_color: colorOptions.homeColors.primary,
              secondary_color: colorOptions.homeColors.secondary,
              accent_color: colorOptions.homeColors.tertiary,
              logo_url: teamLogoUrl,
              logo_placements: logoPlacements,
              selected_apparel: {
                product_id: product.id,
                product_name: product.name,
                product_slug: product.slug,
                design_id: design.id,
                design_name: design.name,
                variant: 'home',
              },
              uniform_details: uniformDetails,
              names_numbers: namesNumbers,
              product_slug: product.slug,
              product_name: `${product.name} (Casa)`,
              status: 'pending',
              approval_status: 'pending_review',
              priority: 'medium',
              version: 1,
              mockup_urls: [],
              admin_comments: [],
              design_options: [],
              revision_count: 0,
              voting_enabled: false,
              approval_votes_count: 0,
              rejection_votes_count: 0,
              required_approvals: 1,
            });
          }

          // Create away variant if selected
          if (colorOptions.includeAway) {
            requests.push({
              team_id: teamId,
              requested_by: user.id,
              user_id: user.id,
              user_type: 'manager',
              team_slug: teamSlug,
              design_id: design.id,
              primary_color: colorOptions.awayColors.primary,
              secondary_color: colorOptions.awayColors.secondary,
              accent_color: colorOptions.awayColors.tertiary,
              logo_url: teamLogoUrl,
              logo_placements: logoPlacements,
              selected_apparel: {
                product_id: product.id,
                product_name: product.name,
                product_slug: product.slug,
                design_id: design.id,
                design_name: design.name,
                variant: 'away',
              },
              uniform_details: uniformDetails,
              names_numbers: namesNumbers,
              product_slug: product.slug,
              product_name: `${product.name} (Visitante)`,
              status: 'pending',
              approval_status: 'pending_review',
              priority: 'medium',
              version: 1,
              mockup_urls: [],
              admin_comments: [],
              design_options: [],
              revision_count: 0,
              voting_enabled: false,
              approval_votes_count: 0,
              rejection_votes_count: 0,
              required_approvals: 1,
            });
          }
        }
      }

      // Insert all design requests
      const { data, error: insertError } = await supabase
        .from('design_requests')
        .insert(requests)
        .select();

      if (insertError) {
        logger.error('Error creating design requests:', insertError);
        throw insertError;
      }

      logger.info(`Created ${data.length} design requests successfully`);

      // Reset wizard state
      reset();

      // Redirect to team page with success message
      router.push(`/mi-equipo/${params.slug}?request_created=true`);
    } catch (err: any) {
      logger.error('Error submitting design requests:', err);
      setError(err.message || 'Error al crear las solicitudes de diseño');
    } finally {
      setLoading(false);
    }
  };

  if (selectedProducts.length === 0) {
    return null; // Will redirect
  }

  // Calculate total design requests based on products × designs × color variants
  const totalDesignRequests = selectedProducts.reduce((sum, product) => {
    const designCount = product.designs.length || 1; // At least 1 if no designs
    const colorVariants = ((product.colorOptions?.includeHome ? 1 : 0) + (product.colorOptions?.includeAway ? 1 : 0)) || 1;
    return sum + (designCount * colorVariants);
  }, 0);

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
              Paso 7 de 7
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Revisar y Enviar</h1>
            <p className="text-gray-300 text-sm">Confirma los detalles de tu solicitud</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border-b border-gray-700">
        <div className="max-w-5xl mx-auto px-6 py-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-blue-600 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-lg">❌</span>
              <div>
                <h4 className="font-bold text-red-400 mb-1 text-sm">Error</h4>
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Review Sections */}
        <div className="space-y-4">
          {/* Products & Designs Summary */}
          <div className="relative group bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-sm p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-bold text-white">Productos y Diseños</h2>
                  <p className="text-sm text-gray-400">
                    {selectedProducts.length} producto{selectedProducts.length !== 1 ? 's' : ''} • {totalDesignRequests} solicitud{totalDesignRequests !== 1 ? 'es' : ''} de diseño
                  </p>
                </div>
                <button
                  onClick={() => handleEdit('new')}
                  className="text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors"
                >
                  Editar
                </button>
              </div>

              {/* Products List */}
              <div className="space-y-3">
                {selectedProducts.map((product, index) => (
                  <div key={product.id} className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">👕</span>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-white mb-1">{product.name}</h3>

                        {/* Color Variants */}
                        {product.colorOptions && (
                          <div className="mt-2 mb-2">
                            <p className="text-xs text-gray-400 uppercase font-medium mb-1">Variantes de color:</p>
                            <div className="flex flex-wrap gap-2">
                              {product.colorOptions.includeHome && (
                                <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-medium">
                                  🏠 Casa
                                </span>
                              )}
                              {product.colorOptions.includeAway && (
                                <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-medium">
                                  ✈️ Visitante
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Designs for this product */}
                        {product.designs.length > 0 ? (
                          <div className="mt-2 space-y-2">
                            <p className="text-xs text-gray-400 uppercase font-medium">Diseños seleccionados:</p>
                            {product.designs.map((design) => (
                              <div key={design.id} className="flex items-center gap-2 pl-3 border-l-2 border-blue-500">
                                <span className="text-lg">🎨</span>
                                <span className="text-sm text-gray-300">{design.name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center gap-2 pl-3 border-l-2 border-gray-600">
                            <span className="text-lg">✨</span>
                            <span className="text-sm text-gray-400">Sin diseño específico</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="relative group bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-sm p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-white">Colores Personalizados</h2>
                <button
                  onClick={() => handleEdit('customize')}
                  className="text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors"
                >
                  Editar
                </button>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <div
                    className="w-full h-20 rounded-lg border-2 border-gray-600 mb-2"
                    style={{ backgroundColor: customColors.primary }}
                  ></div>
                  <p className="text-xs text-gray-300 text-center font-mono">{customColors.primary}</p>
                  <p className="text-xs text-gray-400 text-center">Primario</p>
                </div>
                <div className="flex-1">
                  <div
                    className="w-full h-20 rounded-lg border-2 border-gray-600 mb-2"
                    style={{ backgroundColor: customColors.secondary }}
                  ></div>
                  <p className="text-xs text-gray-300 text-center font-mono">{customColors.secondary}</p>
                  <p className="text-xs text-gray-400 text-center">Secundario</p>
                </div>
                <div className="flex-1">
                  <div
                    className="w-full h-20 rounded-lg border-2 border-gray-600 mb-2"
                    style={{ backgroundColor: customColors.tertiary }}
                  ></div>
                  <p className="text-xs text-gray-300 text-center font-mono">{customColors.tertiary}</p>
                  <p className="text-xs text-gray-400 text-center">Terciario</p>
                </div>
              </div>
            </div>
          </div>

          {/* Uniform Details */}
          <div className="relative group bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-sm p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-white">Detalles del Uniforme</h2>
                <button
                  onClick={() => handleEdit('details')}
                  className="text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors"
                >
                  Editar
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-300 mb-1">Largo de Manga</p>
                  <p className="font-semibold text-white">
                    {uniformDetails.sleeve === 'short' ? 'Manga Corta' : 'Manga Larga'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-300 mb-1">Estilo de Cuello</p>
                  <p className="font-semibold text-white">
                    {uniformDetails.neck === 'crew' && 'Cuello Redondo'}
                    {uniformDetails.neck === 'v' && 'Cuello en V'}
                    {uniformDetails.neck === 'polo' && 'Cuello Polo'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-300 mb-1">Tipo de Corte</p>
                  <p className="font-semibold text-white">
                    {uniformDetails.fit === 'athletic' ? 'Corte Atlético' : 'Corte Holgado'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Logo Placement */}
          <div className="relative group bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-sm p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-white">Ubicación del Logo</h2>
                <button
                  onClick={() => handleEdit('logos')}
                  className="text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors"
                >
                  Editar
                </button>
              </div>
              {!logoPlacements.front && !logoPlacements.back && !logoPlacements.sleeveLeft && !logoPlacements.sleeveRight ? (
                <p className="text-gray-300">Sin logos seleccionados</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {logoPlacements.front && (
                    <span className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">
                      🔝 Pecho (Frontal)
                    </span>
                  )}
                  {logoPlacements.back && (
                    <span className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">
                      🔙 Espalda
                    </span>
                  )}
                  {logoPlacements.sleeveLeft && (
                    <span className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">
                      ◀️ Manga Izquierda
                    </span>
                  )}
                  {logoPlacements.sleeveRight && (
                    <span className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">
                      ▶️ Manga Derecha
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Names & Numbers */}
          <div className="relative group bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-sm p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-white">Nombres y Números</h2>
                <button
                  onClick={() => handleEdit('names')}
                  className="text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors"
                >
                  Editar
                </button>
              </div>
              <p className="text-white font-semibold">
                {namesNumbers ? '✅ Sí, incluir nombres y números' : '❌ No incluir nombres y números'}
              </p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/30 border border-blue-500/30 rounded-lg p-4">
            <h3 className="text-base font-bold text-white mb-3">¿Qué sigue?</h3>
            <ol className="space-y-2">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <p className="text-sm text-gray-300">Crearemos un mockup (2-3 días)</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <p className="text-sm text-gray-300">Recibirás notificación cuando esté listo</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <p className="text-sm text-gray-300">Podrás aprobar y abrir votación</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                <p className="text-sm text-gray-300">Se creará la orden automáticamente</p>
              </li>
            </ol>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-6 flex items-center justify-between gap-4">
          <button
            onClick={() => router.push(`/mi-equipo/${params.slug}`)}
            disabled={loading}
            className="px-4 py-2 text-sm bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md text-gray-200 border border-gray-700 rounded-lg hover:bg-gray-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Enviando...
              </>
            ) : (
              <>
                Enviar Solicitud
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
