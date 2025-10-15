'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ConfirmationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const designSlug = params.slug as string;
  const requestId = searchParams.get('request_id');
  const supabase = createClient();

  const [mounted, setMounted] = useState(false);
  const [additionalSpecs, setAdditionalSpecs] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmitSpecs = async () => {
    if (!requestId || !additionalSpecs.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Update the design request with additional specifications
      const { error: updateError } = await supabase
        .from('design_requests')
        .update({ additional_specifications: additionalSpecs })
        .eq('id', requestId);

      if (updateError) throw updateError;

      setIsSubmitted(true);
      setAdditionalSpecs('');
    } catch (err) {
      console.error('Error updating specifications:', err);
      setError('Error al guardar las especificaciones');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToCatalog = () => {
    router.push('/catalog');
  };

  const handleGoToTeam = () => {
    // Get team_slug from URL params if available
    const teamSlug = searchParams.get('team_slug');
    if (teamSlug) {
      router.push(`/mi-equipo/${teamSlug}`);
    } else {
      router.push('/catalog');
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {/* Success Message */}
        <div className="relative bg-gradient-to-br from-green-800/90 via-green-900/80 to-green-950/90 backdrop-blur-md border border-green-700 rounded-xl p-6 sm:p-8 shadow-2xl mb-6">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent opacity-50 pointer-events-none"></div>

          <div className="relative text-center">
            {/* Success Icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              ¡Pedido de diseño enviado!
            </h1>
            <p className="text-green-200 text-sm sm:text-base">
              Tu solicitud ha sido recibida exitosamente. Trabajaremos en tu diseño lo más pronto posible.
            </p>
          </div>
        </div>

        {/* Additional Specifications Card */}
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl p-4 sm:p-6 shadow-2xl mb-6">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>

          <div className="relative">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
              ¿Tienes especificaciones adicionales?
            </h2>
            <p className="text-gray-400 text-sm sm:text-base mb-4">
              Puedes agregar cualquier detalle, instrucción especial o preferencia para tu diseño. Esta información nos ayudará a crear exactamente lo que necesitas.
            </p>

            <textarea
              value={additionalSpecs}
              onChange={(e) => setAdditionalSpecs(e.target.value)}
              placeholder="Ej: Me gustaría que el logo esté en el lado izquierdo del pecho, usar fuente bold para los números, incluir el nombre del jugador en la espalda..."
              rows={6}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-[#e21c21] focus:ring-2 focus:ring-[#e21c21]/50 transition-all outline-none resize-none"
            />

            {error && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-200 text-xs sm:text-sm">{error}</p>
              </div>
            )}

            {isSubmitted && (
              <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-green-200 text-xs sm:text-sm">
                  ✓ Especificaciones guardadas exitosamente
                </p>
              </div>
            )}

            <button
              onClick={handleSubmitSpecs}
              disabled={!additionalSpecs.trim() || isSubmitting}
              className={`mt-4 w-full px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-all shadow-lg overflow-hidden group ${
                additionalSpecs.trim() && !isSubmitting
                  ? 'bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white border border-[#e21c21]/50 shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 cursor-pointer'
                  : 'bg-gray-700/50 text-gray-500 border border-gray-600 cursor-not-allowed'
              }`}
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">
                {isSubmitting ? 'Guardando...' : 'Agregar especificaciones'}
              </span>
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="relative bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 sm:p-5 mb-6">
          <div className="flex gap-3">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-blue-200 text-sm sm:text-base leading-relaxed">
                <span className="font-semibold">¿Qué sigue?</span> Nuestro equipo de diseño revisará tu solicitud y comenzará a trabajar en tus uniformes. Te enviaremos actualizaciones por email. Si agregaste especificaciones adicionales, puedes editarlas en cualquier momento desde tu panel de equipo.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleGoToTeam}
            className="relative flex-1 px-4 py-3 sm:px-6 sm:py-4 rounded-lg font-semibold text-sm sm:text-base transition-all shadow-lg overflow-hidden group bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white border border-[#e21c21]/50"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <span className="relative flex items-center justify-center gap-2">
              Ir a mi equipo
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>

          <button
            onClick={handleGoToCatalog}
            className="relative flex-1 px-4 py-3 sm:px-6 sm:py-4 rounded-lg font-semibold text-sm sm:text-base transition-all shadow-lg overflow-hidden group bg-gray-700/50 text-gray-300 border border-gray-600 hover:bg-gray-700/70"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <span className="relative flex items-center justify-center gap-2">
              Volver al catálogo
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
