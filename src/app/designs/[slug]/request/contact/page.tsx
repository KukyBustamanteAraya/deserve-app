'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuickDesignRequest } from '@/store/quick-design-request';
import { createClient } from '@/lib/supabase/client';

export default function ContactStep() {
  const router = useRouter();
  const params = useParams();
  const designSlug = params.slug as string;
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    designId,
    designName,
    sportId,
    teamName,
    primaryColor,
    secondaryColor,
    accentColor,
    organizationType,
    logoFile,
    additionalSpecifications,
    email,
    role,
    customRole,
    isAuthenticated,
    mockups,
    setEmail,
    setIsAuthenticated,
    canProceedToStep4,
    reset,
  } = useQuickDesignRequest();

  const [selectedMockupIndex, setSelectedMockupIndex] = useState(0);

  // Check if component has mounted (client-side only)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsAuthenticated(true);
        setEmail(user.email || '');
      }
    };
    checkAuth();
  }, []);

  const handleSubmit = async () => {
    if (!canProceedToStep4()) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Prepare form data for file upload
      const formData = new FormData();

      // Get sportSlug from store, or generate from sportName if missing
      const { sportSlug, sportName } = useQuickDesignRequest.getState();
      const finalSportSlug = sportSlug || sportName?.toLowerCase().replace(/\s+/g, '-') || '';

      formData.append('design_id', designId || '');
      formData.append('sport_id', sportId?.toString() || '');
      formData.append('sport_slug', finalSportSlug);
      formData.append('team_name', teamName);
      formData.append('primary_color', primaryColor);
      formData.append('secondary_color', secondaryColor);
      formData.append('accent_color', accentColor);
      formData.append('organization_type', organizationType || '');
      formData.append('additional_specifications', additionalSpecifications);
      formData.append('email', email);
      formData.append('role', role || '');
      formData.append('is_authenticated', isAuthenticated.toString());

      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const response = await fetch('/api/quick-design-request', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al enviar el pedido');
      }

      // Success! Show success message briefly, then redirect
      setShowSuccess(true);
      const teamSlug = result.data?.team_slug;

      // Wait 1.5 seconds to show success message, then redirect
      setTimeout(() => {
        reset(); // Clear wizard state
        if (teamSlug) {
          router.push(`/mi-equipo/${teamSlug}?request_created=true`);
        } else {
          router.push('/catalog?request_created=true');
        }
      }, 1500);
    } catch (err) {
      console.error('Error submitting request:', err);
      setError(err instanceof Error ? err.message : 'Error al enviar el pedido');
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push(`/designs/${designSlug}/request/organization`);
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return null;
  }

  const selectedMockup = mockups[selectedMockupIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-12">
        {/* Design Image Section - matching design page layout */}
        <div className="space-y-4 mb-2 fixed top-24 left-0 right-0 md:relative z-40 md:z-auto px-4 md:px-0 pt-2 md:pt-0 pb-2 md:pb-0">
          {/* Main Mockup Image */}
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-xl border border-gray-700 overflow-hidden aspect-square flex items-center justify-center shadow-2xl group">
            {/* Glass shine effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

            {selectedMockup ? (
              <img
                src={selectedMockup.mockup_url}
                alt={`${designName} - ${selectedMockup.view_angle}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-gray-400 text-center p-12">
                <svg className="w-24 h-24 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-300">No hay mockup disponible para este deporte</p>
              </div>
            )}
          </div>

          {/* Mockup Thumbnails */}
          {mockups.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {mockups.map((mockup, index) => (
                <button
                  key={mockup.id}
                  onClick={() => setSelectedMockupIndex(index)}
                  className={`aspect-square rounded-lg border-2 overflow-hidden transition-all backdrop-blur-sm ${
                    index === selectedMockupIndex
                      ? 'border-[#e21c21] ring-2 ring-[#e21c21]/50 shadow-lg shadow-[#e21c21]/20'
                      : 'border-gray-700 hover:border-[#e21c21]/50 bg-gray-800/50'
                  }`}
                  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                >
                  <img
                    src={mockup.mockup_url}
                    alt={`Vista ${mockup.view_angle}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Spacer for mobile fixed image */}
        <div className="h-[calc(100vw-2rem)] md:h-0"></div>

        {/* Contact Form - matching design page card styling */}
        <div className="space-y-2.5">
          {/* Success Message */}
          {showSuccess && (
            <div className="relative bg-green-500/10 border border-green-500/30 rounded-lg p-2.5 sm:p-3 animate-fade-in">
              <div className="flex gap-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-green-200 text-xs sm:text-sm font-semibold">¡Solicitud enviada con éxito!</p>
                  <p className="text-green-200 text-xs sm:text-sm">Redirigiendo a tu equipo...</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="relative bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 sm:p-3">
              <div className="flex gap-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-red-200 text-xs sm:text-sm font-semibold">Error</p>
                  <p className="text-red-200 text-xs sm:text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* If not authenticated, ask for email */}
          {!isAuthenticated && (
            <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl p-2.5 sm:p-3 shadow-2xl group">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

              <div className="relative">
                <label htmlFor="email" className="block text-xs sm:text-sm font-semibold text-gray-300 mb-0.5 sm:mb-1">
                  Email *
                </label>
                <p className="text-[10px] sm:text-xs text-gray-400 mb-2">
                  Te enviaremos actualizaciones sobre tu pedido
                </p>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className={`w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm bg-gray-900/50 border rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#e21c21]/50 transition-all outline-none ${
                    email && !isValidEmail(email)
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-600 focus:border-[#e21c21]'
                  }`}
                />
                {email && !isValidEmail(email) && (
                  <p className="mt-1 text-[10px] sm:text-xs text-red-400">Por favor ingresa un email válido</p>
                )}
              </div>
            </div>
          )}

          {/* Info message */}
          {!isAuthenticated && (
            <div className="relative bg-blue-500/10 border border-blue-500/30 rounded-lg p-2.5 sm:p-3">
              <div className="flex gap-2">
                <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-blue-200 text-[10px] sm:text-xs leading-relaxed">
                    <span className="font-semibold">Información importante:</span> Crearemos una cuenta para ti automáticamente para que puedas hacer seguimiento de tu pedido.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2.5">
            <button
              onClick={handleBack}
              className="relative px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-all shadow-lg overflow-hidden group bg-gray-700/50 text-gray-300 border border-gray-600 hover:bg-gray-700/70"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative flex items-center justify-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Volver
              </span>
            </button>

            <button
              onClick={handleSubmit}
              disabled={!canProceedToStep4() || isSubmitting}
              className={`relative flex-1 px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-all shadow-lg overflow-hidden group ${
                canProceedToStep4() && !isSubmitting
                  ? 'bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white border border-[#e21c21]/50 shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 cursor-pointer'
                  : 'bg-gray-700/50 text-gray-500 border border-gray-600 cursor-not-allowed'
              }`}
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative flex items-center justify-center gap-1.5 sm:gap-2">
                {isSubmitting ? 'Enviando...' : 'Enviar pedido'}
                {!isSubmitting && (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
