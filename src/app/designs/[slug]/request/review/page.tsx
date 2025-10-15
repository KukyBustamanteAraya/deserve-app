'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuickDesignRequest } from '@/store/quick-design-request';
import { QuickWizardLayout } from '@/components/quick-design-request/QuickWizardLayout';

export default function ReviewStep() {
  const router = useRouter();
  const params = useParams();
  const designSlug = params.slug as string;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    designId,
    sportId,
    sportSlug,
    sportName,
    teamName,
    primaryColor,
    secondaryColor,
    accentColor,
    organizationType,
    logoFile,
    logoUrl,
    additionalSpecifications,
    email,
    role,
    customRole,
    isAuthenticated,
    reset,
  } = useQuickDesignRequest();

  // Debug: Log store values on page load
  console.log('Review page - Store values:', {
    designId,
    sportId,
    sportSlug,
    sportName,
    teamName,
    organizationType,
    email,
    role,
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      // Prepare form data for file upload
      const formData = new FormData();

      // Generate sport_slug from sportName if sportSlug is missing
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

      // Debug: Log what we're sending
      console.log('Submitting design request with:', {
        designId,
        sportId,
        sportSlug: finalSportSlug,
        sportSlugFromStore: sportSlug,
        sportName,
        teamName,
        primaryColor,
        secondaryColor,
        accentColor,
        organizationType,
        email,
        role,
        isAuthenticated,
        hasLogo: !!logoFile
      });

      const response = await fetch('/api/quick-design-request', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Error al enviar el pedido');
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
    router.push(`/designs/${designSlug}/request/contact`);
  };

  const getOrganizationTypeLabel = () => {
    switch (organizationType) {
      case 'single_team':
        return 'Equipo Individual';
      case 'institution':
        return 'Institución';
      default:
        return '';
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'coach':
        return 'Entrenador';
      case 'manager':
        return 'Manager / Dirigente';
      case 'player':
        return 'Jugador';
      case 'parent':
        return 'Padre/Apoderado';
      case 'other':
        return customRole || 'Otro';
      default:
        return '';
    }
  };

  return (
    <QuickWizardLayout
      step={4}
      totalSteps={4}
      title="Confirma tu pedido"
      subtitle="Revisa la información antes de enviar"
      teamName={teamName || undefined}
      sportName={sportName || undefined}
      onBack={handleBack}
      onContinue={handleSubmit}
      canContinue={!isSubmitting}
      continueLabel={isSubmitting ? 'Enviando...' : 'Confirmar y enviar pedido'}
    >
      <div className="space-y-6">
        {/* Success Message */}
        {showSuccess && (
          <div className="relative bg-green-500/10 border border-green-500/30 rounded-lg p-4 animate-fade-in">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-green-200 text-sm font-semibold">¡Solicitud enviada con éxito!</p>
                <p className="text-green-200 text-sm">Redirigiendo a tu equipo...</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="relative bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-red-200 text-sm font-semibold">Error</p>
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Sport Information */}
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl p-6 shadow-2xl">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#e21c21]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            Deporte
          </h3>
          <div>
            <p className="text-white font-medium">{sportName}</p>
          </div>
        </div>

        {/* Team Information */}
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl p-6 shadow-2xl">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#e21c21]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Información del equipo
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400">Nombre del equipo</p>
              <p className="text-white font-medium">{teamName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-2">Colores del equipo</p>
              <div className="flex gap-3">
                <div>
                  <div
                    className="w-16 h-16 rounded-lg border-2 border-white/20"
                    style={{ backgroundColor: primaryColor }}
                  ></div>
                  <p className="text-xs text-gray-400 mt-1 text-center">Primario</p>
                </div>
                <div>
                  <div
                    className="w-16 h-16 rounded-lg border-2 border-white/20"
                    style={{ backgroundColor: secondaryColor }}
                  ></div>
                  <p className="text-xs text-gray-400 mt-1 text-center">Secundario</p>
                </div>
                <div>
                  <div
                    className="w-16 h-16 rounded-lg border-2 border-white/20"
                    style={{ backgroundColor: accentColor }}
                  ></div>
                  <p className="text-xs text-gray-400 mt-1 text-center">Acento</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Organization Details */}
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl p-6 shadow-2xl">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#e21c21]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Detalles de la organización
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400">Tipo de organización</p>
              <p className="text-white font-medium">{getOrganizationTypeLabel()}</p>
            </div>
            {logoUrl && (
              <div>
                <p className="text-sm text-gray-400 mb-2">Logo del equipo</p>
                <img
                  src={logoUrl}
                  alt="Team logo"
                  className="w-24 h-24 object-cover rounded-lg border-2 border-gray-600"
                />
              </div>
            )}
            {additionalSpecifications && (
              <div>
                <p className="text-sm text-gray-400">Especificaciones adicionales</p>
                <p className="text-white">{additionalSpecifications}</p>
              </div>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl p-6 shadow-2xl">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#e21c21]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Información de contacto
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">Email</p>
              <p className="text-white font-medium">{email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Rol</p>
              <p className="text-white font-medium">{getRoleLabel()}</p>
            </div>
          </div>
        </div>

        {/* Info message */}
        <div className="relative bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-blue-200 text-sm">
                Al confirmar, crearemos tu equipo y enviaremos tu solicitud de diseño. Te notificaremos por email cuando esté lista.
              </p>
            </div>
          </div>
        </div>
      </div>
    </QuickWizardLayout>
  );
}
