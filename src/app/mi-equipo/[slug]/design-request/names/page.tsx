'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTeamDesignRequest } from '@/hooks/useTeamDesignRequest';

export default function NamesNumbersPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const {
    teamColors,
    namesNumbers,
    setNamesNumbers,
    selectedProductName,
    teamSlug,
  } = useTeamDesignRequest();

  const [includeNames, setIncludeNames] = useState(namesNumbers);

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

  const handleBack = () => {
    router.push(`/mi-equipo/${params.slug}/design-request/logos`);
  };

  const handleContinue = () => {
    setNamesNumbers(includeNames);
    router.push(`/mi-equipo/${params.slug}/design-request/review`);
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
              Paso 6 de 7
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Nombres y Números</h1>
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
            <div className="flex-1 h-1.5 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-6">
        <div className="relative group bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-sm p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-2">¿Deseas incluir nombres y números?</h2>
              <p className="text-gray-300 text-sm">
                Personaliza cada uniforme con nombres y números.
              </p>
            </div>

            {/* Yes/No Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setIncludeNames(true)}
                className={`relative group p-6 rounded-lg border-2 transition-all text-left ${
                  includeNames
                    ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/50'
                    : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl">✅</span>
                    {includeNames && (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Sí, incluir</h3>
                  <p className="text-gray-300 text-sm">
                    Incluirán nombres y números personalizados.
                  </p>
                </div>
              </button>

              <button
                onClick={() => setIncludeNames(false)}
                className={`relative group p-6 rounded-lg border-2 transition-all text-left ${
                  !includeNames
                    ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/50'
                    : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl">❌</span>
                    {!includeNames && (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">No, sin nombres</h3>
                  <p className="text-gray-300 text-sm">
                    No tendrán nombres ni números.
                  </p>
                </div>
              </button>
            </div>

            {/* Info boxes */}
            {includeNames ? (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <span className="text-lg">📝</span>
                  <div>
                    <p className="text-sm text-gray-300">
                      Los jugadores podrán personalizar después de aprobar el diseño.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <span className="text-lg">ℹ️</span>
                  <div>
                    <p className="text-sm text-gray-300">
                      Sin personalización. Puedes cambiar esta opción antes de producción.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Example visualization */}
            {includeNames && (
              <div className="mt-4 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-4 text-center text-sm">Ejemplo de personalización</h4>
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <div
                      className="w-32 h-40 rounded-lg shadow-md mx-auto mb-3 flex flex-col items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${teamColors.primary} 0%, ${teamColors.secondary} 100%)`,
                      }}
                    >
                      <div className="text-white font-bold text-xs mb-1">GARCÍA</div>
                      <div className="text-white font-bold text-4xl">10</div>
                    </div>
                    <p className="text-xs text-gray-300">Vista Frontal</p>
                  </div>
                  <div className="text-center">
                    <div
                      className="w-32 h-40 rounded-lg shadow-md mx-auto mb-3 flex flex-col items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${teamColors.secondary} 0%, ${teamColors.primary} 100%)`,
                      }}
                    >
                      <div className="text-white font-bold text-xs mb-1">GARCÍA</div>
                      <div className="text-white font-bold text-4xl">10</div>
                    </div>
                    <p className="text-xs text-gray-300">Vista Trasera</p>
                  </div>
                </div>
              </div>
            )}
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
