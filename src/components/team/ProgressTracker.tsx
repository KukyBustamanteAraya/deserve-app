'use client';

import { useEffect, useState, memo } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { CompletionBar } from './CompletionBar';

type TeamBranding = {
  primary_color?: string;
  secondary_color?: string;
  tertiary_color?: string;
};

type ProgressTrackerProps = {
  teamId: string;
  designRequestId?: number;
  branding?: TeamBranding;
  teamSlug?: string;
  onShareDesign?: () => void;
  isManager?: boolean;
};

type ProgressStats = {
  sportSelected: boolean;
  designsSelected: number;
  designPersonalized: boolean;
  teamHasLogo: boolean;
  teamHasColors: boolean;
  designShared: boolean;
  playersSubmitted: number;
  totalMembers: number;
  allPlayersPaid: boolean;
  inManufacturing: boolean;
  inShipping: boolean;
  delivered: boolean;
};

const ProgressTracker = memo(function ProgressTracker({ teamId, designRequestId, branding, teamSlug, onShareDesign, isManager }: ProgressTrackerProps) {
  const router = useRouter();
  const [stats, setStats] = useState<ProgressStats>({
    sportSelected: false,
    designsSelected: 0,
    designPersonalized: false,
    teamHasLogo: false,
    teamHasColors: false,
    designShared: false,
    playersSubmitted: 0,
    totalMembers: 0,
    allPlayersPaid: false,
    inManufacturing: false,
    inShipping: false,
    delivered: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProgress() {
      try {
        const supabase = getBrowserClient();

        // Get team info
        const { data: team } = await supabase
          .from('teams')
          .select('sport_id')
          .eq('id', teamId)
          .single();

        const sportSelected = !!team?.sport_id;

        // Get team settings (logo and colors)
        const { data: settings } = await supabase
          .from('team_settings')
          .select('primary_color, secondary_color, tertiary_color, logo_url')
          .eq('team_id', teamId)
          .single();

        const teamHasColors = !!(settings?.primary_color);
        const teamHasLogo = !!(settings?.logo_url);

        // Check design requests count
        const { count: designCount } = await supabase
          .from('design_requests')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', teamId);

        const designsSelected = designCount || 0;

        // Check if design is personalized (has mockups/customizations)
        let designPersonalized = false;
        if (designRequestId) {
          const { data: designRequest } = await supabase
            .from('design_requests')
            .select('mockup_urls')
            .eq('id', designRequestId)
            .single();

          designPersonalized = !!(designRequest?.mockup_urls && designRequest.mockup_urls.length > 0);
        } else if (designsSelected > 0) {
          // Check if any design has mockups
          const { data: anyDesignWithMockup } = await supabase
            .from('design_requests')
            .select('mockup_urls')
            .eq('team_id', teamId)
            .not('mockup_urls', 'is', null)
            .limit(1)
            .single();

          designPersonalized = !!(anyDesignWithMockup?.mockup_urls && anyDesignWithMockup.mockup_urls.length > 0);
        }

        // Check if design has been shared (collection link created)
        const { data: teamSettings } = await supabase
          .from('team_settings')
          .select('info_collection_token')
          .eq('team_id', teamId)
          .single();

        const designShared = !!teamSettings?.info_collection_token;

        // Count total players in the team (from player_info_submissions table)
        // This represents all players who are registered on the roster
        const { count: totalPlayersCount } = await supabase
          .from('player_info_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', teamId);

        // Count players who have submitted their complete info
        // For now, all records in player_info_submissions have complete info (name + size required)
        const { count: playersSubmittedCount } = await supabase
          .from('player_info_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', teamId);

        // Check if all players have paid
        // Get all orders for this team
        const { data: orders } = await supabase
          .from('orders')
          .select('id, total_amount_clp, payment_status, status')
          .eq('team_id', teamId);

        // Check if all orders are fully paid
        let allPlayersPaid = false;
        if (orders && orders.length > 0) {
          allPlayersPaid = orders.every((order: any) => order.payment_status === 'paid');
        }

        // Check production stages based on order status
        let inManufacturing = false;
        let inShipping = false;
        let delivered = false;

        if (orders && orders.length > 0 && allPlayersPaid) {
          // Check if any order is in manufacturing/production
          inManufacturing = orders.some((order: any) =>
            order.status === 'processing' ||
            order.status === 'shipped' ||
            order.status === 'delivered'
          );

          // Check if any order is in shipping
          inShipping = orders.some((order: any) =>
            order.status === 'shipped' ||
            order.status === 'delivered'
          );

          // Check if all orders are delivered
          delivered = orders.every((order: any) => order.status === 'delivered');
        }

        setStats({
          sportSelected,
          designsSelected,
          designPersonalized,
          teamHasLogo,
          teamHasColors,
          designShared,
          playersSubmitted: playersSubmittedCount || 0,
          totalMembers: totalPlayersCount || 0, // Now counting total players, not team members
          allPlayersPaid,
          inManufacturing,
          inShipping,
          delivered,
        });
      } catch (error) {
        console.error('Error loading progress:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProgress();
  }, [teamId, designRequestId]);

  // Calculate overall completion percentage (7 total steps for manager-only flow)
  const calculateCompletion = () => {
    const totalSteps = 7;
    let completedSteps = 0;

    // Setup phase (1 step) - Always complete if team exists
    if (stats.sportSelected) completedSteps++; // Team is created with sport

    // Team Building phase (2 steps)
    if (stats.playersSubmitted > 0) completedSteps++; // Players added
    if (stats.designsSelected > 0) completedSteps++; // Design created

    // Order phase (2 steps)
    if (stats.designShared) completedSteps++; // Collection link shared
    if (stats.allPlayersPaid) completedSteps++; // Payment complete

    // Production phase (2 steps)
    if (stats.inShipping) completedSteps++; // In shipping
    if (stats.delivered) completedSteps++; // Delivered

    return Math.round((completedSteps / totalSteps) * 100);
  };

  // Determine current phase based on progress
  const setupComplete = stats.sportSelected; // Team created with sport
  const buildingComplete = stats.playersSubmitted > 0 && stats.designsSelected > 0;
  const orderPhaseComplete = stats.designShared && stats.allPlayersPaid;
  const productionPhaseComplete = stats.delivered;

  const currentPhase = productionPhaseComplete ? 'completed' :
                      orderPhaseComplete ? 'production' :
                      buildingComplete ? 'order' :
                      setupComplete ? 'building' :
                      'setup';

  if (loading) {
    return (
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 animate-pulse overflow-hidden">
        <div className="h-8 bg-gray-700/50 rounded mb-4"></div>
        <div className="h-4 bg-gray-700/50 rounded mb-6"></div>
        <div className="grid grid-cols-5 gap-2">
          <div className="h-20 bg-gray-700/50 rounded"></div>
          <div className="h-20 bg-gray-700/50 rounded"></div>
          <div className="h-20 bg-gray-700/50 rounded"></div>
          <div className="h-20 bg-gray-700/50 rounded"></div>
          <div className="h-20 bg-gray-700/50 rounded"></div>
        </div>
      </div>
    );
  }

  const completion = calculateCompletion();
  const primaryColor = branding?.primary_color || '#e21c21';
  const secondaryColor = branding?.secondary_color || '#ffffff';
  const tertiaryColor = branding?.tertiary_color || '#0b0b0c';

  // Convert hex to rgba for styling
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Helper component: Action Button Card
  const ActionButtonCard = ({
    label,
    onClick,
    variant = 'primary',
    disabled = false
  }: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'success';
    disabled?: boolean;
  }) => {
    const variantClasses = {
      primary: 'bg-gradient-to-br from-blue-600/90 via-blue-700/80 to-blue-800/90 border-blue-600/50 hover:shadow-lg hover:shadow-blue-600/30',
      secondary: 'bg-gradient-to-br from-gray-700/90 via-gray-800/80 to-gray-900/90 border-gray-600/50 hover:shadow-lg hover:shadow-gray-600/30',
      success: 'bg-gradient-to-br from-green-600/90 via-green-700/80 to-green-800/90 border-green-600/50 hover:shadow-lg hover:shadow-green-600/30'
    }[variant];

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`relative w-full px-3 py-2 text-white rounded-lg text-xs font-medium overflow-hidden border transition-all ${variantClasses} ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>
        <span className="relative">{label}</span>
      </button>
    );
  };

  // Helper component: Collapsed Macro Step (completed phase) - Match active step size
  const CollapsedMacroStep = ({ label, color, icon }: { label: string; color: string; icon: string }) => {
    const colorClasses = ({
      green: {
        bg: 'bg-gradient-to-br from-green-900/30 via-green-800/20 to-green-900/30 border-green-500/50',
        badge: 'bg-green-500 border-green-400',
        text: 'text-green-400'
      },
      blue: {
        bg: 'bg-gradient-to-br from-blue-900/30 via-blue-800/20 to-blue-900/30 border-blue-500/50',
        badge: 'bg-blue-500 border-blue-400',
        text: 'text-blue-400'
      },
      purple: {
        bg: 'bg-gradient-to-br from-purple-900/30 via-purple-800/20 to-purple-900/30 border-purple-500/50',
        badge: 'bg-purple-500 border-purple-400',
        text: 'text-purple-400'
      }
    } as Record<string, { bg: string; badge: string; text: string }>)[color] || {
      bg: 'bg-gradient-to-br from-gray-900/30 via-gray-800/20 to-gray-900/30 border-gray-500/50',
      badge: 'bg-gray-500 border-gray-400',
      text: 'text-gray-400'
    };

    return (
      <div className={`relative rounded-lg p-3 py-8 border overflow-hidden group/step transition-all ${colorClasses.bg}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/step:opacity-100 transition-opacity pointer-events-none"></div>
        <div className="flex flex-col items-center gap-2 relative">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full border ${colorClasses.badge}`}>
            <span className="text-base font-bold text-white">✓</span>
          </div>
          <span className={`text-xs font-medium text-center ${colorClasses.text}`}>{label}</span>
        </div>
      </div>
    );
  };

  // Helper component: Locked Macro Step (upcoming phase) - Match active step size
  const LockedMacroStep = ({ label, stepNumber }: { label: string; stepNumber: number }) => {
    return (
      <div className="relative rounded-lg p-3 py-8 border overflow-hidden transition-all bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border-gray-700 opacity-60">
        <div className="flex flex-col items-center gap-2 relative">
          <div className="flex items-center justify-center w-8 h-8 rounded-full border bg-black/40 border-gray-600">
            {/* Empty circle - no number */}
          </div>
          <span className="text-xs font-medium text-center text-gray-500">{label}</span>
        </div>
      </div>
    );
  };

  // Render functions for each phase
  const renderSetupPhaseExpanded = () => {
    return (
      <>
        {/* Step 1: Team Created (always complete in this phase) */}
        <div className="flex flex-col gap-2">
          <div className="relative rounded-lg p-3 py-8 border overflow-hidden group/step transition-all bg-gradient-to-br from-green-900/30 via-green-800/20 to-green-900/30 border-green-500/50">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/step:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="flex flex-col items-center gap-2 relative">
              <div className="flex items-center justify-center w-8 h-8 rounded-full border bg-green-500 border-green-400">
                <span className="text-base font-bold text-white">✓</span>
              </div>
              <span className="text-xs font-medium text-center text-green-400">
                Equipo Creado
              </span>
            </div>
          </div>
        </div>

        {/* Locked: Building */}
        <LockedMacroStep label="Jugadores & Diseño" stepNumber={2} />

        {/* Locked: Order */}
        <LockedMacroStep label="Pedido" stepNumber={3} />

        {/* Locked: Production */}
        <LockedMacroStep label="Producción" stepNumber={4} />
      </>
    );
  };

  const renderBuildingPhaseExpanded = () => {
    const jugadoresComplete = stats.playersSubmitted > 0;
    const disenoComplete = stats.designsSelected > 0;

    return (
      <>
        {/* Collapsed: Setup */}
        <CollapsedMacroStep label="Setup" color="green" icon="✓" />

        {/* Step 1: Players */}
        <div className="flex flex-col gap-2">
          <div className={`relative rounded-lg p-3 border overflow-hidden group/step transition-all ${
            jugadoresComplete ? 'py-8' : ''
          } ${
            stats.playersSubmitted > 0
              ? 'bg-gradient-to-br from-green-900/30 via-green-800/20 to-green-900/30 border-green-500/50'
              : 'bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border-gray-700'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/step:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="flex flex-col items-center gap-2 relative">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border ${
                stats.playersSubmitted > 0 ? 'bg-green-500 border-green-400' : 'bg-black/40 border-gray-600'
              }`}>
                <span className={`text-base font-bold ${stats.playersSubmitted > 0 ? 'text-white' : 'text-gray-400'}`}>
                  {stats.playersSubmitted > 0 ? '✓' : '1'}
                </span>
              </div>
              <span className={`text-xs font-medium text-center ${stats.playersSubmitted > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                {stats.playersSubmitted > 0 ? `${stats.playersSubmitted} Jugador${stats.playersSubmitted > 1 ? 'es' : ''}` : 'Jugadores'}
              </span>
            </div>
          </div>
          {isManager && teamSlug && stats.playersSubmitted === 0 && (
            <ActionButtonCard
              label="Agregar"
              onClick={() => router.push(`/mi-equipo/${teamSlug}/players`)}
              variant="primary"
            />
          )}
        </div>

        {/* Step 2: Design */}
        <div className="flex flex-col gap-2">
          <div className={`relative rounded-lg p-3 border overflow-hidden group/step transition-all ${
            disenoComplete ? 'py-8' : ''
          } ${
            stats.designsSelected > 0
              ? 'bg-gradient-to-br from-green-900/30 via-green-800/20 to-green-900/30 border-green-500/50'
              : 'bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border-gray-700'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/step:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="flex flex-col items-center gap-2 relative">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border ${
                stats.designsSelected > 0 ? 'bg-green-500 border-green-400' : 'bg-black/40 border-gray-600'
              }`}>
                <span className={`text-base font-bold ${stats.designsSelected > 0 ? 'text-white' : 'text-gray-400'}`}>
                  {stats.designsSelected > 0 ? '✓' : '2'}
                </span>
              </div>
              <span className={`text-xs font-medium text-center ${stats.designsSelected > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                {stats.designsSelected > 0 ? `${stats.designsSelected} Diseño${stats.designsSelected > 1 ? 's' : ''}` : 'Diseño'}
              </span>
            </div>
          </div>
          {isManager && teamSlug && stats.designsSelected === 0 && (
            <ActionButtonCard
              label="Crear"
              onClick={() => router.push(`/mi-equipo/${teamSlug}/design-request/new`)}
              variant="primary"
            />
          )}
        </div>

        {/* Locked: Order */}
        <LockedMacroStep label="Pedido" stepNumber={3} />

        {/* Locked: Production */}
        <LockedMacroStep label="Producción" stepNumber={4} />
      </>
    );
  };

  const renderOrderPhaseExpanded = () => {
    // Check if steps are complete and have no button (should grow to match card+button height)
    const compartidoComplete = stats.designShared;
    const pagadoComplete = stats.allPlayersPaid;

    return (
      <>
        {/* Collapsed: Setup */}
        <CollapsedMacroStep label="Setup" color="green" icon="✓" />

        {/* Collapsed: Building */}
        <CollapsedMacroStep label="Equipo" color="green" icon="✓" />

        {/* Step 1: Design Shared */}
        <div className="flex flex-col gap-2">
          <div className={`relative rounded-lg p-3 border overflow-hidden group/step transition-all ${
            compartidoComplete ? 'py-8' : ''
          } ${
            stats.designShared
              ? 'bg-gradient-to-br from-blue-900/30 via-blue-800/20 to-blue-900/30 border-blue-500/50'
              : 'bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border-gray-700'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/step:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="flex flex-col items-center gap-2 relative">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border ${
                stats.designShared ? 'bg-blue-500 border-blue-400' : 'bg-black/40 border-gray-600'
              }`}>
                <span className={`text-base font-bold ${stats.designShared ? 'text-white' : 'text-gray-400'}`}>
                  {stats.designShared ? '✓' : '1'}
                </span>
              </div>
              <span className={`text-xs font-medium text-center ${stats.designShared ? 'text-blue-400' : 'text-gray-400'}`}>
                Compartido
              </span>
            </div>
          </div>
          {onShareDesign && (
            <ActionButtonCard
              label={stats.designShared ? "Ver Enlace" : "Compartir"}
              onClick={onShareDesign}
              variant="primary"
            />
          )}
        </div>

        {/* Step 2: Payment */}
        <div className="flex flex-col gap-2">
          <div className={`relative rounded-lg p-3 border overflow-hidden group/step transition-all ${
            pagadoComplete ? 'py-8' : ''
          } ${
            stats.allPlayersPaid
              ? 'bg-gradient-to-br from-blue-900/30 via-blue-800/20 to-blue-900/30 border-blue-500/50'
              : 'bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border-gray-700'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/step:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="flex flex-col items-center gap-2 relative">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border ${
                stats.allPlayersPaid ? 'bg-blue-500 border-blue-400' : 'bg-black/40 border-gray-600'
              }`}>
                <span className={`text-base font-bold ${stats.allPlayersPaid ? 'text-white' : 'text-gray-400'}`}>
                  {stats.allPlayersPaid ? '✓' : '2'}
                </span>
              </div>
              <span className={`text-xs font-medium text-center ${stats.allPlayersPaid ? 'text-blue-400' : 'text-gray-400'}`}>
                Pagado
              </span>
            </div>
          </div>
          {teamSlug && !stats.allPlayersPaid && (
            <ActionButtonCard
              label="Gestionar"
              onClick={() => router.push(`/mi-equipo/${teamSlug}/payments`)}
              variant="primary"
            />
          )}
        </div>

        {/* Locked: Producción */}
        <LockedMacroStep label="Producción" stepNumber={3} />
      </>
    );
  };

  const renderProductionPhaseExpanded = () => {
    // Check if steps are complete and have no button (should grow to match card+button height)
    const envioComplete = stats.inShipping;
    const entregadoComplete = stats.delivered;

    return (
      <>
        {/* Collapsed: Setup */}
        <CollapsedMacroStep label="Setup" color="green" icon="✓" />

        {/* Collapsed: Building */}
        <CollapsedMacroStep label="Equipo" color="green" icon="✓" />

        {/* Collapsed: Order */}
        <CollapsedMacroStep label="Pedido" color="blue" icon="✓" />

        {/* Step 1: Shipping */}
        <div className="flex flex-col gap-2">
          <div className={`relative rounded-lg p-3 border overflow-hidden group/step transition-all ${
            envioComplete ? 'py-8' : ''
          } ${
            stats.inShipping
              ? 'bg-gradient-to-br from-purple-900/30 via-purple-800/20 to-purple-900/30 border-purple-500/50'
              : 'bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border-gray-700'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/step:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="flex flex-col items-center gap-2 relative">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border ${
                stats.inShipping ? 'bg-purple-500 border-purple-400' : 'bg-black/40 border-gray-600'
              }`}>
                <span className={`text-base font-bold ${stats.inShipping ? 'text-white' : 'text-gray-400'}`}>
                  {stats.inShipping ? '✓' : '1'}
                </span>
              </div>
              <span className={`text-xs font-medium text-center ${stats.inShipping ? 'text-purple-400' : 'text-gray-400'}`}>
                Envío
              </span>
            </div>
          </div>
          {teamSlug && stats.inShipping && !stats.delivered && (
            <ActionButtonCard
              label="Rastrear"
              onClick={() => router.push(`/mi-equipo/${teamSlug}/payments`)}
              variant="secondary"
            />
          )}
        </div>

        {/* Step 2: Delivered - Always grown (never has button) */}
        <div className="flex flex-col gap-2">
          <div className={`relative rounded-lg p-3 py-8 border overflow-hidden group/step transition-all ${
            stats.delivered
              ? 'bg-gradient-to-br from-purple-900/30 via-purple-800/20 to-purple-900/30 border-purple-500/50'
              : 'bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border-gray-700'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/step:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="flex flex-col items-center gap-2 relative">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border ${
                stats.delivered ? 'bg-purple-500 border-purple-400' : 'bg-black/40 border-gray-600'
              }`}>
                <span className={`text-base font-bold ${stats.delivered ? 'text-white' : 'text-gray-400'}`}>
                  {stats.delivered ? '✓' : '2'}
                </span>
              </div>
              <span className={`text-xs font-medium text-center ${stats.delivered ? 'text-purple-400' : 'text-gray-400'}`}>
                Entregado
              </span>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-5 border border-gray-700 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative">
        <h2 className="text-2xl font-bold text-white">Progreso del Equipo</h2>
        <div className="text-xl font-bold text-white">{completion}%</div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4 relative">
        <div className="w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden border border-gray-700">
          <div
            className="h-full transition-all duration-700 ease-out rounded-full shadow-lg"
            style={{ backgroundColor: primaryColor, width: `${completion}%` }}
          />
        </div>
      </div>

      {/* Dynamic Step Indicators - 5 columns */}
      <div className="grid grid-cols-5 gap-2 relative">
        {currentPhase === 'setup' && renderSetupPhaseExpanded()}
        {currentPhase === 'building' && renderBuildingPhaseExpanded()}
        {currentPhase === 'order' && renderOrderPhaseExpanded()}
        {(currentPhase === 'production' || currentPhase === 'completed') && renderProductionPhaseExpanded()}
      </div>
    </div>
  );
});

export default ProgressTracker;
