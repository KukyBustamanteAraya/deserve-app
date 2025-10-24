'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';
import { useProfile } from '@/hooks/useProfile';
import RoleSelector from '@/app/profile/components/RoleSelector';
import AthleticProfileForm from '@/app/profile/components/AthleticProfileForm';
import ManagerProfileForm from '@/app/profile/components/ManagerProfileForm';
import PasswordCreationForm from '@/app/profile/components/PasswordCreationForm';
import { getBrowserClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

/**
 * Profile Setup Page
 *
 * Shown to users after registration to:
 * 0. (Optional) Create password if using magic link
 * 1. Select their user type (player, manager, athletic_director, hybrid)
 * 2. Fill out their profile based on user type
 * 3. Redirect to dashboard when complete
 *
 * This ensures all users have a user_type set before using the app.
 */
export default function ProfileSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { profile, loading: profileLoading, reload } = useProfile();

  const [step, setStep] = useState<'create-password' | 'select-type' | 'fill-profile' | 'complete'>('create-password');
  const [selectedUserType, setSelectedUserType] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [checkingPassword, setCheckingPassword] = useState(true);

  // Check if this is a welcome redirect from registration
  useEffect(() => {
    const welcome = searchParams.get('welcome');
    if (welcome === 'true') {
      setShowWelcome(true);
    }
  }, [searchParams]);

  // Check if user needs to create a password (magic link users only, not OAuth)
  useEffect(() => {
    async function checkPasswordStatus() {
      if (!user) {
        setCheckingPassword(false);
        return;
      }

      try {
        const supabase = getBrowserClient();
        const { data: { user: authUser }, error } = await supabase.auth.getUser();

        if (error) {
          logger.error('[ProfileSetup] Error fetching user:', toError(error));
          setCheckingPassword(false);
          setStep('select-type');
          return;
        }

        // Check if user authenticated via OAuth (Google, etc.)
        const isOAuthUser = authUser?.app_metadata?.provider && authUser.app_metadata.provider !== 'email';

        // Alternative check: look for OAuth identities
        const hasOAuthIdentity = authUser?.identities?.some(
          (identity: any) => identity.provider === 'google' || identity.provider !== 'email'
        );

        // Check if user has password_set metadata
        const hasPassword = authUser?.user_metadata?.password_set === true;

        logger.info('[ProfileSetup] Password check:', {
          hasPassword,
          isOAuthUser,
          hasOAuthIdentity,
          provider: authUser?.app_metadata?.provider,
          metadata: authUser?.user_metadata
        });

        // Only show password creation for magic link users (not OAuth users, not password users)
        if (!hasPassword && !isOAuthUser && !hasOAuthIdentity) {
          // User needs to create password (magic link user only)
          setNeedsPassword(true);
          setStep('create-password');
        } else {
          // User already has password OR is OAuth user, skip to role selection
          setNeedsPassword(false);
          setStep('select-type');
        }
      } catch (err) {
        logger.error('[ProfileSetup] Error checking password status:', toError(err));
        setStep('select-type'); // Fail gracefully, skip password step
      } finally {
        setCheckingPassword(false);
      }
    }

    checkPasswordStatus();
  }, [user]);

  // Check if user already has profile setup
  useEffect(() => {
    if (!profileLoading && profile) {
      if (profile.user_type) {
        // User already has type set, redirect to dashboard
        console.log('[ProfileSetup] User already has profile setup, redirecting to dashboard');
        router.push('/dashboard');
      }
    }
  }, [profile, profileLoading, router]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !profileLoading) {
      router.push('/login');
    }
  }, [user, profileLoading, router]);

  // Handle password creation completion
  const handlePasswordCreated = async () => {
    logger.info('[ProfileSetup] Password created, proceeding to role selection');
    setStep('select-type');
  };

  // Handle password creation skip
  const handlePasswordSkipped = async () => {
    logger.info('[ProfileSetup] Password creation skipped, proceeding to role selection');
    setStep('select-type');
  };

  // Handle user type selection
  const handleUserTypeSelected = async (userType: string) => {
    logger.info('[ProfileSetup] User type selected:', { userType });
    setSelectedUserType(userType);
    setStep('fill-profile');
  };

  // Handle profile form completion
  const handleProfileComplete = async () => {
    logger.info('[ProfileSetup] Profile setup complete');
    setStep('complete');

    // Reload profile to get updated data
    await reload();

    // Redirect to dashboard after a short delay
    setTimeout(() => {
      router.push('/dashboard?setup=complete');
    }, 1500);
  };

  // Loading state
  if (profileLoading || !user || checkingPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
          <p className="text-gray-300">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Welcome Message */}
        {showWelcome && (step === 'create-password' || step === 'select-type') && (
          <div className="mb-8 relative bg-gradient-to-br from-blue-900/30 via-blue-800/20 to-blue-900/30 backdrop-blur-sm border border-blue-500/50 rounded-lg p-6 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="relative">
              <h2 className="text-2xl font-bold text-white mb-2">
                ¡Bienvenido a Deserve! 🎉
              </h2>
              <p className="text-blue-200">
                Para comenzar, necesitamos saber un poco más sobre ti.
                Esto nos ayudará a personalizar tu experiencia.
              </p>
            </div>
          </div>
        )}

        {/* Progress Steps - Dynamic based on whether password step is needed */}
        <div className="mb-8 flex items-center justify-center gap-4">
          {needsPassword && (
            <>
              <div className={`flex items-center gap-2 ${step === 'create-password' ? 'text-blue-400' : step === 'select-type' || step === 'fill-profile' || step === 'complete' ? 'text-green-400' : 'text-gray-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step === 'create-password'
                    ? 'border-blue-400 bg-blue-400/20'
                    : step === 'select-type' || step === 'fill-profile' || step === 'complete'
                    ? 'border-green-400 bg-green-400/20'
                    : 'border-gray-600 bg-gray-800'
                }`}>
                  {step === 'create-password' ? '1' : '✓'}
                </div>
                <span className="hidden sm:inline font-medium text-xs">Contraseña</span>
              </div>
              <div className="h-px w-8 bg-gray-700"></div>
            </>
          )}

          <div className={`flex items-center gap-2 ${step === 'select-type' ? 'text-blue-400' : step === 'fill-profile' || step === 'complete' ? 'text-green-400' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              step === 'select-type'
                ? 'border-blue-400 bg-blue-400/20'
                : step === 'fill-profile' || step === 'complete'
                ? 'border-green-400 bg-green-400/20'
                : 'border-gray-600 bg-gray-800'
            }`}>
              {step === 'fill-profile' || step === 'complete' ? '✓' : needsPassword ? '2' : '1'}
            </div>
            <span className="hidden sm:inline font-medium text-xs">Tipo</span>
          </div>

          <div className="h-px w-8 bg-gray-700"></div>

          <div className={`flex items-center gap-2 ${step === 'fill-profile' ? 'text-blue-400' : step === 'complete' ? 'text-green-400' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              step === 'fill-profile'
                ? 'border-blue-400 bg-blue-400/20'
                : step === 'complete'
                ? 'border-green-400 bg-green-400/20'
                : 'border-gray-600 bg-gray-800'
            }`}>
              {step === 'complete' ? '✓' : needsPassword ? '3' : '2'}
            </div>
            <span className="hidden sm:inline font-medium text-xs">Información</span>
          </div>

          <div className="h-px w-8 bg-gray-700"></div>

          <div className={`flex items-center gap-2 ${step === 'complete' ? 'text-green-400' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              step === 'complete' ? 'border-green-400 bg-green-400/20' : 'border-gray-600 bg-gray-800'
            }`}>
              ✓
            </div>
            <span className="hidden sm:inline font-medium text-xs">Completo</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>

          <div className="relative p-8">
            {/* Step 0: Create Password (for magic link users) */}
            {step === 'create-password' && (
              <div>
                <PasswordCreationForm
                  onComplete={handlePasswordCreated}
                  onSkip={handlePasswordSkipped}
                />
              </div>
            )}

            {/* Step 1: Select User Type */}
            {step === 'select-type' && (
              <div>
                <h1 className="text-3xl font-bold text-white mb-6">
                  Selecciona tu Tipo de Usuario
                </h1>
                <RoleSelector onSelect={handleUserTypeSelected} />
              </div>
            )}

            {/* Step 2: Fill Profile */}
            {step === 'fill-profile' && selectedUserType && (
              <div>
                <div className="mb-6">
                  <button
                    onClick={() => {
                      setStep('select-type');
                      setSelectedUserType(null);
                    }}
                    className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Volver
                  </button>
                </div>

                <h1 className="text-3xl font-bold text-white mb-6">
                  Completa tu Perfil
                </h1>

                {/* Show appropriate form based on user type */}
                {(selectedUserType === 'player') && (
                  <AthleticProfileForm onComplete={handleProfileComplete} />
                )}

                {(selectedUserType === 'manager' || selectedUserType === 'athletic_director') && (
                  <ManagerProfileForm onComplete={handleProfileComplete} />
                )}

                {selectedUserType === 'hybrid' && (
                  <div className="space-y-6">
                    <div className="relative bg-gradient-to-br from-yellow-900/30 via-yellow-800/20 to-yellow-900/30 backdrop-blur-sm border border-yellow-500/50 rounded-lg p-4 overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                      <p className="relative text-yellow-200 text-sm">
                        Como usuario híbrido, podrás llenar ambos perfiles después.
                        Por ahora, comencemos con tu perfil atlético.
                      </p>
                    </div>
                    <AthleticProfileForm onComplete={handleProfileComplete} />
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Complete */}
            {step === 'complete' && (
              <div className="text-center py-12">
                <div className="inline-block mb-6">
                  <div className="w-20 h-20 rounded-full bg-green-500/20 border-4 border-green-500 flex items-center justify-center">
                    <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">
                  ¡Perfil Completado! ✨
                </h2>
                <p className="text-gray-300 mb-6">
                  Redirigiendo a tu panel de control...
                </p>
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}
          </div>
        </div>

        {/* Skip Button (only on type selection, not on password step) */}
        {step === 'select-type' && (
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Omitir por ahora (podrás completar tu perfil después)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
