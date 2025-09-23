'use client';

import { useState, useTransition } from 'react';
import { sendMagicLink } from '../actions';

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await sendMagicLink(formData);

      if (result.ok) {
        setMessage({
          type: 'success',
          text: 'Te enviamos un link a tu correo. Revísalo.'
        });
      } else {
        setMessage({
          type: 'error',
          text: result.message || 'Error al enviar el enlace'
        });
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Inicia Sesión
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Te enviaremos un enlace mágico a tu correo
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {message && (
            <div
              className={`mb-4 p-4 rounded-md ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <form action={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo electrónico
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="tu@correo.com"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Enviando...' : 'Enviar enlace mágico'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="text-center">
              <a
                href="/"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                ← Volver al inicio
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}