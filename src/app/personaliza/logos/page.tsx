'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBuilderState } from '@/hooks/useBuilderState';
import { CustomizeBanner } from '@/components/customize/CustomizeBanner';
import { CustomizeStepNav } from '@/components/customize/CustomizeStepNav';

export default function LogosPage() {
  const router = useRouter();
  const {
    teamColors,
    selectedDesign,
    userType,
    logoPlacements,
    toggleLogoPlacement,
    logoUrl,
  } = useBuilderState();

  // Apply CSS variables for gradient
  useEffect(() => {
    document.documentElement.style.setProperty('--brand-primary', teamColors.primary);
    document.documentElement.style.setProperty('--brand-secondary', teamColors.secondary);
    document.documentElement.style.setProperty('--brand-accent', teamColors.accent);
  }, [teamColors]);

  // Redirect if no design or user type selected
  useEffect(() => {
    if (!selectedDesign || !userType) {
      router.push('/personaliza');
    }
  }, [selectedDesign, userType, router]);

  const handleContinue = () => {
    router.push('/personaliza/nombres');
  };

  if (!selectedDesign || !userType) {
    return null;
  }

  const hasAnyPlacement = Object.values(logoPlacements).some(Boolean);

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomizeBanner />

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-4 pb-32 pt-64">
        {/* Step 3: Logo Placement */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Posición del logo</h2>
          <p className="text-sm text-gray-600 mb-4">
            {logoUrl
              ? 'Selecciona dónde quieres que aparezca tu logo'
              : 'Selecciona las posiciones donde colocarás tu logo (puedes subirlo después)'}
          </p>

          {/* Interactive Jersey Diagram */}
          <div className="flex flex-col md:flex-row gap-6 items-center justify-center mb-4">
            {/* Front View */}
            <div className="relative">
              <div className="text-center mb-2 font-semibold text-gray-700 text-sm">Vista Frontal</div>
              <div className="relative w-56 h-72 bg-gray-100 rounded-lg border-2 border-gray-300 overflow-hidden">
                {/* Jersey SVG/Shape */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 200 250" className="w-full h-full">
                    <path
                      d="M 40,50 L 60,30 L 80,30 L 100,10 L 120,30 L 140,30 L 160,50 L 160,240 L 40,240 Z"
                      fill="#e5e7eb"
                      stroke="#9ca3af"
                      strokeWidth="2"
                    />
                  </svg>
                </div>

                {/* Front Logo Placement */}
                <button
                  onClick={() => toggleLogoPlacement('front')}
                  className={`absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 transition-all duration-200 ${
                    logoPlacements.front
                      ? 'shadow-lg'
                      : 'bg-white border-dashed border-gray-400 hover:border-gray-600'
                  }`}
                  style={logoPlacements.front ? {
                    backgroundColor: teamColors.primary,
                    borderColor: teamColors.primary
                  } : {}}
                  aria-label="Logo frontal"
                  aria-pressed={logoPlacements.front}
                >
                  {logoPlacements.front ? (
                    <svg className="w-full h-full text-white p-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <div className="text-xs text-gray-500 flex items-center justify-center h-full">
                      Logo
                    </div>
                  )}
                </button>

                {/* Left Sleeve */}
                <button
                  onClick={() => toggleLogoPlacement('sleeveLeft')}
                  className={`absolute top-20 right-3 w-12 h-12 rounded-full border-2 transition-all duration-200 ${
                    logoPlacements.sleeveLeft
                      ? 'shadow-lg'
                      : 'bg-white border-dashed border-gray-400 hover:border-gray-600'
                  }`}
                  style={logoPlacements.sleeveLeft ? {
                    backgroundColor: teamColors.primary,
                    borderColor: teamColors.primary
                  } : {}}
                  aria-label="Logo manga izquierda"
                  aria-pressed={logoPlacements.sleeveLeft}
                >
                  {logoPlacements.sleeveLeft && (
                    <svg className="w-full h-full text-white p-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>

                {/* Right Sleeve */}
                <button
                  onClick={() => toggleLogoPlacement('sleeveRight')}
                  className={`absolute top-20 left-3 w-12 h-12 rounded-full border-2 transition-all duration-200 ${
                    logoPlacements.sleeveRight
                      ? 'shadow-lg'
                      : 'bg-white border-dashed border-gray-400 hover:border-gray-600'
                  }`}
                  style={logoPlacements.sleeveRight ? {
                    backgroundColor: teamColors.primary,
                    borderColor: teamColors.primary
                  } : {}}
                  aria-label="Logo manga derecha"
                  aria-pressed={logoPlacements.sleeveRight}
                >
                  {logoPlacements.sleeveRight && (
                    <svg className="w-full h-full text-white p-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Back View */}
            <div className="relative">
              <div className="text-center mb-2 font-semibold text-gray-700 text-sm">Vista Posterior</div>
              <div className="relative w-56 h-72 bg-gray-100 rounded-lg border-2 border-gray-300 overflow-hidden">
                {/* Jersey SVG/Shape */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 200 250" className="w-full h-full">
                    <path
                      d="M 40,50 L 60,30 L 80,30 L 100,10 L 120,30 L 140,30 L 160,50 L 160,240 L 40,240 Z"
                      fill="#e5e7eb"
                      stroke="#9ca3af"
                      strokeWidth="2"
                    />
                  </svg>
                </div>

                {/* Back Logo Placement */}
                <button
                  onClick={() => toggleLogoPlacement('back')}
                  className={`absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 transition-all duration-200 ${
                    logoPlacements.back
                      ? 'shadow-lg'
                      : 'bg-white border-dashed border-gray-400 hover:border-gray-600'
                  }`}
                  style={logoPlacements.back ? {
                    backgroundColor: teamColors.primary,
                    borderColor: teamColors.primary
                  } : {}}
                  aria-label="Logo posterior"
                  aria-pressed={logoPlacements.back}
                >
                  {logoPlacements.back ? (
                    <svg className="w-full h-full text-white p-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <div className="text-xs text-gray-500 flex items-center justify-center h-full">
                      Logo
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Selection Summary */}
          <div className="p-4 rounded-lg border-2" style={{
            backgroundColor: `${teamColors.primary}10`,
            borderColor: `${teamColors.primary}40`
          }}>
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5" style={{ color: teamColors.primary }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: teamColors.primary }}>
                  {hasAnyPlacement
                    ? 'Posiciones seleccionadas: '
                    : 'Selecciona al menos una posición para el logo'}
                </p>
                {hasAnyPlacement && (
                  <ul className="mt-1 text-sm" style={{ color: teamColors.primary }}>
                    {logoPlacements.front && <li>• Frontal</li>}
                    {logoPlacements.back && <li>• Posterior</li>}
                    {logoPlacements.sleeveLeft && <li>• Manga izquierda</li>}
                    {logoPlacements.sleeveRight && <li>• Manga derecha</li>}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CustomizeStepNav onContinue={handleContinue} />
    </div>
  );
}
