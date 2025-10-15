'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTeamDesignRequest } from '@/hooks/useTeamDesignRequest';
import Image from 'next/image';

export default function LogoPlacementPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const {
    teamColors,
    teamLogoUrl,
    logoPlacements,
    toggleLogoPlacement,
    selectedProductName,
    teamSlug,
  } = useTeamDesignRequest();

  const [placements, setPlacements] = useState(logoPlacements);

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

  const handleToggle = (position: keyof typeof placements) => {
    setPlacements({ ...placements, [position]: !placements[position] });
  };

  const handleBack = () => {
    router.push(`/mi-equipo/${params.slug}/design-request/details`);
  };

  const handleContinue = () => {
    // Update all placements at once
    Object.entries(placements).forEach(([key, value]) => {
      if (logoPlacements[key as keyof typeof logoPlacements] !== value) {
        toggleLogoPlacement(key as keyof typeof logoPlacements);
      }
    });
    router.push(`/mi-equipo/${params.slug}/design-request/names`);
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
              Paso 5 de 7
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Ubicación del Logo</h1>
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
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Logo Preview & Placement Options */}
          <div className="relative group bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-sm p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="relative">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-white mb-2">Tu Logo</h2>
                <p className="text-gray-300 text-sm">
                  Selecciona dónde aparecerá el logo.
                </p>
              </div>

              {/* Team Logo Display */}
              {teamLogoUrl ? (
                <div className="mb-4 bg-gray-900/50 rounded-lg p-4 flex items-center justify-center">
                  <div className="relative w-32 h-32">
                    <Image
                      src={teamLogoUrl}
                      alt="Team Logo"
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="mb-4 bg-gray-900/50 rounded-lg p-4 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-5xl mb-2 block">🏆</span>
                    <p className="text-sm text-gray-300">Sin logo</p>
                  </div>
                </div>
              )}

              {/* Placement Toggles */}
              <div className="space-y-3">
                <button
                  onClick={() => handleToggle('front')}
                  className={`w-full p-4 rounded-lg border-2 transition-all flex items-center justify-between ${
                    placements.front
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔝</span>
                    <div className="text-left">
                      <h3 className="font-bold text-white">Pecho (Frontal)</h3>
                      <p className="text-sm text-gray-300">Logo en el frente</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    placements.front
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-500'
                  }`}>
                    {placements.front && (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => handleToggle('back')}
                  className={`w-full p-4 rounded-lg border-2 transition-all flex items-center justify-between ${
                    placements.back
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔙</span>
                    <div className="text-left">
                      <h3 className="font-bold text-white">Espalda</h3>
                      <p className="text-sm text-gray-300">Logo en la parte trasera</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    placements.back
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-500'
                  }`}>
                    {placements.back && (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => handleToggle('sleeveLeft')}
                  className={`w-full p-4 rounded-lg border-2 transition-all flex items-center justify-between ${
                    placements.sleeveLeft
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">◀️</span>
                    <div className="text-left">
                      <h3 className="font-bold text-white">Manga Izquierda</h3>
                      <p className="text-sm text-gray-300">Logo en la manga izquierda</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    placements.sleeveLeft
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-500'
                  }`}>
                    {placements.sleeveLeft && (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => handleToggle('sleeveRight')}
                  className={`w-full p-4 rounded-lg border-2 transition-all flex items-center justify-between ${
                    placements.sleeveRight
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">▶️</span>
                    <div className="text-left">
                      <h3 className="font-bold text-white">Manga Derecha</h3>
                      <p className="text-sm text-gray-300">Logo en la manga derecha</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    placements.sleeveRight
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-500'
                  }`}>
                    {placements.sleeveRight && (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              </div>

              {!teamLogoUrl && (
                <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">⚠️</span>
                    <div>
                      <p className="text-sm text-gray-300">
                        Tu equipo no tiene logo. Puedes continuar sin logo.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Visual Preview */}
          <div className="relative group bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-sm p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="relative">
              <h2 className="text-xl font-bold text-white mb-4">Vista Previa</h2>

              <div className="bg-gray-900/50 rounded-lg p-6">
              {/* T-shirt visualization */}
              <div className="relative mx-auto" style={{ width: '240px', height: '280px' }}>
                {/* Main body */}
                <div
                  className="absolute top-12 left-12 right-12 bottom-12 rounded-lg"
                  style={{ backgroundColor: teamColors.primary }}
                >
                  {/* Front logo */}
                  {placements.front && (
                    <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                        LOGO
                      </div>
                    </div>
                  )}
                </div>

                {/* Left sleeve */}
                <div
                  className="absolute top-12 left-0 w-16 h-20 rounded-lg"
                  style={{ backgroundColor: teamColors.secondary }}
                >
                  {placements.sleeveLeft && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-xs font-bold shadow-md text-center" style={{ fontSize: '6px' }}>
                        LOGO
                      </div>
                    </div>
                  )}
                </div>

                {/* Right sleeve */}
                <div
                  className="absolute top-12 right-0 w-16 h-20 rounded-lg"
                  style={{ backgroundColor: teamColors.secondary }}
                >
                  {placements.sleeveRight && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-xs font-bold shadow-md text-center" style={{ fontSize: '6px' }}>
                        LOGO
                      </div>
                    </div>
                  )}
                </div>

                {/* Neck */}
                <div
                  className="absolute top-8 left-1/2 transform -translate-x-1/2 w-12 h-6 rounded-t-full"
                  style={{ backgroundColor: teamColors.tertiary }}
                ></div>
              </div>

                <p className="text-center text-sm text-gray-300 mt-6">Vista Frontal</p>

                {placements.back && (
                  <div className="mt-8 bg-blue-500/10 rounded-lg p-4 border-2 border-blue-500/30">
                    <p className="text-center text-sm font-medium text-gray-200 mb-2">
                      Logo también en la espalda ✓
                    </p>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-lg">💡</span>
                  <div>
                    <p className="text-sm text-gray-300">
                      Ajustaremos el tamaño y posición del logo.
                    </p>
                  </div>
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
