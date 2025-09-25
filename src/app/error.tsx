'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <h2 className="text-center text-xl font-bold text-gray-900 mb-4">
            Algo salió mal
          </h2>
          <p className="text-center text-gray-600 mb-6">
            Ocurrió un error inesperado. Por favor, intenta nuevamente.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => reset()}
              className="flex-1 bg-[#e21c21] text-white py-2 px-4 rounded-lg hover:bg-black transition-colors"
            >
              Intentar de nuevo
            </button>
            <a
              href="/"
              className="flex-1 bg-gray-200 text-gray-900 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors text-center"
            >
              Ir al inicio
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}