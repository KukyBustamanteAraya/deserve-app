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
            <h1 className="text-4xl font-bold text-white mb-2">Paso 4: Ubicación del Logo</h1>
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
            <div className="flex-1 h-2 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-2 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-2 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Producto</span>
            <span>Diseño</span>
            <span>Colores</span>
            <span>Detalles</span>
            <span className="font-semibold text-blue-600">Logo</span>
            <span>Nombres</span>
            <span>Revisar</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Logo Preview & Placement Options */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Tu Logo</h2>
              <p className="text-gray-600">
                Selecciona dónde quieres que aparezca el logo de tu equipo.
              </p>
            </div>

            {/* Team Logo Display */}
            {teamLogoUrl ? (
              <div className="mb-6 bg-gray-100 rounded-lg p-6 flex items-center justify-center">
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
              <div className="mb-6 bg-gray-100 rounded-lg p-6 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-6xl mb-2 block">🏆</span>
                  <p className="text-sm text-gray-600">Sin logo configurado</p>
                </div>
              </div>
            )}

            {/* Placement Toggles */}
            <div className="space-y-3">
              <button
                onClick={() => handleToggle('front')}
                className={`w-full p-4 rounded-lg border-2 transition-all flex items-center justify-between ${
                  placements.front
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔝</span>
                  <div className="text-left">
                    <h3 className="font-bold text-gray-900">Pecho (Frontal)</h3>
                    <p className="text-sm text-gray-600">Logo en el frente</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  placements.front
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-gray-300'
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
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔙</span>
                  <div className="text-left">
                    <h3 className="font-bold text-gray-900">Espalda</h3>
                    <p className="text-sm text-gray-600">Logo en la parte trasera</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  placements.back
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-gray-300'
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
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">◀️</span>
                  <div className="text-left">
                    <h3 className="font-bold text-gray-900">Manga Izquierda</h3>
                    <p className="text-sm text-gray-600">Logo en la manga izquierda</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  placements.sleeveLeft
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-gray-300'
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
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">▶️</span>
                  <div className="text-left">
                    <h3 className="font-bold text-gray-900">Manga Derecha</h3>
                    <p className="text-sm text-gray-600">Logo en la manga derecha</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  placements.sleeveRight
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-gray-300'
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
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <p className="text-sm text-gray-700">
                      Tu equipo no tiene un logo configurado. Puedes agregar uno en la configuración del equipo o continuar sin logo.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Visual Preview */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Vista Previa</h2>

            <div className="bg-gray-100 rounded-lg p-8">
              {/* T-shirt visualization */}
              <div className="relative mx-auto" style={{ width: '280px', height: '320px' }}>
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

              <p className="text-center text-sm text-gray-600 mt-6">Vista Frontal</p>

              {placements.back && (
                <div className="mt-8 bg-white rounded-lg p-4 border-2 border-blue-200">
                  <p className="text-center text-sm font-medium text-gray-700 mb-2">
                    Logo también en la espalda ✓
                  </p>
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">💡</span>
                <div>
                  <p className="text-sm text-gray-700">
                    <strong>Nota:</strong> Nuestro equipo de diseño ajustará el tamaño y posición exacta del logo para que se vea perfecto en tu diseño final.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            ← Volver
          </button>
          <button
            onClick={handleContinue}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Continuar →
          </button>
        </div>
      </div>
    </div>
  );
}
