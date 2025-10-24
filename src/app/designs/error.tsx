'use client';

import { logger } from '@/lib/logger';

export default function DesignsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  logger.error('Designs page error:', error);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Error en Diseño
          </h1>
          <p className="text-gray-600 mb-4">
            Ocurrió un error al cargar el diseño.
          </p>
          {error.message && (
            <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg mb-4">
              {error.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full px-4 py-3 bg-[#e21c21] text-white font-medium rounded-lg hover:bg-black transition-colors"
          >
            Intentar de nuevo
          </button>
          <a
            href="/catalog"
            className="w-full px-4 py-3 border border-gray-300 text-center text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Ver Catálogo
          </a>
          <a
            href="/"
            className="w-full px-4 py-3 text-center text-gray-600 text-sm hover:text-gray-900 transition-colors"
          >
            Ir al inicio
          </a>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Si el problema persiste, por favor contacta a soporte.
          </p>
        </div>
      </div>
    </div>
  );
}
