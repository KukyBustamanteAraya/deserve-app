export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <h2 className="text-center text-xl font-bold text-gray-900 mb-4">
            Página no encontrada
          </h2>
          <p className="text-center text-gray-600 mb-6">
            La página que buscas no existe.
          </p>
          <div className="text-center">
            <a
              href="/"
              className="bg-[#e21c21] text-white py-2 px-4 rounded-lg hover:bg-black transition-colors inline-block"
            >
              Ir al inicio
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}