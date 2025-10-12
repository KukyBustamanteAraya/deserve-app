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
            <h1 className="text-4xl font-bold text-white mb-2">Paso 3: Detalles del Uniforme</h1>
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
            <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Producto</span>
            <span>Diseño</span>
            <span>Colores</span>
            <span className="font-semibold text-blue-600">Detalles</span>
            <span>Logo</span>
            <span>Nombres</span>
            <span>Revisar</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Especifica los detalles</h2>
            <p className="text-gray-600">
              Selecciona las características que deseas para tu {selectedProductName.toLowerCase()}.
            </p>
          </div>

          {/* Sleeve Length */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-900 mb-4">
              Largo de Manga
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleSleeveChange('short')}
                className={`p-6 rounded-lg border-2 transition-all text-left ${
                  details.sleeve === 'short'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">👕</span>
                  {details.sleeve === 'short' && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Manga Corta</h3>
                <p className="text-sm text-gray-600">Ideal para clima cálido y mayor movilidad</p>
              </button>

              <button
                onClick={() => handleSleeveChange('long')}
                className={`p-6 rounded-lg border-2 transition-all text-left ${
                  details.sleeve === 'long'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">🧥</span>
                  {details.sleeve === 'long' && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Manga Larga</h3>
                <p className="text-sm text-gray-600">Mayor protección y cobertura</p>
              </button>
            </div>
          </div>

          {/* Neck Style */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-900 mb-4">
              Estilo de Cuello
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleNeckChange('crew')}
                className={`p-6 rounded-lg border-2 transition-all text-left ${
                  details.neck === 'crew'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">⭕</span>
                  {details.neck === 'crew' && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Cuello Redondo</h3>
                <p className="text-sm text-gray-600">Clásico y cómodo</p>
              </button>

              <button
                onClick={() => handleNeckChange('v')}
                className={`p-6 rounded-lg border-2 transition-all text-left ${
                  details.neck === 'v'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">🔻</span>
                  {details.neck === 'v' && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Cuello en V</h3>
                <p className="text-sm text-gray-600">Estilo moderno</p>
              </button>

              <button
                onClick={() => handleNeckChange('polo')}
                className={`p-6 rounded-lg border-2 transition-all text-left ${
                  details.neck === 'polo'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">👔</span>
                  {details.neck === 'polo' && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Cuello Polo</h3>
                <p className="text-sm text-gray-600">Elegante y deportivo</p>
              </button>
            </div>
          </div>

          {/* Fit Style */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-900 mb-4">
              Tipo de Corte
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleFitChange('athletic')}
                className={`p-6 rounded-lg border-2 transition-all text-left ${
                  details.fit === 'athletic'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">💪</span>
                  {details.fit === 'athletic' && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Corte Atlético</h3>
                <p className="text-sm text-gray-600">Ajustado al cuerpo para mejor rendimiento</p>
              </button>

              <button
                onClick={() => handleFitChange('loose')}
                className={`p-6 rounded-lg border-2 transition-all text-left ${
                  details.fit === 'loose'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">🎽</span>
                  {details.fit === 'loose' && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Corte Holgado</h3>
                <p className="text-sm text-gray-600">Más espacio y comodidad</p>
              </button>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">💡</span>
              <div>
                <p className="text-sm text-gray-700">
                  <strong>Nota:</strong> Estas especificaciones ayudarán a nuestro equipo de diseño a crear el mockup perfecto para tu equipo. Puedes ajustar estos detalles más adelante si es necesario.
                </p>
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
