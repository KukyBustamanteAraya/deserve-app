'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTeamDesignRequest } from '@/hooks/useTeamDesignRequest';

type SleeveType = 'short' | 'long';
type NeckType = 'crew' | 'v' | 'polo';
type FitType = 'athletic' | 'loose';

export default function UniformDetailsPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const {
    teamColors,
    uniformDetails,
    setUniformDetails,
    selectedProductName,
    teamSlug,
  } = useTeamDesignRequest();

  const [details, setDetails] = useState(uniformDetails);

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

  const handleSleeveChange = (sleeve: SleeveType) => {
    setDetails({ ...details, sleeve });
  };

  const handleNeckChange = (neck: NeckType) => {
    setDetails({ ...details, neck });
  };

  const handleFitChange = (fit: FitType) => {
    setDetails({ ...details, fit });
  };

  const handleBack = () => {
    router.push(`/mi-equipo/${params.slug}/design-request/customize`);
  };

  const handleContinue = () => {
    setUniformDetails(details);
    router.push(`/mi-equipo/${params.slug}/design-request/logos`);
  };

  if (!selectedProductName) {
    return null; // Will redirect
  }

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
              Paso 4 de 7
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Detalles del Uniforme</h1>
            <p className="text-gray-300 text-sm">{selectedProductName}</p>
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
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="relative group bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-sm p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-2">Especifica los detalles</h2>
              <p className="text-gray-300 text-sm">
                Selecciona las características del {selectedProductName.toLowerCase()}.
              </p>
            </div>

            {/* Sleeve Length */}
            <div className="mb-6">
              <label className="block text-lg font-semibold text-white mb-4">
                Largo de Manga
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleSleeveChange('short')}
                  className={`relative group p-6 rounded-lg border-2 transition-all text-left ${
                    details.sleeve === 'short'
                      ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/50'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xl">👕</span>
                      {details.sleeve === 'short' && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Manga Corta</h3>
                    <p className="text-sm text-gray-300">Clima cálido</p>
                  </div>
                </button>

                <button
                  onClick={() => handleSleeveChange('long')}
                  className={`relative group p-6 rounded-lg border-2 transition-all text-left ${
                    details.sleeve === 'long'
                      ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/50'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xl">🧥</span>
                      {details.sleeve === 'long' && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Manga Larga</h3>
                    <p className="text-sm text-gray-300">Más protección</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Neck Style */}
            <div className="mb-6">
              <label className="block text-lg font-semibold text-white mb-4">
                Estilo de Cuello
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => handleNeckChange('crew')}
                  className={`relative group p-6 rounded-lg border-2 transition-all text-left ${
                    details.neck === 'crew'
                      ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/50'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xl">⭕</span>
                      {details.neck === 'crew' && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Cuello Redondo</h3>
                    <p className="text-sm text-gray-300">Clásico</p>
                  </div>
                </button>

                <button
                  onClick={() => handleNeckChange('v')}
                  className={`relative group p-6 rounded-lg border-2 transition-all text-left ${
                    details.neck === 'v'
                      ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/50'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xl">🔻</span>
                      {details.neck === 'v' && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Cuello en V</h3>
                    <p className="text-sm text-gray-300">Moderno</p>
                  </div>
                </button>

                <button
                  onClick={() => handleNeckChange('polo')}
                  className={`relative group p-6 rounded-lg border-2 transition-all text-left ${
                    details.neck === 'polo'
                      ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/50'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xl">👔</span>
                      {details.neck === 'polo' && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Cuello Polo</h3>
                    <p className="text-sm text-gray-300">Elegante</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Fit Style */}
            <div className="mb-6">
              <label className="block text-lg font-semibold text-white mb-4">
                Tipo de Corte
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleFitChange('athletic')}
                  className={`relative group p-6 rounded-lg border-2 transition-all text-left ${
                    details.fit === 'athletic'
                      ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/50'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xl">💪</span>
                      {details.fit === 'athletic' && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Corte Atlético</h3>
                    <p className="text-sm text-gray-300">Ajustado</p>
                  </div>
                </button>

                <button
                  onClick={() => handleFitChange('loose')}
                  className={`relative group p-6 rounded-lg border-2 transition-all text-left ${
                    details.fit === 'loose'
                      ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/50'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xl">🎽</span>
                      {details.fit === 'loose' && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Corte Holgado</h3>
                    <p className="text-sm text-gray-300">Más comodidad</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-lg">💡</span>
                <div>
                  <p className="text-sm text-gray-300">
                    Crearemos el mockup según estas especificaciones.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

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
            className="px-6 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Continuar →
          </button>
        </div>
      </div>
    </div>
  );
}
