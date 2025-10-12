'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { DesignApprovalCard } from '@/components/team/DesignApprovalCard';
import { DesignApprovalModal } from '@/components/team/DesignApprovalModal';
import { ProgressTracker } from '@/components/team/ProgressTracker';
import { MiniFieldMap } from '@/components/team/MiniFieldMap';
import { PlayerDetailModal } from '@/components/team/PlayerDetailModal';
import type { SportSlug } from '@/lib/sports/fieldLayouts';

// Map common sport names to SportSlug
function mapSportToSlug(sport?: string): SportSlug {
  if (!sport) return 'futbol';
  const normalized = sport.toLowerCase().trim();

  if (normalized.includes('soccer') || normalized.includes('futbol') || normalized.includes('fútbol')) {
    return 'futbol';
  }
  if (normalized.includes('basketball') || normalized.includes('basquetbol')) {
    return 'basketball';
  }
  if (normalized.includes('volleyball') || normalized.includes('voleibol')) {
    return 'volleyball';
  }
  if (normalized.includes('baseball') || normalized.includes('béisbol')) {
    return 'baseball';
  }
  if (normalized.includes('rugby')) {
    return 'rugby';
  }

  return 'futbol'; // Default fallback
}

type Team = {
  id: string;
  name: string;
  slug: string;
  sport_id?: number;
  sport?: {
    id: number;
    slug: string;
    name: string;
  };
  team_type?: 'single_team' | 'institution';
  sports?: string[];
  institution_name?: string;
  created_at: string;
};

type TeamColors = {
  primary_color?: string;
  secondary_color?: string;
  tertiary_color?: string;
};

type DesignRequest = {
  id: number;
  team_id: string;
  product_id: number;
  status: string;
  mockup_urls: string[] | null;
  requested_by: string;
  created_at: string;
  updated_at: string;
  likes_count?: number;
  dislikes_count?: number;
  user_reaction?: 'like' | 'dislike' | null;
};

type SubTeam = {
  id: string;
  name: string;
  slug: string;
  sport_id?: number;
  sport?: {
    id: number;
    slug: string;
    name: string;
  };
  member_count: number;
  design_status?: string;
};

type Player = {
  id: string;
  player_name: string;
  jersey_number?: string;
  size: string;
  position?: string;
  additional_notes?: string;
  created_at: string;
};

type PaymentSummary = {
  totalOrders: number;
  totalAmountCents: number;
  totalPaidCents: number;
  totalPendingCents: number;
  myPendingPayments: number;
};

export default function MinimalTeamPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [colors, setColors] = useState<TeamColors>({});
  const [memberCount, setMemberCount] = useState<number>(0);
  const [isManager, setIsManager] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [designRequests, setDesignRequests] = useState<DesignRequest[]>([]);
  const [subTeams, setSubTeams] = useState<SubTeam[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedDesignForApproval, setSelectedDesignForApproval] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);

  useEffect(() => {
    async function loadTeam() {
      try {
        const supabase = getBrowserClient();

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        setCurrentUser(user);

        // Get team with sport relationship
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select(`
            *,
            sport:sports!sport_id(id, slug, name)
          `)
          .eq('slug', params.slug)
          .single();

        if (teamError) throw teamError;
        setTeam(teamData);

        // Get team settings (colors)
        const { data: settingsData } = await supabase
          .from('team_settings')
          .select('primary_color, secondary_color, tertiary_color')
          .eq('team_id', teamData.id)
          .single();

        if (settingsData) {
          setColors(settingsData);
        }

        // Get member count
        const { count } = await supabase
          .from('team_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', teamData.id);

        setMemberCount(count || 0);

        // Check if user is manager
        console.log('[Team Page] Checking manager role for user:', user.id, 'team:', teamData.id);
        console.log('[Team Page] Team owner_id:', teamData.owner_id, 'current_owner_id:', teamData.current_owner_id);

        const { data: membership, error: membershipError } = await supabase
          .from('team_memberships')
          .select('role')
          .eq('team_id', teamData.id)
          .eq('user_id', user.id)
          .single();

        console.log('[Team Page] Membership query result:', membership, 'error:', membershipError);

        // Check multiple conditions for manager status
        const isMembershipOwner = membership?.role === 'owner' || membership?.role === 'manager';
        const isTeamOwner = teamData.owner_id === user.id || teamData.current_owner_id === user.id;
        const userRole = membership?.role || (isTeamOwner ? 'owner' : null);

        console.log('[Team Page] isMembershipOwner:', isMembershipOwner, 'isTeamOwner:', isTeamOwner, 'final userRole:', userRole);

        setIsManager(isMembershipOwner || isTeamOwner);

        // Get ALL design requests with reactions
        console.log('[Team Page] Fetching design requests for team:', teamData.id, 'slug:', params.slug);
        const { data: designData } = await supabase
          .from('design_requests')
          .select('*')
          .eq('team_id', teamData.id)
          .order('created_at', { ascending: false});

        console.log('[Team Page] Found design requests:', designData?.length || 0);

        if (designData && designData.length > 0) {
          // For each design request, get reaction counts and user's reaction
          const requestsWithReactions = await Promise.all(
            designData.map(async (request) => {
              // Get reaction counts
              const { data: reactions } = await supabase
                .from('design_request_reactions')
                .select('reaction, user_id')
                .eq('design_request_id', request.id);

              const likes_count = reactions?.filter(r => r.reaction === 'like').length || 0;
              const dislikes_count = reactions?.filter(r => r.reaction === 'dislike').length || 0;
              const user_reaction = reactions?.find(r => r.user_id === user.id)?.reaction || null;

              return {
                ...request,
                likes_count,
                dislikes_count,
                user_reaction
              };
            })
          );

          setDesignRequests(requestsWithReactions);

          // Load players for the latest design request (for field map)
          const latestRequest = requestsWithReactions[0];

          // First try to get players for the latest design request
          let { data: playersData } = await supabase
            .from('player_info_submissions')
            .select('*')
            .eq('design_request_id', latestRequest.id)
            .order('created_at', { ascending: false });

          console.log('[Team Page] Loaded players for design request:', playersData?.length || 0, 'players');

          // If no players found for this design request, get ALL team players
          if (!playersData || playersData.length === 0) {
            console.log('[Team Page] No players for design request, loading all team players');
            const { data: allPlayersData } = await supabase
              .from('player_info_submissions')
              .select('*')
              .eq('team_id', teamData.id)
              .not('user_id', 'is', null) // Only get players with linked accounts
              .order('created_at', { ascending: false });

            playersData = allPlayersData;
            console.log('[Team Page] Loaded all team players:', playersData?.length || 0, 'players');
          }

          if (playersData && playersData.length > 0) {
            setPlayers(playersData);
          }
        }

        // If institution type, fetch all sub-teams
        if (teamData.team_type === 'institution') {
          console.log('[Team Page] Loading sub-teams for organization:', teamData.id);

          // Get all teams that belong to this organization
          const { data: subTeamsData } = await supabase
            .from('teams')
            .select(`
              id, name, slug, sport_id,
              sport:sports!sport_id(id, slug, name)
            `)
            .eq('institution_name', teamData.institution_name || teamData.name)
            .neq('id', teamData.id); // Exclude the parent organization

          if (subTeamsData) {
            // Get member count and design status for each sub-team
            const teamsWithStats = await Promise.all(
              subTeamsData.map(async (subTeam) => {
                const { count } = await supabase
                  .from('team_memberships')
                  .select('*', { count: 'exact', head: true })
                  .eq('team_id', subTeam.id);

                const { data: designReq } = await supabase
                  .from('design_requests')
                  .select('status')
                  .eq('team_id', subTeam.id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .single();

                return {
                  ...subTeam,
                  member_count: count || 0,
                  design_status: designReq?.status,
                };
              })
            );

            setSubTeams(teamsWithStats);
            console.log('[Team Page] Loaded', teamsWithStats.length, 'sub-teams');
          }
        }

        // Load payment summary for single teams
        if (teamData.team_type !== 'institution') {
          const { data: ordersData } = await supabase
            .from('orders')
            .select('id, total_amount_cents, payment_status')
            .eq('team_id', teamData.id);

          if (ordersData && ordersData.length > 0) {
            // Get all payment contributions for these orders
            const orderIds = ordersData.map(o => o.id);
            const { data: contributionsData } = await supabase
              .from('payment_contributions')
              .select('order_id, amount_cents, payment_status, user_id')
              .in('order_id', orderIds);

            // Calculate payment summary
            const totalOrders = ordersData.length;
            const totalAmountCents = ordersData.reduce((sum, o) => sum + o.total_amount_cents, 0);
            const totalPaidCents = contributionsData
              ?.filter(c => c.payment_status === 'approved')
              .reduce((sum, c) => sum + c.amount_cents, 0) || 0;
            const totalPendingCents = totalAmountCents - totalPaidCents;

            // Count pending payments for current user
            const { data: myItemsData } = await supabase
              .from('order_items')
              .select('id, order_id')
              .in('order_id', orderIds)
              .eq('player_id', user.id)
              .eq('opted_out', false);

            let myPendingPayments = 0;
            if (myItemsData) {
              for (const item of myItemsData) {
                const hasPaid = contributionsData?.some(
                  c => c.order_id === item.order_id && c.user_id === user.id && c.payment_status === 'approved'
                );
                if (!hasPaid) {
                  myPendingPayments++;
                }
              }
            }

            setPaymentSummary({
              totalOrders,
              totalAmountCents,
              totalPaidCents,
              totalPendingCents,
              myPendingPayments
            });
          }
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadTeam();
  }, [params.slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Cargando equipo...</div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error || 'Equipo no encontrado'}</p>
          <button
            onClick={() => router.push('/mi-equipo')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  // Render organization dashboard
  if (team.team_type === 'institution') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Organization Header Banner */}
        <div
          className="relative overflow-hidden"
          style={{
            background: colors.primary_color
              ? `linear-gradient(135deg, ${colors.primary_color} 0%, ${colors.secondary_color || colors.primary_color} 100%)`
              : 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)'
          }}
        >
          <div className="max-w-7xl mx-auto px-6 py-8">
            <button
              onClick={() => router.push('/mi-equipo')}
              className="mb-4 text-white/90 hover:text-white font-medium flex items-center gap-2"
            >
              ← Volver a mis equipos
            </button>

            <div className="flex items-start justify-between">
              <div>
                <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white/90 mb-3">
                  🏛️ Organización
                </div>
                <h1 className="text-4xl font-bold text-white mb-2">{team.name}</h1>
                <p className="text-white/80 text-lg">
                  {team.sports && team.sports.length > 0
                    ? `${team.sports.length} programas deportivos`
                    : 'Organización Multi-Deporte'}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{subTeams.length}</div>
                  <div className="text-white/80 text-sm">Equipos</div>
                </div>

                {isManager && (
                  <button
                    onClick={() => router.push(`/mi-equipo/${params.slug}/settings`)}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors backdrop-blur-sm"
                  >
                    ⚙️ Configuración
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Organization Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <span className="text-3xl">🏅</span>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{subTeams.length}</div>
                  <div className="text-sm text-gray-600">Equipos Totales</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <span className="text-3xl">👥</span>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {subTeams.reduce((sum, t) => sum + t.member_count, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Miembros Totales</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <span className="text-3xl">🎨</span>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {subTeams.filter((t) => t.design_status === 'approved').length}
                  </div>
                  <div className="text-sm text-gray-600">Diseños Aprobados</div>
                </div>
              </div>
            </div>
          </div>

          {/* Teams by Sport */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span>🏆</span>
              Programas Deportivos
            </h2>

            {team.sports && team.sports.length > 0 ? (
              <div className="space-y-8">
                {team.sports.map((sport) => {
                  const sportTeams = subTeams.filter((t) => t.sport === sport);
                  return (
                    <div key={sport}>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                        {sport} ({sportTeams.length} equipos)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sportTeams.map((subTeam) => (
                          <button
                            key={subTeam.id}
                            onClick={() => router.push(`/mi-equipo/${subTeam.slug}`)}
                            className="bg-gray-50 hover:bg-gray-100 rounded-lg p-4 text-left transition-colors border-2 border-transparent hover:border-blue-300"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-gray-900">{subTeam.name}</h4>
                              {subTeam.design_status && (
                                <span
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    subTeam.design_status === 'approved'
                                      ? 'bg-green-100 text-green-700'
                                      : subTeam.design_status === 'ready'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}
                                >
                                  {subTeam.design_status === 'approved'
                                    ? '✅'
                                    : subTeam.design_status === 'ready'
                                    ? '🎨'
                                    : '⏳'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span>👥 {subTeam.member_count} miembros</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500 mb-4">No hay equipos registrados todavía</p>
                {isManager && (
                  <button
                    onClick={() => router.push('/dashboard/team')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    + Crear Equipo
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Institution Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Información de la Organización</h2>
            <div className="space-y-3">
              <div>
                <span className="font-semibold text-gray-700">Tipo:</span>
                <span className="ml-2 text-gray-600">Organización Multi-Deporte</span>
              </div>
              {team.institution_name && (
                <div>
                  <span className="font-semibold text-gray-700">Institución:</span>
                  <span className="ml-2 text-gray-600">{team.institution_name}</span>
                </div>
              )}
              <div>
                <span className="font-semibold text-gray-700">Creado:</span>
                <span className="ml-2 text-gray-600">
                  {new Date(team.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render single team dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Team Header Banner */}
      <div
        className="relative overflow-hidden"
        style={{
          background: colors.primary_color
            ? `linear-gradient(135deg, ${colors.primary_color} 0%, ${colors.secondary_color || colors.primary_color} 100%)`
            : 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)'
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-8">
          <button
            onClick={() => router.push('/mi-equipo')}
            className="mb-4 text-white/90 hover:text-white font-medium flex items-center gap-2"
          >
            ← Volver a mis equipos
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{team.name}</h1>
              <p className="text-white/80 text-lg">
                {team.sport?.name || 'Deporte no especificado'}
                {team.institution_name && ` • ${team.institution_name}`}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{memberCount}</div>
                <div className="text-white/80 text-sm">Miembros</div>
              </div>

              {isManager && (
                <button
                  onClick={() => router.push(`/mi-equipo/${params.slug}/settings`)}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors backdrop-blur-sm"
                >
                  ⚙️ Configuración
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Single Team */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Progress Tracker - Show for latest request */}
        {designRequests.length > 0 && (
          <ProgressTracker
            teamId={team.id}
            designRequestId={designRequests[0].id}
          />
        )}

        {/* Payment Summary Widget */}
        {paymentSummary && paymentSummary.totalOrders > 0 && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg shadow-sm p-6 border-2 border-green-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>💰</span>
                Estado de Pagos
              </h3>
              <button
                onClick={() => router.push(`/mi-equipo/${params.slug}/payments`)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm transition-colors"
              >
                Ver Detalles →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Total Pedidos</div>
                <div className="text-2xl font-bold text-gray-900">{paymentSummary.totalOrders}</div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Total a Pagar</div>
                <div className="text-2xl font-bold text-gray-900">
                  ${paymentSummary.totalAmountCents.toLocaleString('es-CL')}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Pagado</div>
                <div className="text-2xl font-bold text-green-600">
                  ${paymentSummary.totalPaidCents.toLocaleString('es-CL')}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Pendiente</div>
                <div className="text-2xl font-bold text-orange-600">
                  ${paymentSummary.totalPendingCents.toLocaleString('es-CL')}
                </div>
              </div>
            </div>

            {/* User's Pending Payments Alert */}
            {paymentSummary.myPendingPayments > 0 && (
              <div className="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div className="flex-1">
                    <div className="font-semibold text-yellow-900 mb-1">
                      Tienes {paymentSummary.myPendingPayments} pago{paymentSummary.myPendingPayments > 1 ? 's' : ''} pendiente{paymentSummary.myPendingPayments > 1 ? 's' : ''}
                    </div>
                    <div className="text-sm text-yellow-800">
                      Haz clic en "Ver Detalles" para pagar tu parte del pedido
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/mi-equipo/${params.slug}/payments`)}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-medium text-sm transition-colors whitespace-nowrap"
                  >
                    Pagar Ahora
                  </button>
                </div>
              </div>
            )}

            {/* All Paid Success Message */}
            {paymentSummary.totalPendingCents === 0 && (
              <div className="bg-green-100 border-2 border-green-300 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <div className="flex-1">
                    <div className="font-semibold text-green-900 mb-1">
                      ¡Todos los pagos están completos!
                    </div>
                    <div className="text-sm text-green-800">
                      El pedido será procesado y enviado pronto
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Design Requests Gallery */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span>🎨</span>
              Diseños del Equipo {designRequests.length > 0 && `(${designRequests.length})`}
            </h2>
            <button
              onClick={() => router.push(`/mi-equipo/${params.slug}/design-request/new`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
            >
              + Nueva Solicitud
            </button>
          </div>

          {designRequests.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {designRequests.map((request) => (
                <div
                  key={request.id}
                  className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors"
                >
                  {/* Mockup Images */}
                  {request.mockup_urls && request.mockup_urls.length > 0 ? (
                    <div className="mb-4 bg-gray-50 rounded-lg p-4">
                      <img
                        src={request.mockup_urls[0]}
                        alt="Design mockup"
                        className="w-full h-48 object-contain rounded"
                      />
                    </div>
                  ) : (
                    <div className="mb-4 bg-gray-100 rounded-lg p-12 text-center">
                      <span className="text-4xl">👕</span>
                      <p className="text-gray-500 text-sm mt-2">Diseño en proceso</p>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        request.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : request.mockup_urls && request.mockup_urls.length > 0
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {request.status === 'approved'
                        ? '✅ Aprobado'
                        : request.mockup_urls && request.mockup_urls.length > 0
                        ? '🗳️ Listo para Revisión'
                        : '📝 Pendiente'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Reaction Buttons - Show when mockup exists (allows feedback before final approval) */}
                  {request.mockup_urls && request.mockup_urls.length > 0 && request.status !== 'approved' && (
                    <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-200">
                      <button
                        onClick={async () => {
                          const supabase = getBrowserClient();
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) return;

                          if (request.user_reaction === 'like') {
                            // Remove like
                            await supabase
                              .from('design_request_reactions')
                              .delete()
                              .eq('design_request_id', request.id)
                              .eq('user_id', user.id);
                          } else {
                            // Add or update to like
                            await supabase
                              .from('design_request_reactions')
                              .upsert({
                                design_request_id: request.id,
                                user_id: user.id,
                                reaction: 'like'
                              }, {
                                onConflict: 'design_request_id,user_id'
                              });
                          }

                          // Reload page to show updated reactions
                          window.location.reload();
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                          request.user_reaction === 'like'
                            ? 'bg-green-100 text-green-700 border-2 border-green-300'
                            : 'bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-green-300'
                        }`}
                      >
                        <span className="text-lg">👍</span>
                        <span>{request.likes_count || 0}</span>
                      </button>

                      <button
                        onClick={async () => {
                          const supabase = getBrowserClient();
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) return;

                          if (request.user_reaction === 'dislike') {
                            // Remove dislike
                            await supabase
                              .from('design_request_reactions')
                              .delete()
                              .eq('design_request_id', request.id)
                              .eq('user_id', user.id);
                          } else {
                            // Add or update to dislike
                            await supabase
                              .from('design_request_reactions')
                              .upsert({
                                design_request_id: request.id,
                                user_id: user.id,
                                reaction: 'dislike'
                              }, {
                                onConflict: 'design_request_id,user_id'
                              });
                          }

                          // Reload page to show updated reactions
                          window.location.reload();
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                          request.user_reaction === 'dislike'
                            ? 'bg-red-100 text-red-700 border-2 border-red-300'
                            : 'bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-red-300'
                        }`}
                      >
                        <span className="text-lg">👎</span>
                        <span>{request.dislikes_count || 0}</span>
                      </button>
                    </div>
                  )}

                  {/* Show vote results for approved designs */}
                  {request.status === 'approved' && (request.likes_count > 0 || request.dislikes_count > 0) && (
                    <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-200">
                      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                        <span className="text-lg">👍</span>
                        <span className="font-medium text-gray-700">{request.likes_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                        <span className="text-lg">👎</span>
                        <span className="font-medium text-gray-700">{request.dislikes_count || 0}</span>
                      </div>
                      <span className="text-xs text-gray-500 ml-auto">Resultados finales</span>
                    </div>
                  )}

                  {/* Manager Actions */}
                  {isManager && (
                    <>
                      {/* Approve Design - When design has mockup and is not yet approved */}
                      {(request.status === 'pending' || request.status === 'ready' || request.status === 'ready_for_voting') && request.mockup_urls && request.mockup_urls.length > 0 && (
                        <button
                          onClick={() => setSelectedDesignForApproval(request.id)}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                        >
                          ✅ Aprobar Diseño y Crear Pedido
                        </button>
                      )}

                      {/* View Order - When design is approved */}
                      {request.status === 'approved' && (
                        <button
                          onClick={() => router.push(`/mi-equipo/${params.slug}/payments`)}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                          💳 Ver Pedido y Pagos
                        </button>
                      )}
                    </>
                  )}

                  {/* Delete Button - Show for managers (can delete any) or authors (can delete their own) */}
                  {(isManager || (currentUser && request.requested_by === currentUser.id)) && (
                    <button
                      onClick={async () => {
                        if (!confirm('¿Estás seguro de que deseas eliminar esta solicitud de diseño? Esta acción no se puede deshacer.')) {
                          return;
                        }

                        try {
                          const response = await fetch(`/api/design-requests/${request.id}`, {
                            method: 'DELETE',
                          });

                          if (!response.ok) {
                            const error = await response.json();
                            throw new Error(error.error || 'Error al eliminar');
                          }

                          // Reload page to show updated list
                          window.location.reload();
                        } catch (error: any) {
                          alert(error.message || 'Error al eliminar la solicitud de diseño');
                        }
                      }}
                      className="w-full mt-3 px-4 py-2 bg-red-50 text-red-700 border-2 border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 font-medium transition-colors"
                    >
                      🗑️ Eliminar Solicitud
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <span className="text-6xl mb-4 block">👕</span>
              <p className="text-gray-500 mb-4 text-lg">No hay solicitudes de diseño todavía</p>
              <p className="text-gray-400 text-sm mb-6">
                {isManager
                  ? 'Crea tu primera solicitud de diseño para comenzar'
                  : 'Tu equipo aún no ha creado solicitudes de diseño'}
              </p>
              <button
                onClick={() => router.push(`/dashboard/teams/${team.id}/design`)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium inline-flex items-center gap-2"
              >
                <span>+</span>
                <span>Crear Primera Solicitud</span>
              </button>
            </div>
          )}
        </div>

        {/* Mini-Field Visualization - Show for latest request */}
        {designRequests.length > 0 && players.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <MiniFieldMap
              sport={mapSportToSlug(team.sport?.slug)}
              players={players}
              onPlayerClick={(player) => setSelectedPlayer(player)}
            />
          </div>
        )}

        {/* Player Actions - Show for ALL members */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span>⚽</span>
            Mis Acciones
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* View Roster Card */}
            <button
              onClick={() => router.push(`/mi-equipo/${params.slug}/roster`)}
              className="bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg p-6 text-left transition-all border-2 border-transparent hover:border-blue-300"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="p-3 bg-blue-500 rounded-lg">
                  <span className="text-3xl">👥</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg mb-1">Ver Roster</h3>
                  <p className="text-sm text-gray-600">
                    Ve todos los miembros del equipo y su información
                  </p>
                </div>
              </div>
            </button>

            {/* Pay My Share Card */}
            <button
              onClick={() => router.push(`/mi-equipo/${params.slug}/payments`)}
              className="bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-lg p-6 text-left transition-all border-2 border-transparent hover:border-green-300"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="p-3 bg-green-500 rounded-lg">
                  <span className="text-3xl">💳</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg mb-1">Pagar Mi Parte</h3>
                  <p className="text-sm text-gray-600">
                    Revisa pedidos y paga tu contribución individual
                  </p>
                </div>
              </div>
            </button>

            {/* Edit My Info Card */}
            <button
              onClick={() => router.push(`/mi-equipo/${params.slug}/my-info`)}
              className="bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-lg p-6 text-left transition-all border-2 border-transparent hover:border-purple-300"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="p-3 bg-purple-500 rounded-lg">
                  <span className="text-3xl">✏️</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg mb-1">Editar Mi Información</h3>
                  <p className="text-sm text-gray-600">
                    Actualiza tu talla, número de camiseta y posición
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Manager Actions */}
        {isManager && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span>⚙️</span>
              Acciones de Gestión
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Roster Upload Card */}
              <button
                onClick={() => router.push(`/dashboard/teams/${team.id}/roster`)}
                className="bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg p-6 text-left transition-all border-2 border-transparent hover:border-blue-300"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-500 rounded-lg">
                    <span className="text-3xl">📋</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">Subir Roster</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Carga un archivo CSV con la información de todos los jugadores del equipo
                    </p>
                    <div className="text-xs text-blue-700 font-medium">
                      → Ir al wizard de carga
                    </div>
                  </div>
                </div>
              </button>

              {/* Design Requests Card */}
              <button
                onClick={() => router.push(`/dashboard/teams/${team.id}/design`)}
                className="bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-lg p-6 text-left transition-all border-2 border-transparent hover:border-purple-300"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-500 rounded-lg">
                    <span className="text-3xl">🎨</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">Solicitudes de Diseño</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Crea y gestiona solicitudes de diseño, actualiza estados y aprueba diseños
                    </p>
                    <div className="text-xs text-purple-700 font-medium">
                      → Gestionar solicitudes
                    </div>
                  </div>
                </div>
              </button>

              {/* Players Management Card */}
              <button
                onClick={() => router.push(`/mi-equipo/${params.slug}/players`)}
                className="bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-lg p-6 text-left transition-all border-2 border-transparent hover:border-green-300"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-500 rounded-lg">
                    <span className="text-3xl">👥</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">Gestionar Jugadores</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Administra información de jugadores: nombres, números, tallas y posiciones
                    </p>
                    <div className="text-xs text-green-700 font-medium">
                      → Ver jugadores
                    </div>
                  </div>
                </div>
              </button>

              {/* Create Order / Catalog Card */}
              <button
                onClick={() => router.push(`/dashboard/teams/${team.id}/catalog`)}
                className="bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-lg p-6 text-left transition-all border-2 border-transparent hover:border-orange-300"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-500 rounded-lg">
                    <span className="text-3xl">🛒</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">Crear Pedido</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Explora el catálogo, selecciona productos y crea pedidos para el equipo
                    </p>
                    <div className="text-xs text-orange-700 font-medium">
                      → Ir al catálogo
                    </div>
                  </div>
                </div>
              </button>

              {/* Payment Management Card */}
              <button
                onClick={() => router.push(`/mi-equipo/${params.slug}/payments`)}
                className="bg-gradient-to-br from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 rounded-lg p-6 text-left transition-all border-2 border-transparent hover:border-emerald-300"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-emerald-500 rounded-lg">
                    <span className="text-3xl">💰</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">Gestionar Pagos</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Administra pagos de pedidos, revisa el estado de contribuciones y procesa pagos
                    </p>
                    <div className="text-xs text-emerald-700 font-medium">
                      → Ver dashboard de pagos
                    </div>
                  </div>
                </div>
              </button>

              {/* Team Settings Card */}
              <button
                onClick={() => router.push(`/mi-equipo/${params.slug}/settings`)}
                className="bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-lg p-6 text-left transition-all border-2 border-transparent hover:border-gray-300"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gray-500 rounded-lg">
                    <span className="text-3xl">⚙️</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">Configuración</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Configura miembros, roles, permisos y preferencias del equipo
                    </p>
                    <div className="text-xs text-gray-700 font-medium">
                      → Abrir configuración
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Team Info Section */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Información del Equipo</h2>
          <div className="space-y-4">
            <div>
              <span className="font-semibold text-gray-700">Deporte:</span>
              <span className="ml-2 text-gray-600">{team.sport?.name || 'Deporte no especificado'}</span>
            </div>

            {team.institution_name && (
              <div>
                <span className="font-semibold text-gray-700">Institución:</span>
                <span className="ml-2 text-gray-600">{team.institution_name}</span>
              </div>
            )}

            <div>
              <span className="font-semibold text-gray-700">Creado:</span>
              <span className="ml-2 text-gray-600">
                {new Date(team.created_at).toLocaleDateString()}
              </span>
            </div>

            {colors.primary_color && (
              <div>
                <span className="font-semibold text-gray-700">Colores del equipo:</span>
                <div className="ml-2 mt-2 flex gap-3">
                  {colors.primary_color && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded border-2 border-gray-200"
                        style={{ backgroundColor: colors.primary_color }}
                      />
                      <span className="text-sm text-gray-600">Primario</span>
                    </div>
                  )}
                  {colors.secondary_color && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded border-2 border-gray-200"
                        style={{ backgroundColor: colors.secondary_color }}
                      />
                      <span className="text-sm text-gray-600">Secundario</span>
                    </div>
                  )}
                  {colors.tertiary_color && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded border-2 border-gray-200"
                        style={{ backgroundColor: colors.tertiary_color }}
                      />
                      <span className="text-sm text-gray-600">Terciario</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Player Detail Modal */}
      <PlayerDetailModal
        player={selectedPlayer}
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
      />

      {/* Design Approval Modal */}
      {selectedDesignForApproval && (
        <DesignApprovalModal
          isOpen={true}
          onClose={() => setSelectedDesignForApproval(null)}
          designRequestId={selectedDesignForApproval}
          teamId={team.id}
          teamSlug={params.slug}
        />
      )}
    </div>
  );
}
