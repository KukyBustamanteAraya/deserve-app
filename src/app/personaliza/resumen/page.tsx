'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBuilderState } from '@/hooks/useBuilderState';
import { getBrowserClient } from '@/lib/supabase/client';
import { CustomizeBanner } from '@/components/customize/CustomizeBanner';
import { TeamSetupModal, type TeamSetupData } from '@/components/team/TeamSetupModal';
import { TeamSelectionModal } from '@/components/team/TeamSelectionModal';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

export default function ResumenPage() {
  const router = useRouter();
  const {
    teamColors,
    selectedDesign,
    selectedApparel,
    userType,
    uniformDetails,
    logoPlacements,
    namesNumbers,
    logoUrl,
    teamName,
  } = useBuilderState();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [email, setEmail] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [showTeamSetup, setShowTeamSetup] = useState(false);
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);

  const supabase = getBrowserClient();

  // Check auth status
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
      setUser(user);
    });
  }, [supabase.auth]);

  // Apply CSS variables for gradient
  useEffect(() => {
    document.documentElement.style.setProperty('--brand-primary', teamColors.primary);
    document.documentElement.style.setProperty('--brand-secondary', teamColors.secondary);
    document.documentElement.style.setProperty('--brand-accent', teamColors.accent);
  }, [teamColors]);

  // Redirect if no design or user type selected
  useEffect(() => {
    if (!selectedDesign || !userType) {
      router.push('/personaliza');
    }
  }, [selectedDesign, userType, router]);

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!email) {
      setAuthError('Por favor ingresa tu email');
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/personaliza/resumen`,
        },
      });

      if (error) throw error;

      alert('¡Link mágico enviado! Revisa tu email para continuar.');
      setShowAuthModal(false);
    } catch (error: any) {
      logger.error('Error sending magic link:', toError(error));
      setAuthError(error.message || 'Error al enviar el link. Intenta de nuevo.');
    }
  };

  const handleTeamSetupComplete = async (setupData: TeamSetupData) => {
    if (!createdTeamId || !user || !selectedTeam) return;

    try {
      // Update team with type and sports
      const { error: teamError } = await supabase
        .from('teams')
        .update({
          team_type: setupData.teamType,
          sports: setupData.sports,
          setup_completed: true,
        })
        .eq('id', createdTeamId);

      if (teamError) throw teamError;

      // Now submit the design request with the newly setup team
      await submitDesignRequest(selectedTeam);
    } catch (error: any) {
      logger.error('Error completing team setup:', toError(error));
      throw error;
    }
  };

  const handleSubmit = async () => {
    // Check if user is authenticated
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // Show team selection modal
    setShowTeamSelection(true);
  };

  const handleTeamSelected = (team: any) => {
    setSelectedTeam(team);
    setShowTeamSelection(false);
    // Proceed with design request submission
    submitDesignRequest(team);
  };

  const handleCreateNewTeam = async () => {
    // Close team selection modal
    setShowTeamSelection(false);

    // Create new team
    try {
      const teamSlug = `${teamName.toLowerCase().replace(/\s+/g, '-')}-${user.id.substring(0, 8)}`;

      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({
          slug: teamSlug,
          name: teamName,
          owner_id: user.id,
          current_owner_id: user.id,
          created_by: user.id,
          sport: selectedDesign?.sport || 'general',
          colors: {
            primary: teamColors.primary,
            secondary: teamColors.secondary,
            accent: teamColors.accent,
          },
          logo_url: logoUrl,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('team_memberships')
        .insert({
          team_id: newTeam.id,
          user_id: user.id,
          role_type: 'owner',
        });

      if (memberError) throw memberError;

      // Set created team for setup modal
      setCreatedTeamId(newTeam.id);
      setSelectedTeam(newTeam);
      setShowTeamSetup(true);
    } catch (error: any) {
      logger.error('Error creating new team:', toError(error));
      alert(`Error al crear equipo: ${error.message}`);
    }
  };

  const handleJoinTeam = async (teamSlug: string) => {
    if (!user) throw new Error('Usuario no autenticado');

    try {
      // Find the team by slug
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('slug', teamSlug)
        .single();

      if (teamError || !team) {
        throw new Error('Equipo no encontrado. Verifica el código e intenta de nuevo.');
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('team_memberships')
        .select('id')
        .eq('team_id', team.id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        // Already a member, just proceed
        setSelectedTeam(team);
        setShowTeamSelection(false);
        await submitDesignRequest(team);
        return;
      }

      // Add user as member
      const { error: memberError } = await supabase
        .from('team_memberships')
        .insert({
          team_id: team.id,
          user_id: user.id,
          role_type: 'member', // Default role when joining
        });

      if (memberError) throw memberError;

      // Success! Proceed with design request
      setSelectedTeam(team);
      setShowTeamSelection(false);
      await submitDesignRequest(team);
    } catch (error: any) {
      logger.error('Error joining team:', toError(error));
      throw new Error(error.message || 'Error al unirse al equipo');
    }
  };

  const submitDesignRequest = async (team: any) => {
    if (!user || !team) return;

    setIsSubmitting(true);

    try {
      const teamSlug = team.slug;

      // Ensure customer record exists (upsert to handle both cases)
      await supabase
        .from('customers')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || null,
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      // Ensure profile record exists (needed for requested_by foreign key)
      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || null,
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      // Create an order for this design request (for payment tracking)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          customer_id: user.id,
          team_id: team.id,
          status: 'pending',
          total_amount_cents: 50000, // Test amount: CLP $500
          payment_status: 'unpaid',
          notes: `Order for ${selectedDesign?.name} design request`,
        })
        .select()
        .single();

      if (orderError) {
        logger.error('[Resumen] Order creation error:', orderError);
        throw orderError;
      }

      // Create design request linked to team and order
      logger.debug('[Resumen] Creating design request:', { teamId: team.id, teamSlug });
      const { data: designRequest, error: designError } = await supabase
        .from('design_requests')
        .insert({
          user_id: user.id,
          requested_by: user.id,
          team_id: team.id,
          order_id: order.id,
          team_slug: teamSlug,
          product_slug: selectedDesign?.slug,
          product_name: selectedDesign?.name,
          sport_slug: selectedDesign?.sport,
          primary_color: teamColors.primary,
          secondary_color: teamColors.secondary,
          accent_color: teamColors.accent,
          selected_apparel: selectedApparel,
          user_type: userType,
          uniform_details: uniformDetails,
          logo_url: logoUrl,
          logo_placements: logoPlacements,
          names_numbers: namesNumbers,
          status: 'pending',
        })
        .select()
        .single();

      if (designError) throw designError;
      logger.debug('[Resumen] Design request created successfully:', { requestId: designRequest.id, teamId: designRequest.team_id });

      // Auto-trigger mockup generation in background (fire-and-forget)
      // Don't await - let it process while user views team page
      if (selectedDesign?.images?.[0]) {
        const templateUrl = selectedDesign.images[0];
        logger.debug('[Resumen] Triggering recolor with template:', { templateUrl });

        fetch('/api/recolor-boundary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            designRequestId: designRequest.id,
            baseUrl: templateUrl,
            colors: {
              primary: teamColors.primary,
              secondary: teamColors.secondary,
              tertiary: teamColors.accent,
            },
            n: 1,
          }),
        }).catch((err) => {
          logger.error('Background recolor failed:', toError(err));
          // Don't block the user flow - admin can regenerate if needed
        });
      }

      // Navigate to team page
      router.push(`/mi-equipo`);
    } catch (error: any) {
      logger.error('Error submitting design request', toError(error));
      logger.error('Full error details', { errorJson: JSON.stringify(error, null, 2) });
      alert(`Error al enviar la solicitud: ${error.message || 'Intenta de nuevo'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedDesign || !userType) {
    return null; // Will redirect
  }

  const selectedApparelItems = Object.entries(selectedApparel)
    .filter(([, selected]) => selected)
    .map(([key]) => key);

  const logoPlacementsList = Object.entries(logoPlacements)
    .filter(([, selected]) => selected)
    .map(([key]) => {
      const labels: Record<string, string> = {
        front: 'Frontal',
        back: 'Posterior',
        sleeveLeft: 'Manga izquierda',
        sleeveRight: 'Manga derecha',
      };
      return labels[key] || key;
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <CustomizeBanner />

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-4 pb-32 pt-64">
        {/* Summary */}
        <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 mb-4">
          <h2 className="text-xl font-bold text-white mb-4">Tu diseño personalizado</h2>

          {/* Design */}
          <div className="mb-4 pb-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-gray-200 mb-2">Diseño seleccionado</h3>
            <p className="text-base text-white font-medium">{selectedDesign.name}</p>
            <p className="text-sm text-gray-300 capitalize">{selectedDesign.sport}</p>
          </div>

          {/* Colors */}
          <div className="mb-4 pb-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-gray-200 mb-3">Colores del equipo</h3>
            <div className="flex gap-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded border-2"
                  style={{
                    backgroundColor: teamColors.primary,
                    borderColor: teamColors.primary
                  }}
                />
                <span className="text-sm text-gray-300">Primario</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded border-2"
                  style={{
                    backgroundColor: teamColors.secondary,
                    borderColor: teamColors.secondary
                  }}
                />
                <span className="text-sm text-gray-300">Secundario</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded border-2"
                  style={{
                    backgroundColor: teamColors.accent,
                    borderColor: teamColors.accent
                  }}
                />
                <span className="text-sm text-gray-300">Acento</span>
              </div>
            </div>
          </div>

          {/* Apparel */}
          <div className="mb-4 pb-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-gray-200 mb-2">Artículos seleccionados</h3>
            <div className="flex flex-wrap gap-2">
              {selectedApparelItems.map((item) => (
                <span
                  key={item}
                  className="px-3 py-1 text-sm rounded-full capitalize font-medium"
                  style={{
                    backgroundColor: `${teamColors.primary}20`,
                    color: teamColors.primary
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* User Type */}
          <div className="mb-4 pb-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-gray-200 mb-2">Tipo de usuario</h3>
            <p className="text-white text-sm">
              {userType === 'player' ? 'Jugador / Capitán' : 'Entrenador / Administrador'}
            </p>
          </div>

          {/* Uniform Details */}
          <div className="mb-4 pb-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-gray-200 mb-2">Detalles del uniforme</h3>
            <ul className="text-white space-y-1 text-sm">
              <li>• Manga: {uniformDetails.sleeve === 'short' ? 'Corta' : 'Larga'}</li>
              <li>• Cuello: {uniformDetails.neck === 'crew' ? 'Redondo' : uniformDetails.neck === 'v' ? 'V' : 'Polo'}</li>
              <li>• Ajuste: {uniformDetails.fit === 'athletic' ? 'Atlético' : 'Holgado'}</li>
            </ul>
          </div>

          {/* Logo Placements */}
          {logoPlacementsList.length > 0 && (
            <div className="mb-4 pb-4 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-gray-200 mb-2">Posiciones del logo</h3>
              <ul className="text-white space-y-1 text-sm">
                {logoPlacementsList.map((placement) => (
                  <li key={placement}>• {placement}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Names and Numbers */}
          <div className="mb-0">
            <h3 className="text-sm font-semibold text-gray-200 mb-2">Nombres y números</h3>
            <p className="text-white text-sm">
              {namesNumbers ? 'Sí, con personalización' : 'No, sin personalización'}
            </p>
          </div>
        </div>

      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-14 left-0 right-0 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border-t border-gray-700 shadow-2xl z-40">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <button
              onClick={() => router.back()}
              className="px-6 py-3 text-gray-200 hover:text-white font-medium transition-colors flex-shrink-0"
            >
              ← Volver
            </button>

            <div className="flex-1 flex flex-col items-end gap-2">
              {user ? (
                <p className="text-xs text-gray-400">Conectado como: {user.email}</p>
              ) : (
                <p className="text-xs text-gray-300">
                  {user ? 'Envía tu solicitud' : 'Inicia sesión para continuar'}
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 shadow-2xl ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'hover:shadow-2xl hover:opacity-90'
                }`}
                style={!isSubmitting ? {
                  background: `linear-gradient(135deg, ${teamColors.primary}, ${teamColors.accent})`
                } : {}}
              >
                {isSubmitting ? 'Enviando...' : user ? 'Enviar solicitud de diseño' : 'Continuar con email'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Continuar con email</h2>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-300 mb-4">
              Te enviaremos un link mágico para iniciar sesión sin contraseña
            </p>

            <form onSubmit={handleSendMagicLink}>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-700 rounded-lg focus:ring-2 focus:border-transparent text-sm"
                  style={{
                    outline: `2px solid ${teamColors.primary}`
                  }}
                  placeholder="tu@email.com"
                  required
                />
              </div>

              {authError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-6 text-white font-semibold rounded-lg transition-colors shadow-2xl hover:shadow-2xl hover:opacity-90"
                style={{
                  background: `linear-gradient(135deg, ${teamColors.primary}, ${teamColors.accent})`
                }}
              >
                Enviar link mágico
              </button>
            </form>

            <p className="text-xs text-gray-400 mt-4 text-center">
              Al continuar, aceptas recibir un email de autenticación
            </p>
          </div>
        </div>
      )}

      {/* Team Selection Modal */}
      <TeamSelectionModal
        isOpen={showTeamSelection}
        onClose={() => setShowTeamSelection(false)}
        onTeamSelected={handleTeamSelected}
        onCreateNew={handleCreateNewTeam}
        onJoinTeam={handleJoinTeam}
        userId={user?.id || ''}
        preSelectedSport={selectedDesign?.sport}
      />

      {/* Team Setup Modal */}
      <TeamSetupModal
        isOpen={showTeamSetup}
        onComplete={handleTeamSetupComplete}
        preSelectedSport={selectedDesign?.sport}
      />
    </div>
  );
}
