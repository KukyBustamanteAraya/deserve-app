'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBuilderState } from '@/hooks/useBuilderState';
import { CustomizeBanner } from '@/components/customize/CustomizeBanner';
import { CustomizeStepNav } from '@/components/customize/CustomizeStepNav';

export default function UniformesPage() {
  const router = useRouter();
  const {
    teamColors,
    selectedDesign,
    userType,
    uniformDetails,
    setUniformDetails,
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
    router.push('/personaliza/logos');
  };

  if (!selectedDesign || !userType) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomizeBanner />

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-4 pb-32 pt-64">
        {/* Step 2: Uniform Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Detalles del uniforme</h2>
          <p className="text-sm text-gray-600 mb-4">Personaliza las características de tu jersey</p>

          {/* Sleeve Length */}
          <div className="mb-6">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Largo de manga</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setUniformDetails({ sleeve: 'short' })}
                className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
                  uniformDetails.sleeve === 'short'
                    ? 'border-2'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                style={uniformDetails.sleeve === 'short' ? {
                  borderColor: teamColors.primary,
                  backgroundColor: `${teamColors.primary}10`
                } : {}}
                aria-pressed={uniformDetails.sleeve === 'short'}
              >
                {uniformDetails.sleeve === 'short' && (
                  <div
                    className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: teamColors.primary }}
                  >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-3xl mb-2">👕</div>
                  <div
                    className="font-medium"
                    style={uniformDetails.sleeve === 'short' ? { color: teamColors.primary } : { color: '#111827' }}
                  >
                    Manga corta
                  </div>
                </div>
              </button>

              <button
                onClick={() => setUniformDetails({ sleeve: 'long' })}
                className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
                  uniformDetails.sleeve === 'long'
                    ? 'border-2'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                style={uniformDetails.sleeve === 'long' ? {
                  borderColor: teamColors.primary,
                  backgroundColor: `${teamColors.primary}10`
                } : {}}
                aria-pressed={uniformDetails.sleeve === 'long'}
              >
                {uniformDetails.sleeve === 'long' && (
                  <div
                    className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: teamColors.primary }}
                  >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-3xl mb-2">🧥</div>
                  <div
                    className="font-medium"
                    style={uniformDetails.sleeve === 'long' ? { color: teamColors.primary } : { color: '#111827' }}
                  >
                    Manga larga
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Neck Style */}
          <div className="mb-6">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Estilo de cuello</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setUniformDetails({ neck: 'crew' })}
                className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
                  uniformDetails.neck === 'crew'
                    ? 'border-2'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                style={uniformDetails.neck === 'crew' ? {
                  borderColor: teamColors.primary,
                  backgroundColor: `${teamColors.primary}10`
                } : {}}
                aria-pressed={uniformDetails.neck === 'crew'}
              >
                {uniformDetails.neck === 'crew' && (
                  <div
                    className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: teamColors.primary }}
                  >
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-2xl mb-1">⭕</div>
                  <div
                    className="text-sm font-medium"
                    style={uniformDetails.neck === 'crew' ? { color: teamColors.primary } : { color: '#111827' }}
                  >
                    Redondo
                  </div>
                </div>
              </button>

              <button
                onClick={() => setUniformDetails({ neck: 'v' })}
                className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
                  uniformDetails.neck === 'v'
                    ? 'border-2'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                style={uniformDetails.neck === 'v' ? {
                  borderColor: teamColors.primary,
                  backgroundColor: `${teamColors.primary}10`
                } : {}}
                aria-pressed={uniformDetails.neck === 'v'}
              >
                {uniformDetails.neck === 'v' && (
                  <div
                    className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: teamColors.primary }}
                  >
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-2xl mb-1">🔻</div>
                  <div
                    className="text-sm font-medium"
                    style={uniformDetails.neck === 'v' ? { color: teamColors.primary } : { color: '#111827' }}
                  >
                    V
                  </div>
                </div>
              </button>

              <button
                onClick={() => setUniformDetails({ neck: 'polo' })}
                className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
                  uniformDetails.neck === 'polo'
                    ? 'border-2'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                style={uniformDetails.neck === 'polo' ? {
                  borderColor: teamColors.primary,
                  backgroundColor: `${teamColors.primary}10`
                } : {}}
                aria-pressed={uniformDetails.neck === 'polo'}
              >
                {uniformDetails.neck === 'polo' && (
                  <div
                    className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: teamColors.primary }}
                  >
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-2xl mb-1">👔</div>
                  <div
                    className="text-sm font-medium"
                    style={uniformDetails.neck === 'polo' ? { color: teamColors.primary } : { color: '#111827' }}
                  >
                    Polo
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Fit */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-3">Ajuste</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setUniformDetails({ fit: 'athletic' })}
                className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
                  uniformDetails.fit === 'athletic'
                    ? 'border-2'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                style={uniformDetails.fit === 'athletic' ? {
                  borderColor: teamColors.primary,
                  backgroundColor: `${teamColors.primary}10`
                } : {}}
                aria-pressed={uniformDetails.fit === 'athletic'}
              >
                {uniformDetails.fit === 'athletic' && (
                  <div
                    className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: teamColors.primary }}
                  >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-3xl mb-2">💪</div>
                  <div
                    className="font-medium"
                    style={uniformDetails.fit === 'athletic' ? { color: teamColors.primary } : { color: '#111827' }}
                  >
                    Atlético
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Ajustado al cuerpo</p>
                </div>
              </button>

              <button
                onClick={() => setUniformDetails({ fit: 'loose' })}
                className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
                  uniformDetails.fit === 'loose'
                    ? 'border-2'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                style={uniformDetails.fit === 'loose' ? {
                  borderColor: teamColors.primary,
                  backgroundColor: `${teamColors.primary}10`
                } : {}}
                aria-pressed={uniformDetails.fit === 'loose'}
              >
                {uniformDetails.fit === 'loose' && (
                  <div
                    className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: teamColors.primary }}
                  >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-3xl mb-2">👕</div>
                  <div
                    className="font-medium"
                    style={uniformDetails.fit === 'loose' ? { color: teamColors.primary } : { color: '#111827' }}
                  >
                    Holgado
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Más espacio</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <CustomizeStepNav onContinue={handleContinue} />
    </div>
  );
}
