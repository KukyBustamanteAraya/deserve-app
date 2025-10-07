'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBuilderState } from '@/hooks/useBuilderState';
import { CustomizeBanner } from '@/components/customize/CustomizeBanner';
import { CustomizeStepNav } from '@/components/customize/CustomizeStepNav';

export default function NombresPage() {
  const router = useRouter();
  const {
    teamColors,
    selectedDesign,
    userType,
    namesNumbers,
    setNamesNumbers,
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
    router.push('/personaliza/resumen');
  };

  if (!selectedDesign || !userType) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomizeBanner />

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-4 pb-32 pt-64">
        {/* Step 4: Names and Numbers */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Nombres y números</h2>
          <p className="text-sm text-gray-600 mb-4">¿Quieres personalizar los jerseys con nombres y números?</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* No Names/Numbers Option */}
            <button
              onClick={() => setNamesNumbers(false)}
              className={`relative p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                !namesNumbers
                  ? 'border-2'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
              style={!namesNumbers ? {
                borderColor: teamColors.primary,
                backgroundColor: `${teamColors.primary}10`
              } : {}}
              aria-pressed={!namesNumbers}
            >
              {!namesNumbers && (
                <div
                  className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: teamColors.primary }}
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              <div className="text-3xl mb-2">👕</div>
              <h3
                className="text-lg font-semibold mb-1"
                style={!namesNumbers ? { color: teamColors.primary } : { color: '#111827' }}
              >
                Sin nombres ni números
              </h3>
              <p className="text-sm text-gray-600">
                Jerseys sin personalización individual
              </p>
            </button>

            {/* With Names/Numbers Option */}
            <button
              onClick={() => setNamesNumbers(true)}
              className={`relative p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                namesNumbers
                  ? 'border-2'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
              style={namesNumbers ? {
                borderColor: teamColors.primary,
                backgroundColor: `${teamColors.primary}10`
              } : {}}
              aria-pressed={namesNumbers}
            >
              {namesNumbers && (
                <div
                  className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: teamColors.primary }}
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              <div className="text-3xl mb-2">🎽</div>
              <h3
                className="text-lg font-semibold mb-1"
                style={namesNumbers ? { color: teamColors.primary } : { color: '#111827' }}
              >
                Con nombres y números
              </h3>
              <p className="text-sm text-gray-600">
                Cada jersey personalizado con nombre y número del jugador
              </p>
            </button>
          </div>

          {/* Additional Info */}
          {namesNumbers && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900">
                    Podrás ingresar los nombres y números más adelante
                  </p>
                  <p className="text-xs text-yellow-800 mt-1">
                    Te enviaremos un formulario para recopilar la información de cada jugador una vez que confirmes tu pedido
                  </p>
                </div>
              </div>
            </div>
          )}

          {!namesNumbers && (
            <div className="mt-4 p-4 rounded-lg border-2" style={{
              backgroundColor: `${teamColors.primary}10`,
              borderColor: `${teamColors.primary}40`
            }}>
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: teamColors.primary }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: teamColors.primary }}>
                    Sin costo adicional
                  </p>
                  <p className="text-xs mt-1" style={{ color: teamColors.primary }}>
                    Los jerseys llevarán solo tu logo y colores del equipo
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <CustomizeStepNav onContinue={handleContinue} />
    </div>
  );
}
