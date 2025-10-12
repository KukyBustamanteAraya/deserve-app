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
    selectedProductId,
    selectedProductName,
    selectedProductSlug,
    selectedDesignId,
    selectedDesignName,
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
      // Create design request
      const { data, error: insertError } = await supabase
        .from('design_requests')
        .insert({
          team_id: teamId,
          requested_by: user.id,
          user_id: user.id,
          user_type: 'manager', // TODO: Determine from team membership
          team_slug: teamSlug,
          design_id: selectedDesignId,
          primary_color: customColors.primary,
          secondary_color: customColors.secondary,
          accent_color: customColors.tertiary,
          logo_url: teamLogoUrl,
          logo_placements: logoPlacements,
          selected_apparel: {
            product_id: selectedProductId,
            product_name: selectedProductName,
            product_slug: selectedProductSlug,
            design_id: selectedDesignId,
            design_name: selectedDesignName,
          },
          uniform_details: uniformDetails,
          names_numbers: namesNumbers,
          product_slug: selectedProductSlug,
          product_name: selectedProductName,
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
        })
        .select()
        .single();

      if (insertError) {
        logger.error('Error creating design request:', insertError);
        throw insertError;
      }

      logger.info('Design request created successfully:', data);

      // Reset wizard state
      reset();

      // Redirect to team page with success message
      router.push(`/mi-equipo/${params.slug}?request_created=true`);
    } catch (err: any) {
      logger.error('Error submitting design request:', err);
      setError(err.message || 'Error al crear la solicitud de diseño');
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-4xl font-bold text-white mb-2">Paso 7: Revisar y Enviar</h1>
            <p className="text-white/80 text-lg">Confirma los detalles de tu solicitud</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-2 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-2 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-2 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-2 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-2 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-2 bg-blue-600 rounded-full"></div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Producto</span>
            <span>Diseño</span>
            <span>Colores</span>
            <span>Detalles</span>
            <span>Logo</span>
            <span>Nombres</span>
            <span className="font-semibold text-blue-600">Revisar</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">❌</span>
              <div>
                <h4 className="font-bold text-red-900 mb-1">Error</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Review Sections */}
        <div className="space-y-6">
          {/* Product */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Producto Seleccionado</h2>
              <button
                onClick={() => handleEdit('new')}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Editar
              </button>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-4xl">👕</span>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedProductName}</h3>
                <p className="text-sm text-gray-600">{selectedProductSlug}</p>
              </div>
            </div>
          </div>

          {/* Design */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Diseño Seleccionado</h2>
              <button
                onClick={() => handleEdit('designs')}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Editar
              </button>
            </div>
            <div className="flex items-center gap-4">
              {selectedDesignId ? (
                <>
                  <span className="text-4xl">🎨</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedDesignName}</h3>
                    <p className="text-sm text-gray-600">Diseño de la colección</p>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-4xl">✨</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Diseño Personalizado</h3>
                    <p className="text-sm text-gray-600">Solicitud de diseño completamente personalizado</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Colors */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Colores Personalizados</h2>
              <button
                onClick={() => handleEdit('customize')}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Editar
              </button>
            </div>
            <div className="flex gap-6">
              <div className="flex-1">
                <div
                  className="w-full h-20 rounded-lg border-2 border-gray-300 mb-2"
                  style={{ backgroundColor: customColors.primary }}
                ></div>
                <p className="text-xs text-gray-600 text-center font-mono">{customColors.primary}</p>
                <p className="text-xs text-gray-500 text-center">Primario</p>
              </div>
              <div className="flex-1">
                <div
                  className="w-full h-20 rounded-lg border-2 border-gray-300 mb-2"
                  style={{ backgroundColor: customColors.secondary }}
                ></div>
                <p className="text-xs text-gray-600 text-center font-mono">{customColors.secondary}</p>
                <p className="text-xs text-gray-500 text-center">Secundario</p>
              </div>
              <div className="flex-1">
                <div
                  className="w-full h-20 rounded-lg border-2 border-gray-300 mb-2"
                  style={{ backgroundColor: customColors.tertiary }}
                ></div>
                <p className="text-xs text-gray-600 text-center font-mono">{customColors.tertiary}</p>
                <p className="text-xs text-gray-500 text-center">Terciario</p>
              </div>
            </div>
          </div>

          {/* Uniform Details */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Detalles del Uniforme</h2>
              <button
                onClick={() => handleEdit('details')}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Editar
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Largo de Manga</p>
                <p className="font-semibold text-gray-900">
                  {uniformDetails.sleeve === 'short' ? 'Manga Corta' : 'Manga Larga'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Estilo de Cuello</p>
                <p className="font-semibold text-gray-900">
                  {uniformDetails.neck === 'crew' && 'Cuello Redondo'}
                  {uniformDetails.neck === 'v' && 'Cuello en V'}
                  {uniformDetails.neck === 'polo' && 'Cuello Polo'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Tipo de Corte</p>
                <p className="font-semibold text-gray-900">
                  {uniformDetails.fit === 'athletic' ? 'Corte Atlético' : 'Corte Holgado'}
                </p>
              </div>
            </div>
          </div>

          {/* Logo Placement */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Ubicación del Logo</h2>
              <button
                onClick={() => handleEdit('logos')}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Editar
              </button>
            </div>
            {!logoPlacements.front && !logoPlacements.back && !logoPlacements.sleeveLeft && !logoPlacements.sleeveRight ? (
              <p className="text-gray-600">Sin logos seleccionados</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {logoPlacements.front && (
                  <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                    🔝 Pecho (Frontal)
                  </span>
                )}
                {logoPlacements.back && (
                  <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                    🔙 Espalda
                  </span>
                )}
                {logoPlacements.sleeveLeft && (
                  <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                    ◀️ Manga Izquierda
                  </span>
                )}
                {logoPlacements.sleeveRight && (
                  <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                    ▶️ Manga Derecha
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Names & Numbers */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Nombres y Números</h2>
              <button
                onClick={() => handleEdit('names')}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Editar
              </button>
            </div>
            <p className="text-gray-900 font-semibold">
              {namesNumbers ? '✅ Sí, incluir nombres y números' : '❌ No incluir nombres y números'}
            </p>
          </div>

          {/* Next Steps */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border-2 border-blue-300">
            <h3 className="text-lg font-bold text-gray-900 mb-3">¿Qué sigue después de enviar?</h3>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                <p className="text-sm text-gray-700">Nuestro equipo de diseño recibirá tu solicitud y comenzará a trabajar en un mockup personalizado</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                <p className="text-sm text-gray-700">Recibirás una notificación cuando el mockup esté listo para revisión (generalmente en 2-3 días hábiles)</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                <p className="text-sm text-gray-700">Como manager, podrás establecer el diseño como final y abrir la votación para tu equipo</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                <p className="text-sm text-gray-700">Una vez aprobado, se creará automáticamente una orden para tu equipo y podrán proceder al pago</p>
              </li>
            </ol>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <button
            onClick={handleBack}
            disabled={loading}
            className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Volver
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
