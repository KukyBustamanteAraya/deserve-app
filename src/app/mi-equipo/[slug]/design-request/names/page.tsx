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
            <h1 className="text-4xl font-bold text-white mb-2">Paso 5: Nombres y Números</h1>
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
            <div className="flex-1 h-2 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Producto</span>
            <span>Diseño</span>
            <span>Colores</span>
            <span>Detalles</span>
            <span>Logo</span>
            <span className="font-semibold text-blue-600">Nombres</span>
            <span>Revisar</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">¿Deseas incluir nombres y números?</h2>
            <p className="text-gray-600">
              Indica si quieres que los uniformes incluyan los nombres y números de los jugadores en el diseño final.
            </p>
          </div>

          {/* Yes/No Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <button
              onClick={() => setIncludeNames(true)}
              className={`p-8 rounded-lg border-2 transition-all text-left ${
                includeNames
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-5xl">✅</span>
                {includeNames && (
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Sí, incluir</h3>
              <p className="text-gray-600">
                Los uniformes incluirán nombres y números personalizados para cada jugador.
              </p>
            </button>

            <button
              onClick={() => setIncludeNames(false)}
              className={`p-8 rounded-lg border-2 transition-all text-left ${
                !includeNames
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-5xl">❌</span>
                {!includeNames && (
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No, sin nombres</h3>
              <p className="text-gray-600">
                Los uniformes no tendrán nombres ni números personalizados.
              </p>
            </button>
          </div>

          {/* Info boxes */}
          {includeNames ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <span className="text-3xl">📝</span>
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">¿Cómo funciona?</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">1.</span>
                      <span>Indica que deseas nombres y números en esta solicitud</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">2.</span>
                      <span>El equipo de diseño incluirá espacios para nombres y números en el mockup</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">3.</span>
                      <span>Cuando el diseño sea aprobado, cada jugador podrá ingresar su nombre y número personalizado</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">4.</span>
                      <span>Los nombres y números se agregarán antes de enviar los uniformes a producción</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <span className="text-3xl">ℹ️</span>
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Uniformes sin personalización</h4>
                  <p className="text-sm text-gray-700">
                    Los uniformes se producirán sin nombres ni números. Esta opción es ideal si prefieres un diseño limpio o si planeas agregar personalización más adelante por tu cuenta.
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Nota:</strong> Podrás cambiar esta opción más adelante si cambias de opinión antes de que el pedido entre en producción.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Example visualization */}
          {includeNames && (
            <div className="mt-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4 text-center">Ejemplo de personalización</h4>
              <div className="flex items-center justify-center gap-8">
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
                  <p className="text-xs text-gray-600">Vista Frontal</p>
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
                  <p className="text-xs text-gray-600">Vista Trasera</p>
                </div>
              </div>
            </div>
          )}
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
