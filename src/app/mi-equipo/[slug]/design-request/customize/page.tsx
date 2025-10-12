'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTeamDesignRequest } from '@/hooks/useTeamDesignRequest';

export default function ColorCustomizationPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const {
    teamColors,
    customColors,
    setCustomColors,
    selectedProductName,
    teamSlug,
  } = useTeamDesignRequest();

  const [colors, setColors] = useState(customColors);

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

  const handleColorChange = (colorType: 'primary' | 'secondary' | 'tertiary', value: string) => {
    setColors({ ...colors, [colorType]: value });
  };

  const handleResetToTeamColors = () => {
    setColors(teamColors);
  };

  const handleBack = () => {
    router.push(`/mi-equipo/${params.slug}/design-request/designs`);
  };

  const handleContinue = () => {
    setCustomColors(colors);
    router.push(`/mi-equipo/${params.slug}/design-request/details`);
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
            <h1 className="text-4xl font-bold text-white mb-2">Paso 2: Personaliza los Colores</h1>
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
            <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Producto</span>
            <span>Diseño</span>
            <span className="font-semibold text-blue-600">Colores</span>
            <span>Detalles</span>
            <span>Logo</span>
            <span>Nombres</span>
            <span>Revisar</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Color Pickers */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Elige tus colores</h2>
              <p className="text-gray-600">
                Personaliza los colores de tu {selectedProductName.toLowerCase()}. Los colores de tu equipo ya están pre-seleccionados, pero puedes cambiarlos si lo deseas.
              </p>
            </div>

            {/* Primary Color */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color Primario
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={colors.primary}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="w-20 h-20 rounded-lg border-2 border-gray-300 cursor-pointer"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={colors.primary}
                    onChange={(e) => handleColorChange('primary', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm uppercase"
                    placeholder="#000000"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                  <p className="text-xs text-gray-500 mt-1">El color principal de tu diseño</p>
                </div>
              </div>
            </div>

            {/* Secondary Color */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color Secundario
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={colors.secondary}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="w-20 h-20 rounded-lg border-2 border-gray-300 cursor-pointer"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={colors.secondary}
                    onChange={(e) => handleColorChange('secondary', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm uppercase"
                    placeholder="#000000"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                  <p className="text-xs text-gray-500 mt-1">Color de acento o detalles</p>
                </div>
              </div>
            </div>

            {/* Tertiary Color */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color Terciario
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={colors.tertiary}
                  onChange={(e) => handleColorChange('tertiary', e.target.value)}
                  className="w-20 h-20 rounded-lg border-2 border-gray-300 cursor-pointer"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={colors.tertiary}
                    onChange={(e) => handleColorChange('tertiary', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm uppercase"
                    placeholder="#000000"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                  <p className="text-xs text-gray-500 mt-1">Color adicional para contraste</p>
                </div>
              </div>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleResetToTeamColors}
              className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Usar Colores del Equipo
            </button>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Vista Previa</h2>

            {/* Color Palette Preview */}
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-3">Tu paleta de colores:</p>
              <div className="flex gap-4">
                <div className="flex-1">
                  <div
                    className="w-full h-24 rounded-lg border-2 border-gray-300 mb-2"
                    style={{ backgroundColor: colors.primary }}
                  ></div>
                  <p className="text-xs text-gray-600 text-center font-mono">{colors.primary}</p>
                  <p className="text-xs text-gray-500 text-center">Primario</p>
                </div>
                <div className="flex-1">
                  <div
                    className="w-full h-24 rounded-lg border-2 border-gray-300 mb-2"
                    style={{ backgroundColor: colors.secondary }}
                  ></div>
                  <p className="text-xs text-gray-600 text-center font-mono">{colors.secondary}</p>
                  <p className="text-xs text-gray-500 text-center">Secundario</p>
                </div>
                <div className="flex-1">
                  <div
                    className="w-full h-24 rounded-lg border-2 border-gray-300 mb-2"
                    style={{ backgroundColor: colors.tertiary }}
                  ></div>
                  <p className="text-xs text-gray-600 text-center font-mono">{colors.tertiary}</p>
                  <p className="text-xs text-gray-500 text-center">Terciario</p>
                </div>
              </div>
            </div>

            {/* Simple Mockup Preview */}
            <div className="bg-gray-100 rounded-lg p-8 flex items-center justify-center">
              <div className="text-center">
                <div
                  className="w-48 h-48 rounded-lg shadow-lg mx-auto mb-4 flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                  }}
                >
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold"
                    style={{ backgroundColor: colors.tertiary, color: colors.primary }}
                  >
                    👕
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Vista previa aproximada de tus colores
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">💡</span>
                <div>
                  <p className="text-sm text-gray-700">
                    <strong>Nota:</strong> Esta es solo una vista previa aproximada. Nuestro equipo de diseño creará un mockup detallado con tus colores y te lo enviará para revisión.
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
