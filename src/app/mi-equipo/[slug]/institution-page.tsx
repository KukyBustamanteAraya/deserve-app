'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTeamData } from './hooks/useTeamData';
import { useInstitutionData } from './hooks/useInstitutionData';
import { InstitutionStatsCards } from '@/components/institution/InstitutionStatsCards';
import { ProgramsBySport } from '@/components/institution/ProgramsBySport';
import { ActivityFeed } from '@/components/institution/ActivityFeed';
import { OrdersTable } from '@/components/institution/OrdersTable';
import { AddProgramModal } from '@/components/institution/AddProgramModal';
import QuickTeamSetupModal from '@/components/institution/QuickTeamSetupModal';
import { getBrowserClient } from '@/lib/supabase/client';

export default function InstitutionDashboard({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const searchParams = useSearchParams();

  // Use extracted hooks
  const { team, colors, memberCount, isManager, institutionRole, managedSubTeamIds, permissions, currentUser, loading, error } = useTeamData(slug);
  const {
    institutionStats,
    institutionOrders,
    institutionPrograms,
    institutionActivity,
    institutionDesignRequests,
    loading: institutionLoading,
    error: institutionError,
    refetchPrograms,
  } = useInstitutionData(slug, team?.id, team?.sports);

  // Modal state
  const [showAddProgramModal, setShowAddProgramModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [onboardingData, setOnboardingData] = useState<{
    designRequestId: string;
    sportId: number;
    sportName: string;
    sportSlug: string;
    existingProductIds?: string[];
  } | null>(null);

  // Check for quick design onboarding on mount
  useEffect(() => {
    const checkNeedsOnboarding = async () => {
      const drId = searchParams.get('dr');
      const shouldOnboard = searchParams.get('onboarding') === 'true';

      console.log('[Onboarding] Check params:', { drId, shouldOnboard, teamId: team?.id });

      if (!drId || !shouldOnboard || !team?.id) {
        console.log('[Onboarding] Skipping - missing params');
        return;
      }

      console.log('[Onboarding] Fetching design request:', drId);
      const supabase = getBrowserClient();

      // Fetch design request details (simple query - no nested relations)
      const { data: dr, error: drError } = await supabase
        .from('design_requests')
        .select(`
          id,
          sport_slug,
          selected_apparel,
          estimated_roster_size,
          design_id
        `)
        .eq('id', drId)
        .single();

      if (drError || !dr) {
        console.error('[Onboarding] Failed to fetch design request:', drError);
        return;
      }

      console.log('[Onboarding] Design request loaded:', dr);

      // Check if already completed
      const isComplete = dr.selected_apparel && dr.estimated_roster_size;
      if (isComplete) {
        console.log('[Onboarding] Design request already complete');
        return;
      }

      // Get sport info from sport_slug
      const { data: sport } = await supabase
        .from('sports')
        .select('id, name, slug')
        .eq('slug', dr.sport_slug)
        .single();

      if (!sport) {
        console.error('[Onboarding] Could not find sport:', dr.sport_slug);
        return;
      }

      console.log('[Onboarding] Sport loaded:', sport);

      // Check if institution_sub_teams exists for this sport
      const { data: subTeams } = await supabase
        .from('institution_sub_teams')
        .select('id')
        .eq('institution_team_id', team.id)
        .eq('sport_id', sport.id);

      const needsSetup = !subTeams?.length;

      console.log('[Onboarding] Needs setup:', needsSetup, 'subTeams:', subTeams);

      if (needsSetup) {
        console.log('[Onboarding] Showing quick setup modal');

        // Extract product IDs from existing selected_apparel if available
        let existingProductIds: string[] | undefined;
        if (dr.selected_apparel && typeof dr.selected_apparel === 'object') {
          const apparel = dr.selected_apparel as any;
          if (apparel.products && Array.isArray(apparel.products)) {
            existingProductIds = apparel.products.map((p: any) => p.id).filter(Boolean);
            console.log('[Onboarding] Found existing product IDs:', existingProductIds);
          }
        }

        setOnboardingData({
          designRequestId: drId,
          sportId: sport.id,
          sportName: sport.name,
          sportSlug: sport.slug,
          existingProductIds
        });
        setShowOnboardingModal(true);
      }
    };

    if (team && !loading) {
      checkNeedsOnboarding();
    }
  }, [searchParams, team, loading]);

  // Loading state
  if (loading || institutionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-lg text-gray-300">Cargando institución...</div>
      </div>
    );
  }

  // Error state
  if (error || institutionError || !team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">Error cargando institución</p>
          <p className="text-gray-400 mb-6">{error || institutionError || 'Institución no encontrada'}</p>
          <button
            onClick={() => router.push('/mi-equipo')}
            className="px-6 py-3 bg-[#e21c21] hover:bg-[#c11a1e] text-white rounded-lg transition-colors"
          >
            Volver a Mis Equipos
          </button>
        </div>
      </div>
    );
  }

  console.log('[InstitutionDashboard] 📊 Rendering institution dashboard for:', team.name);

  // Group active orders by order number
  const groupedActiveOrders = institutionOrders.reduce((groups, order) => {
    const key = order.order_number || order.id;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(order);
    return groups;
  }, {} as Record<string, any[]>);

  // Calculate grand total for active orders
  const activeOrdersGrandTotal = institutionOrders.reduce((sum, order) => sum + (order.total_clp || 0), 0);
  const activeOrdersGrandPaid = institutionOrders.reduce((sum, order) => sum + (order.total_clp || 0), 0);
  const activeOrdersTotalItems = institutionOrders.reduce((sum, order) => sum + (order.order_items?.length || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Organization Header Banner */}
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-3">
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-8 border border-gray-700 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

          {/* Back Arrow - Top Left */}
          <button
            onClick={() => router.push('/mi-equipo')}
            className="absolute top-2 left-2 p-1.5 rounded-md bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 text-gray-400 hover:text-white hover:border-[#e21c21]/50 transition-all z-10"
            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          {/* Settings Button - Top Right */}
          {isManager && (
            <button
              onClick={() => router.push(`/mi-equipo/${slug}/settings`)}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 text-gray-400 hover:text-white hover:border-[#e21c21]/50 transition-all z-10"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}

          <div className="relative pt-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                {/* Institution Logo */}
                {team.logo_url && (
                  <div className="relative flex-shrink-0">
                    <img
                      src={team.logo_url}
                      alt={`${team.name} logo`}
                      className="w-20 h-20 object-contain rounded-lg border-2 border-gray-700 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 p-2 shadow-lg"
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl font-bold text-white">{team.name}</h1>
                    {institutionRole && institutionRole !== 'player' && (
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        institutionRole === 'athletic_director'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                          : institutionRole === 'coach'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                          : 'bg-green-500/20 text-green-300 border border-green-500/50'
                      }`}>
                        {institutionRole === 'athletic_director' ? 'Director Atlético'
                          : institutionRole === 'coach' ? 'Entrenador'
                          : 'Asistente'}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-300 text-lg">
                    {institutionStats ? `${institutionStats.total_programs || 0} Equipos • ${institutionStats.total_members || 0} Atletas` : 'Cargando...'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Organization Main Content */}
      <div className="max-w-7xl mx-auto px-6 pt-3 pb-8 space-y-6">
        {/* Stats Cards - Always show with default values */}
        <InstitutionStatsCards
          stats={institutionStats || {
            activeOrders: 0,
            pendingApprovals: 0,
            incompleteOrders: 0,
            paymentCollected: 0,
            paymentTotal: 0,
            total_programs: 0,
            total_members: 0
          }}
        />

        {/* Active Orders Section */}
        {institutionOrders.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">Pedidos</h2>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded-full text-sm font-medium">
                  {Object.keys(groupedActiveOrders).length}
                </span>
              </div>
              {permissions.canCreateDesignRequests && (
                <button
                  onClick={() => router.push(`/mi-equipo/${slug}/design-request/new`)}
                  className="relative px-4 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md text-white rounded-lg font-medium text-sm overflow-hidden group/btn border border-gray-700 hover:border-blue-500/50 transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                  <span className="relative">+ Nuevo Pedido</span>
                </button>
              )}
            </div>

            {/* Render each order group in its own container */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Object.entries(groupedActiveOrders).map(([orderNumber, orders]) => (
                <div key={orderNumber}>
                  <OrdersTable
                    orders={orders as any[]}
                    institutionSlug={slug}
                  />
                </div>
              ))}
            </div>

            {/* Grand Total Card */}
            <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

              <div className="relative px-6 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <span className="text-sm font-semibold text-gray-300">
                      {Object.keys(groupedActiveOrders).length} {Object.keys(groupedActiveOrders).length === 1 ? 'Orden Activa' : 'Órdenes Activas'}
                    </span>
                    <div className="h-4 w-px bg-gray-700"></div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Cantidad:</span>
                      <span className="text-sm font-bold text-white">{activeOrdersTotalItems}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Total:</span>
                      <span className="text-lg font-bold text-[#e21c21]">
                        ${(activeOrdersGrandTotal / 100).toLocaleString('es-CL')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Pagado:</span>
                      <span className="text-lg font-bold text-green-400">
                        ${(activeOrdersGrandPaid / 100).toLocaleString('es-CL')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">Pedidos</h2>
                <span className="px-3 py-1 bg-gray-800/50 text-gray-500 border border-gray-700 rounded-full text-sm font-medium">
                  0
                </span>
              </div>
              {permissions.canCreateDesignRequests && (
                <button
                  onClick={() => {
                    if (institutionPrograms.length === 0) {
                      alert('Primero debes agregar al menos un programa deportivo');
                    } else {
                      router.push(`/mi-equipo/${slug}/design-request/new`);
                    }
                  }}
                  className="relative px-4 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md text-white rounded-lg font-medium text-sm overflow-hidden group/btn border border-gray-700 hover:border-blue-500/50 transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                  <span className="relative">+ Nuevo Pedido</span>
                </button>
              )}
            </div>

            {/* Order #1 Placeholder */}
            <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

              <div className="relative p-6">
                {/* Order Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-white">Orden #1</h3>
                    <span className="px-2 py-1 bg-gray-800/50 text-gray-500 border border-gray-700 rounded text-xs font-medium">
                      Sin pedidos
                    </span>
                  </div>
                </div>

                {/* Empty Table Structure */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400">Equipo</th>
                        <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400">Cantidad</th>
                        <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400">Total</th>
                        <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={4} className="py-8 text-center">
                          <p className="text-gray-500 text-sm">
                            Los pedidos aparecerán aquí cuando crees solicitudes de diseño
                          </p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Programs by Sport - Always show so they can add first program */}
        <ProgramsBySport
          programs={institutionPrograms}
          institutionSlug={slug}
          designRequests={institutionDesignRequests}
          onAddProgram={() => setShowAddProgramModal(true)}
          onRefresh={refetchPrograms}
          canAddPrograms={permissions.canCreatePrograms}
        />

        {/* Activity Feed - Always show, with default creation activity */}
        <ActivityFeed
          activities={institutionActivity.length > 0 ? institutionActivity : [{
            id: 'initial-creation',
            type: 'roster',
            action: `Deserve sirve a ${team?.name || 'Institución'} y ${currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'usuario'}`,
            timestamp: 'Hoy',
            teamSlug: slug
          }]}
          institutionSlug={slug}
        />
      </div>

      {/* Add Program Modal - Rendered at page level */}
      <AddProgramModal
        isOpen={showAddProgramModal}
        onClose={() => setShowAddProgramModal(false)}
        institutionSlug={slug}
        onSuccess={async () => {
          setShowAddProgramModal(false);
          await refetchPrograms();
        }}
      />

      {/* Quick Team Setup Modal - For quick design flow completion */}
      {onboardingData && (
        <QuickTeamSetupModal
          open={showOnboardingModal}
          onClose={() => {
            console.log('[InstitutionPage] Modal closed, triggering hard refresh...');
            setShowOnboardingModal(false);

            // Add a small delay to ensure database changes propagate
            setTimeout(() => {
              window.location.href = `/mi-equipo/${slug}`;
            }, 500);
          }}
          designRequestId={onboardingData.designRequestId}
          sportId={onboardingData.sportId}
          sportName={onboardingData.sportName}
          sportSlug={onboardingData.sportSlug}
          institutionName={team?.name || ''}
          institutionId={team?.id || ''}
          existingProductIds={onboardingData.existingProductIds}
        />
      )}
    </div>
  );
}
