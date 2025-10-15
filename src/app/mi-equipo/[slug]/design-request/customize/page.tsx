'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTeamDesignRequest } from '@/hooks/useTeamDesignRequest';

interface ColorConfiguration {
  primary: string;
  secondary: string;
  tertiary: string;
}

interface ProductColorState {
  includeHome: boolean;
  includeAway: boolean;
  homeColors: ColorConfiguration;
  awayColors: ColorConfiguration;
}

export default function ColorCustomizationPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const {
    teamColors,
    selectedProducts,
    teamSlug,
    setProductColorOptions,
  } = useTeamDesignRequest();

  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [productColorStates, setProductColorStates] = useState<Record<string, ProductColorState>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize color states for all products
  useEffect(() => {
    console.log('[Customize Page] Initializing...', {
      hasTeamColors: !!teamColors,
      teamColors: teamColors,
      teamColorsPrimary: teamColors?.primary,
      selectedProductsCount: selectedProducts.length,
      selectedProducts: selectedProducts,
    });

    // Only initialize if we have valid team colors and products
    if (!teamColors || !teamColors.primary || selectedProducts.length === 0) {
      console.log('[Customize Page] Missing requirements, not initializing', {
        hasTeamColors: !!teamColors,
        hasPrimary: !!teamColors?.primary,
        hasProducts: selectedProducts.length > 0,
      });
      setIsInitialized(false);
      return;
    }

    const initialStates: Record<string, ProductColorState> = {};
    selectedProducts.forEach(product => {
      if (product.colorOptions) {
        // Use existing color options if available
        console.log(`[Customize Page] Using existing colors for ${product.name}`);
        initialStates[product.id] = product.colorOptions;
      } else {
        // Default: include home with team colors, suggest away colors
        console.log(`[Customize Page] Initializing default colors for ${product.name}`);
        initialStates[product.id] = {
          includeHome: true,
          includeAway: false,
          homeColors: {
            primary: teamColors.primary,
            secondary: teamColors.secondary,
            tertiary: teamColors.tertiary,
          },
          awayColors: {
            primary: teamColors.secondary,
            secondary: teamColors.primary,
            tertiary: teamColors.tertiary,
          },
        };
      }
    });
    console.log('[Customize Page] Initialization complete', initialStates);
    setProductColorStates(initialStates);
    setIsInitialized(true);
  }, [selectedProducts, teamColors]);

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

  const currentProduct = selectedProducts[currentProductIndex];
  const currentColorState = productColorStates[currentProduct?.id];

  const handleColorChange = (
    variant: 'home' | 'away',
    colorType: 'primary' | 'secondary' | 'tertiary',
    value: string
  ) => {
    if (!currentProduct) return;

    setProductColorStates(prev => ({
      ...prev,
      [currentProduct.id]: {
        ...prev[currentProduct.id],
        [variant === 'home' ? 'homeColors' : 'awayColors']: {
          ...prev[currentProduct.id][variant === 'home' ? 'homeColors' : 'awayColors'],
          [colorType]: value,
        },
      },
    }));
  };

  const handleToggleVariant = (variant: 'home' | 'away') => {
    if (!currentProduct) return;

    setProductColorStates(prev => ({
      ...prev,
      [currentProduct.id]: {
        ...prev[currentProduct.id],
        [variant === 'home' ? 'includeHome' : 'includeAway']: !prev[currentProduct.id][variant === 'home' ? 'includeHome' : 'includeAway'],
      },
    }));
  };

  const handleResetColors = (variant: 'home' | 'away') => {
    if (!currentProduct) return;

    const resetColors = variant === 'home'
      ? teamColors
      : {
          primary: teamColors.secondary,
          secondary: teamColors.primary,
          tertiary: teamColors.tertiary,
        };

    setProductColorStates(prev => ({
      ...prev,
      [currentProduct.id]: {
        ...prev[currentProduct.id],
        [variant === 'home' ? 'homeColors' : 'awayColors']: resetColors,
      },
    }));
  };

  const handleBack = () => {
    router.push(`/mi-equipo/${params.slug}/design-request/designs`);
  };

  const handleContinue = () => {
    // Save all color options
    Object.entries(productColorStates).forEach(([productId, colorState]) => {
      setProductColorOptions(productId, colorState);
    });
    router.push(`/mi-equipo/${params.slug}/design-request/details`);
  };

  // Show loading state while initializing
  if (!isInitialized || selectedProducts.length === 0 || !currentColorState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Cargando configuración de colores...</p>
        </div>
      </div>
    );
  }

  const canContinue = Object.values(productColorStates).every(
    state => state.includeHome || state.includeAway
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => router.push(`/mi-equipo/${params.slug}`)}
            className="mb-3 text-gray-300 hover:text-white font-medium flex items-center gap-2 transition-colors text-sm"
          >
            ← Volver
          </button>

          <div>
            <div className="inline-block px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded-full text-xs text-gray-400 mb-2">
              Paso 3 de 7
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Personaliza los Colores</h1>
            <p className="text-gray-300 text-sm">
              Elige colores para casa y visitante para cada producto
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Product Tabs */}
        {selectedProducts.length > 1 && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {selectedProducts.map((product, index) => {
              const productState = productColorStates[product.id];
              const variantCount = (productState?.includeHome ? 1 : 0) + (productState?.includeAway ? 1 : 0);
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
                  {variantCount > 0 && (
                    <span className="ml-2 text-xs">({variantCount} variant{variantCount !== 1 ? 'es' : ''})</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Info Banner */}
        <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-gray-300">
            <strong>{currentProduct.name}:</strong> Selecciona si quieres crear versión de casa, visitante, o ambas. Los colores de visitante usan tu secundario como principal.
          </p>
        </div>

        {/* Dual Column Layout */}
        <div className="grid grid-cols-2 gap-3 md:gap-6">
          {/* Home Colors */}
          <div className={`relative group bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border-2 rounded-lg shadow-sm p-3 md:p-4 transition-all ${
            currentColorState.includeHome
              ? 'border-blue-500 ring-2 ring-blue-500/50'
              : 'border-gray-700'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg"></div>
            <div className="relative">
              {/* Header with Checkbox */}
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="flex items-center gap-2 md:gap-3">
                  <button
                    onClick={() => handleToggleVariant('home')}
                    className={`w-5 h-5 md:w-6 md:h-6 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                      currentColorState.includeHome
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-600'
                    }`}
                  >
                    {currentColorState.includeHome && (
                      <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <div>
                    <h2 className="text-sm md:text-lg font-bold text-white">🏠 Casa</h2>
                    <p className="text-xs text-gray-400 hidden md:block">Colores principales del equipo</p>
                  </div>
                </div>
              </div>

              {/* Color Inputs */}
              <div className={`space-y-3 ${!currentColorState.includeHome ? 'opacity-50 pointer-events-none' : ''}`}>
                {/* Primary */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Primario</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={currentColorState.homeColors.primary}
                      onChange={(e) => handleColorChange('home', 'primary', e.target.value)}
                      className="w-12 h-12 rounded border border-gray-600 cursor-pointer bg-gray-800"
                    />
                    <input
                      type="text"
                      value={currentColorState.homeColors.primary}
                      onChange={(e) => handleColorChange('home', 'primary', e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-600 bg-gray-800/50 text-white rounded font-mono text-xs uppercase"
                      placeholder="#000000"
                    />
                  </div>
                </div>

                {/* Secondary */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Secundario</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={currentColorState.homeColors.secondary}
                      onChange={(e) => handleColorChange('home', 'secondary', e.target.value)}
                      className="w-12 h-12 rounded border border-gray-600 cursor-pointer bg-gray-800"
                    />
                    <input
                      type="text"
                      value={currentColorState.homeColors.secondary}
                      onChange={(e) => handleColorChange('home', 'secondary', e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-600 bg-gray-800/50 text-white rounded font-mono text-xs uppercase"
                      placeholder="#000000"
                    />
                  </div>
                </div>

                {/* Tertiary */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Terciario</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={currentColorState.homeColors.tertiary}
                      onChange={(e) => handleColorChange('home', 'tertiary', e.target.value)}
                      className="w-12 h-12 rounded border border-gray-600 cursor-pointer bg-gray-800"
                    />
                    <input
                      type="text"
                      value={currentColorState.homeColors.tertiary}
                      onChange={(e) => handleColorChange('home', 'tertiary', e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-600 bg-gray-800/50 text-white rounded font-mono text-xs uppercase"
                      placeholder="#000000"
                    />
                  </div>
                </div>

                {/* Reset Button */}
                <button
                  onClick={() => handleResetColors('home')}
                  className="w-full px-3 py-2 bg-gray-700 text-gray-200 text-sm rounded-lg hover:bg-gray-600 font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Restaurar Colores del Equipo
                </button>
              </div>
            </div>
          </div>

          {/* Away Colors */}
          <div className={`relative group bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border-2 rounded-lg shadow-sm p-3 md:p-4 transition-all ${
            currentColorState.includeAway
              ? 'border-blue-500 ring-2 ring-blue-500/50'
              : 'border-gray-700'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg"></div>
            <div className="relative">
              {/* Header with Checkbox */}
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="flex items-center gap-2 md:gap-3">
                  <button
                    onClick={() => handleToggleVariant('away')}
                    className={`w-5 h-5 md:w-6 md:h-6 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                      currentColorState.includeAway
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-600'
                    }`}
                  >
                    {currentColorState.includeAway && (
                      <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <div>
                    <h2 className="text-sm md:text-lg font-bold text-white">✈️ Visitante</h2>
                    <p className="text-xs text-gray-400 hidden md:block">Colores invertidos sugeridos</p>
                  </div>
                </div>
              </div>

              {/* Color Inputs */}
              <div className={`space-y-3 ${!currentColorState.includeAway ? 'opacity-50 pointer-events-none' : ''}`}>
                {/* Primary */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Primario</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={currentColorState.awayColors.primary}
                      onChange={(e) => handleColorChange('away', 'primary', e.target.value)}
                      className="w-12 h-12 rounded border border-gray-600 cursor-pointer bg-gray-800"
                    />
                    <input
                      type="text"
                      value={currentColorState.awayColors.primary}
                      onChange={(e) => handleColorChange('away', 'primary', e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-600 bg-gray-800/50 text-white rounded font-mono text-xs uppercase"
                      placeholder="#000000"
                    />
                  </div>
                </div>

                {/* Secondary */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Secundario</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={currentColorState.awayColors.secondary}
                      onChange={(e) => handleColorChange('away', 'secondary', e.target.value)}
                      className="w-12 h-12 rounded border border-gray-600 cursor-pointer bg-gray-800"
                    />
                    <input
                      type="text"
                      value={currentColorState.awayColors.secondary}
                      onChange={(e) => handleColorChange('away', 'secondary', e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-600 bg-gray-800/50 text-white rounded font-mono text-xs uppercase"
                      placeholder="#000000"
                    />
                  </div>
                </div>

                {/* Tertiary */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Terciario</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={currentColorState.awayColors.tertiary}
                      onChange={(e) => handleColorChange('away', 'tertiary', e.target.value)}
                      className="w-12 h-12 rounded border border-gray-600 cursor-pointer bg-gray-800"
                    />
                    <input
                      type="text"
                      value={currentColorState.awayColors.tertiary}
                      onChange={(e) => handleColorChange('away', 'tertiary', e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-600 bg-gray-800/50 text-white rounded font-mono text-xs uppercase"
                      placeholder="#000000"
                    />
                  </div>
                </div>

                {/* Reset Button */}
                <button
                  onClick={() => handleResetColors('away')}
                  className="w-full px-3 py-2 bg-gray-700 text-gray-200 text-sm rounded-lg hover:bg-gray-600 font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Restaurar Colores Sugeridos
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Message */}
        {!canContinue && (
          <div className="mt-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-sm text-yellow-300">
              ⚠️ Debes seleccionar al menos una variante (casa o visitante) para cada producto.
            </p>
          </div>
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
            disabled={!canContinue}
            className={`px-6 py-2.5 text-sm rounded-lg font-medium transition-colors ${
              canContinue
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
