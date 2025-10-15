'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { DesignApprovalCard } from '@/components/team/DesignApprovalCard';
import { DesignApprovalModal } from '@/components/team/DesignApprovalModal';
import { ProgressTracker } from '@/components/team/ProgressTracker';
import { MiniFieldMap } from '@/components/team/MiniFieldMap';
import { PlayerDetailModal } from '@/components/team/PlayerDetailModal';
import { getFieldLayout, type SportSlug } from '@/lib/sports/fieldLayouts';
import { InstitutionStatsCards } from '@/components/institution/InstitutionStatsCards';
import { ProgramsBySport } from '@/components/institution/ProgramsBySport';
import { ActivityFeed } from '@/components/institution/ActivityFeed';
import { OrdersTable } from '@/components/institution/OrdersTable';
import { TeamOrderOverview } from '@/components/team/orders/TeamOrderOverview';
import { AddProgramModal } from '@/components/institution/AddProgramModal';

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

// Get emoji for sport slug
function getEmojiForSport(sportSlug: string): string {
  return '';
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
  logo_url?: string;
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

  // Collection link state
  const [collectionLink, setCollectionLink] = useState<string | null>(null);
  const [loadingLink, setLoadingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

  // Design carousel state
  const [currentDesignPage, setCurrentDesignPage] = useState(0);

  // Player edit modal state
  const [showEditPlayerModal, setShowEditPlayerModal] = useState(false);
  const [editingMyInfo, setEditingMyInfo] = useState<Player | null>(null);
  const [playerFormData, setPlayerFormData] = useState({
    player_name: '',
    jersey_number: '',
    size: '',
    position: '',
    additional_notes: '',
  });

  // Institution-specific state
  const [institutionStats, setInstitutionStats] = useState<any>(null);
  const [institutionOrders, setInstitutionOrders] = useState<any[]>([]);
  const [institutionPrograms, setInstitutionPrograms] = useState<any[]>([]);
  const [institutionActivity, setInstitutionActivity] = useState<any[]>([]);
  const [institutionLoading, setInstitutionLoading] = useState(false);
  const [showAddProgramModal, setShowAddProgramModal] = useState(false);

  // Load current user's player info (or prepare to create new)
  const loadMyPlayerInfo = async () => {
    if (!currentUser || !team) return;

    const supabase = getBrowserClient();
    const { data: playerData } = await supabase
      .from('player_info_submissions')
      .select('*')
      .eq('team_id', team.id)
      .eq('user_id', currentUser.id)
      .maybeSingle();

    if (playerData) {
      // Edit existing player info
      setEditingMyInfo(playerData);
      setPlayerFormData({
        player_name: playerData.player_name,
        jersey_number: playerData.jersey_number || '',
        size: playerData.size,
        position: playerData.position || '',
        additional_notes: playerData.additional_notes || '',
      });
    } else {
      // Create new player info - initialize with user's name if available
      setEditingMyInfo(null);
      setPlayerFormData({
        player_name: currentUser.user_metadata?.full_name || '',
        jersey_number: '',
        size: '',
        position: '',
        additional_notes: '',
      });
    }
    setShowEditPlayerModal(true);
  };

  // Create or update current user's player info
  const handleUpdateMyInfo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!playerFormData.player_name.trim() || !playerFormData.size) {
      alert('Por favor completa el nombre y la talla del jugador');
      return;
    }

    try {
      const supabase = getBrowserClient();

      if (editingMyInfo) {
        // Update existing player info
        const { error } = await supabase
          .from('player_info_submissions')
          .update({
            player_name: playerFormData.player_name.trim(),
            jersey_number: playerFormData.jersey_number.trim() || null,
            size: playerFormData.size,
            position: playerFormData.position.trim() || null,
            additional_notes: playerFormData.additional_notes.trim() || null,
          })
          .eq('id', editingMyInfo.id);

        if (error) throw error;
      } else {
        // Create new player info - need to get the latest design request
        const { data: designData } = await supabase
          .from('design_requests')
          .select('id')
          .eq('team_id', team.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let designRequestId = designData?.id;

        // If no design request exists, create a default one
        if (!designRequestId) {
          const { data: newDesignRequest, error: createError } = await supabase
            .from('design_requests')
            .insert({
              team_id: team.id,
              requested_by: currentUser.id,
              user_id: currentUser.id,
              user_type: 'manager',
              status: 'pending'
            })
            .select()
            .single();

          if (createError) throw createError;
          designRequestId = newDesignRequest.id;
        }

        // Insert new player info
        const { error } = await supabase
          .from('player_info_submissions')
          .insert({
            team_id: team.id,
            design_request_id: designRequestId,
            user_id: currentUser.id,
            player_name: playerFormData.player_name.trim(),
            jersey_number: playerFormData.jersey_number.trim() || null,
            size: playerFormData.size,
            position: playerFormData.position.trim() || null,
            additional_notes: playerFormData.additional_notes.trim() || null,
            submitted_by_manager: false, // This is the user's own info
          });

        if (error) throw error;
      }

      setShowEditPlayerModal(false);
      window.location.reload(); // Reload to show updated info
    } catch (error: any) {
      alert(`Error al ${editingMyInfo ? 'actualizar' : 'agregar'} información: ${error.message}`);
    }
  };

  // Load collection link
  const loadCollectionLink = async () => {
    if (!team) return;
    setLoadingLink(true);
    try {
      const response = await fetch(`/api/teams/${team.id}/collection-link`);
      const data = await response.json();
      setCollectionLink(data.url);
    } catch (error) {
      console.error('Error loading collection link:', error);
    } finally {
      setLoadingLink(false);
    }
  };

  // Copy link to clipboard
  const copyLinkToClipboard = () => {
    if (!collectionLink) return;
    navigator.clipboard.writeText(collectionLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  // Share via WhatsApp
  const shareViaWhatsApp = () => {
    if (!collectionLink || !team) return;
    const message = encodeURIComponent(
      `${team.name}\n\nPor favor, completa tu información de jugador usando este enlace:\n\n${collectionLink}\n\n¡Gracias!`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

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

        console.log('[Team Page] ⚠️ TEAM DATA LOADED - Checking team_type value:', teamData.team_type);
        console.log('[Team Page] Full team object:', teamData);

        if (!teamData.team_type) {
          console.error('[Team Page] 🚨 WARNING: team_type is NULL or UNDEFINED in database!');
        } else if (teamData.team_type === 'institution') {
          console.warn('[Team Page] ⚠️ Team is marked as INSTITUTION in database');
        } else if (teamData.team_type === 'single_team') {
          console.log('[Team Page] ✅ Team is correctly marked as SINGLE_TEAM');
        } else {
          console.error('[Team Page] 🚨 UNEXPECTED team_type value:', teamData.team_type);
        }

        setTeam(teamData);

        // Get team settings (colors and logo)
        const { data: settingsData } = await supabase
          .from('team_settings')
          .select('primary_color, secondary_color, tertiary_color, logo_url')
          .eq('team_id', teamData.id)
          .single();

        if (settingsData) {
          setColors(settingsData);
          // Add logo_url to team object
          setTeam((prev) => prev ? { ...prev, logo_url: settingsData.logo_url } : prev);
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

          // Load ALL team players (not filtered by design request)
          // This ensures all players show up on the field map regardless of which design request they're linked to
          const { data: playersData } = await supabase
            .from('player_info_submissions')
            .select('*')
            .eq('team_id', teamData.id)
            .order('created_at', { ascending: false });

          console.log('[Team Page] Loaded all team players:', playersData?.length || 0, 'players');

          if (playersData && playersData.length > 0) {
            setPlayers(playersData);
          }
        }

        // If institution type, fetch institution data from APIs
        if (teamData.team_type === 'institution') {
          console.log('[Team Page] Loading institution data for:', teamData.id);
          setInstitutionLoading(true);

          try {
            // Fetch all institution data from APIs
            const [overviewRes, ordersRes, activityRes] = await Promise.all([
              fetch(`/api/institutions/${params.slug}/overview`),
              fetch(`/api/institutions/${params.slug}/orders?status=pending,paid,shipped`),
              fetch(`/api/institutions/${params.slug}/activity?limit=10`)
            ]);

            if (overviewRes.ok) {
              const overviewData = await overviewRes.json();
              setInstitutionStats(overviewData.stats);

              // Get selected sports from team data (teams.sports array contains sport slugs)
              const selectedSportSlugs = teamData.sports || [];

              // Fetch sport info for selected sports
              const supabase = getBrowserClient();
              const { data: sportsData } = await supabase
                .from('sports')
                .select('id, name, slug')
                .in('slug', selectedSportSlugs);

              // Transform sub-teams into grouped programs by sport
              const subTeams = overviewData.programs || [];

              // Create a map of sport slug -> program with teams
              const programsMap = new Map<string, any>();

              // First, add all sub-teams to their respective sports
              subTeams.forEach((subTeam: any) => {
                const sportName = subTeam.sports?.name || 'Unknown';
                const sportSlug = subTeam.sports?.slug || 'unknown';

                if (!programsMap.has(sportSlug)) {
                  programsMap.set(sportSlug, {
                    sport: sportName,
                    sportSlug: sportSlug,
                    sportId: subTeam.sport_id,
                    emoji: getEmojiForSport(sportSlug),
                    teams: []
                  });
                }

                programsMap.get(sportSlug).teams.push({
                  id: subTeam.id,
                  name: subTeam.name,
                  slug: subTeam.slug,
                  coach: 'Sin asignar',
                  members: 0,
                  gender_category: subTeam.gender_category || 'male'
                });
              });

              // Then, add any selected sports that don't have sub-teams yet (empty programs)
              sportsData?.forEach((sport: any) => {
                if (!programsMap.has(sport.slug)) {
                  programsMap.set(sport.slug, {
                    sport: sport.name,
                    sportSlug: sport.slug,
                    sportId: sport.id,
                    emoji: getEmojiForSport(sport.slug),
                    teams: [] // Empty program
                  });
                }
              });

              // Convert map to array
              const programsGroupedBySport = Array.from(programsMap.values());

              setInstitutionPrograms(programsGroupedBySport);
            }

            if (ordersRes.ok) {
              const ordersData = await ordersRes.json();
              setInstitutionOrders(ordersData.orders || []);
            }

            if (activityRes.ok) {
              const activityData = await activityRes.json();
              setInstitutionActivity(activityData.activities || []);
            }

            console.log('[Team Page] Institution data loaded successfully');
          } catch (err) {
            console.error('[Team Page] Error loading institution data:', err);
          } finally {
            setInstitutionLoading(false);
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

  // Handler for swapping bench player with starter
  const handlePlayerSwap = async (benchPlayerId: string, starterPlayerId: string) => {
    try {
      const supabase = getBrowserClient();

      // Get both players' created_at timestamps
      const benchPlayer = players.find(p => p.id === benchPlayerId);
      const starterPlayer = players.find(p => p.id === starterPlayerId);

      if (!benchPlayer || !starterPlayer) {
        console.error('Players not found');
        return;
      }

      // Swap their created_at timestamps to change their order
      const { error: benchError } = await supabase
        .from('player_info_submissions')
        .update({ created_at: starterPlayer.created_at })
        .eq('id', benchPlayerId);

      const { error: starterError } = await supabase
        .from('player_info_submissions')
        .update({ created_at: benchPlayer.created_at })
        .eq('id', starterPlayerId);

      if (benchError || starterError) {
        console.error('Error swapping players:', benchError || starterError);
        return;
      }

      // Refresh the players list
      const { data: playersData } = await supabase
        .from('player_info_submissions')
        .select('*')
        .eq('team_id', team?.id)
        .order('created_at', { ascending: false });

      if (playersData) {
        setPlayers(playersData);
      }
    } catch (err) {
      console.error('Error swapping players:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-lg text-gray-300">Cargando equipo...</div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
          <p className="text-gray-300 mb-6">{error || 'Equipo no encontrado'}</p>
          <button
            onClick={() => router.push('/mi-equipo')}
            className="text-[#e21c21] hover:text-[#c11a1e] font-medium"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  // Render organization dashboard
  console.log('[Team Page] 🎨 RENDER DECISION - team.team_type value:', team.team_type);
  console.log('[Team Page] 🎨 Type of team.team_type:', typeof team.team_type);
  console.log('[Team Page] 🎨 Checking: team.team_type === "institution"?', team.team_type === 'institution');
  console.log('[Team Page] 🎨 Checking: team.team_type === "single_team"?', team.team_type === 'single_team');

  if (team.team_type === 'institution') {
    console.log('[Team Page] 📊 RENDERING INSTITUTION DASHBOARD');
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
                onClick={() => router.push(`/mi-equipo/${params.slug}/settings`)}
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
                    <h1 className="text-4xl font-bold text-white mb-2">{team.name}</h1>
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
          <InstitutionStatsCards stats={institutionStats || {
            activeOrders: 0,
            pendingApprovals: 0,
            incompleteOrders: 0,
            paymentCollected: 0,
            paymentTotal: 0,
            total_programs: 0,
            total_members: 0
          }} />

          {/* Active Orders Section */}
          {(() => {
            // Use real institution orders data
            const activeOrders = institutionOrders;

            // Group active orders by order number
            const groupedActiveOrders = activeOrders.reduce((groups, order) => {
              const key = order.order_number || order.id;
              if (!groups[key]) {
                groups[key] = [];
              }
              groups[key].push(order);
              return groups;
            }, {} as Record<string, any[]>);

            // Calculate grand total for active orders
            const activeOrdersGrandTotal = activeOrders.reduce((sum, order) => sum + (order.total_clp || 0), 0);
            const activeOrdersGrandPaid = activeOrders.reduce((sum, order) => {
              // Calculate paid amount from order_items or use a default
              return sum + (order.total_clp || 0); // Will be updated when we have payment status
            }, 0);
            const activeOrdersTotalItems = activeOrders.reduce((sum, order) => {
              return sum + (order.order_items?.length || 0);
            }, 0);

            return activeOrders.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white">Pedidos</h2>
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded-full text-sm font-medium">
                      {Object.keys(groupedActiveOrders).length}
                    </span>
                  </div>
                  <button
                    onClick={() => router.push(`/mi-equipo/${params.slug}/design-request/new`)}
                    className="relative px-4 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md text-white rounded-lg font-medium text-sm overflow-hidden group/btn border border-gray-700 hover:border-blue-500/50 transition-all"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                    <span className="relative">+ Nuevo Pedido</span>
                  </button>
                </div>

                {/* Render each order group in its own container */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {Object.entries(groupedActiveOrders).map(([orderNumber, orders]) => (
                    <div key={orderNumber}>
                      <OrdersTable
                        orders={orders}
                        institutionSlug={params.slug}
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
                          <span className="text-xs text-gray-400">Items:</span>
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
                  <button
                    onClick={() => {
                      if (institutionPrograms.length === 0) {
                        alert('Primero debes agregar al menos un programa deportivo');
                      } else {
                        router.push(`/mi-equipo/${params.slug}/design-request/new`);
                      }
                    }}
                    className="relative px-4 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md text-white rounded-lg font-medium text-sm overflow-hidden group/btn border border-gray-700 hover:border-blue-500/50 transition-all"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                    <span className="relative">+ Nuevo Pedido</span>
                  </button>
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
                            <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400">Items</th>
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
            );
          })()}

          {/* Programs by Sport - Always show so they can add first program */}
          <ProgramsBySport
            programs={institutionPrograms}
            institutionSlug={params.slug}
            onAddProgram={() => setShowAddProgramModal(true)}
            onRefresh={async () => {
              // Reload institution programs
              try {
                const overviewRes = await fetch(`/api/institutions/${params.slug}/overview`);
                if (overviewRes.ok) {
                  const overviewData = await overviewRes.json();

                  // Get selected sports from team data
                  const selectedSportSlugs = team?.sports || [];

                  // Fetch sport info for selected sports
                  const supabase = getBrowserClient();
                  const { data: sportsData } = await supabase
                    .from('sports')
                    .select('id, name, slug')
                    .in('slug', selectedSportSlugs);

                  // Transform sub-teams into grouped programs by sport
                  const subTeams = overviewData.programs || [];

                  // Create a map of sport slug -> program with teams
                  const programsMap = new Map<string, any>();

                  // First, add all sub-teams to their respective sports
                  subTeams.forEach((subTeam: any) => {
                    const sportName = subTeam.sports?.name || 'Unknown';
                    const sportSlug = subTeam.sports?.slug || 'unknown';

                    if (!programsMap.has(sportSlug)) {
                      programsMap.set(sportSlug, {
                        sport: sportName,
                        sportSlug: sportSlug,
                        sportId: subTeam.sport_id,
                        emoji: getEmojiForSport(sportSlug),
                        teams: []
                      });
                    }

                    programsMap.get(sportSlug).teams.push({
                      id: subTeam.id,
                      name: subTeam.name,
                      slug: subTeam.slug,
                      coach: 'Sin asignar',
                      members: 0,
                      gender_category: subTeam.gender_category || 'male'
                    });
                  });

                  // Then, add any selected sports that don't have sub-teams yet (empty programs)
                  sportsData?.forEach((sport: any) => {
                    if (!programsMap.has(sport.slug)) {
                      programsMap.set(sport.slug, {
                        sport: sport.name,
                        sportSlug: sport.slug,
                        sportId: sport.id,
                        emoji: getEmojiForSport(sport.slug),
                        teams: [] // Empty program
                      });
                    }
                  });

                  // Convert map to array
                  const programsGroupedBySport = Array.from(programsMap.values());

                  setInstitutionPrograms(programsGroupedBySport);
                  setInstitutionStats(overviewData.stats);
                }
              } catch (err) {
                console.error('Error reloading institution programs:', err);
              }
            }}
          />

          {/* Activity Feed - Always show, with default creation activity */}
          <ActivityFeed
            activities={institutionActivity.length > 0 ? institutionActivity : [{
              id: 'initial-creation',
              type: 'roster',
              action: `Deserve sirve a ${team?.name || 'Institución'} y ${currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'usuario'}`,
              timestamp: 'Hoy',
              teamSlug: params.slug
            }]}
            institutionSlug={params.slug}
          />
        </div>

        {/* Add Program Modal - Rendered at page level */}
        <AddProgramModal
          isOpen={showAddProgramModal}
          onClose={() => setShowAddProgramModal(false)}
          institutionSlug={params.slug}
          onSuccess={async () => {
            setShowAddProgramModal(false);
            // Reload institution programs
            try {
              const overviewRes = await fetch(`/api/institutions/${params.slug}/overview`);
              if (overviewRes.ok) {
                const overviewData = await overviewRes.json();

                // Get selected sports from team data
                const selectedSportSlugs = team?.sports || [];

                // Fetch sport info for selected sports
                const supabase = getBrowserClient();
                const { data: sportsData } = await supabase
                  .from('sports')
                  .select('id, name, slug')
                  .in('slug', selectedSportSlugs);

                // Transform sub-teams into grouped programs by sport
                const subTeams = overviewData.programs || [];

                // Create a map of sport slug -> program with teams
                const programsMap = new Map<string, any>();

                // First, add all sub-teams to their respective sports
                subTeams.forEach((subTeam: any) => {
                  const sportName = subTeam.sports?.name || 'Unknown';
                  const sportSlug = subTeam.sports?.slug || 'unknown';

                  if (!programsMap.has(sportSlug)) {
                    programsMap.set(sportSlug, {
                      sport: sportName,
                      sportSlug: sportSlug,
                      emoji: getEmojiForSport(sportSlug),
                      teams: []
                    });
                  }

                  programsMap.get(sportSlug).teams.push({
                    id: subTeam.id,
                    name: subTeam.name,
                    slug: subTeam.slug,
                    coach: 'Sin asignar',
                    members: 0
                  });
                });

                // Then, add any selected sports that don't have sub-teams yet (empty programs)
                sportsData?.forEach((sport: any) => {
                  if (!programsMap.has(sport.slug)) {
                    programsMap.set(sport.slug, {
                      sport: sport.name,
                      sportSlug: sport.slug,
                      emoji: getEmojiForSport(sport.slug),
                      teams: [] // Empty program
                    });
                  }
                });

                // Convert map to array
                const programsGroupedBySport = Array.from(programsMap.values());

                setInstitutionPrograms(programsGroupedBySport);
                setInstitutionStats(overviewData.stats);
              }
            } catch (err) {
              console.error('Error reloading institution programs:', err);
            }
          }}
        />
      </div>
    );
  }

  // Render single team dashboard
  console.log('[Team Page] 👥 RENDERING SINGLE TEAM DASHBOARD');
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Team Header Banner */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
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
              onClick={() => router.push(`/mi-equipo/${params.slug}/settings`)}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 text-gray-400 hover:text-white hover:border-[#e21c21]/50 transition-all z-10"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}

          <div className="relative pt-2 pl-6">
            <div className="flex items-center gap-6">
              {/* Team Logo */}
              <div className="relative flex-shrink-0">
                {team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt={`${team.name} logo`}
                    className="w-24 h-24 object-contain rounded-lg border-2 border-gray-700 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 p-2 shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-700 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50">
                    <span className="text-4xl"></span>
                  </div>
                )}
              </div>

              {/* Team Info */}
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-white mb-2">{team.name}</h1>
                <p className="text-gray-300 text-lg">
                  {team.sport?.name || 'Deporte no especificado'}
                  {team.institution_name && ` • ${team.institution_name}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Single Team */}
      <div className="max-w-6xl mx-auto px-6 pb-8 space-y-6">
        {/* Order Overview Section */}
        <TeamOrderOverview teamId={team.id} teamSlug={params.slug} />

        {/* Progress Tracker and Payment Summary - Side by side when both exist */}
        {designRequests.length > 0 && (
          <div className={`grid ${paymentSummary && paymentSummary.totalOrders > 0 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-6`}>
            {/* Progress Tracker */}
            <ProgressTracker
              teamId={team.id}
              designRequestId={designRequests[0].id}
              teamSlug={params.slug}
              isManager={isManager}
              onShareDesign={async () => {
                await loadCollectionLink();
                setShowLinkModal(true);
              }}
            />

            {/* Payment Summary Widget - Concise */}
            {paymentSummary && paymentSummary.totalOrders > 0 && (
              <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-5 border border-gray-700 overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                <div className="flex flex-col gap-4 relative h-full">
                  {/* Title */}
                  <h2 className="text-2xl font-bold text-white relative">
                    Pagos
                  </h2>

                  <div className="flex flex-col gap-3 flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-xs text-gray-400">Pagado</div>
                        <div className="text-lg font-bold text-green-400">
                          ${paymentSummary.totalPaidCents.toLocaleString('es-CL')}
                        </div>
                      </div>

                      <div className="text-gray-600">/</div>

                      <div>
                        <div className="text-xs text-gray-400">Total</div>
                        <div className="text-lg font-bold text-white">
                          ${paymentSummary.totalAmountCents.toLocaleString('es-CL')}
                        </div>
                      </div>
                    </div>

                    {/* Pending payments badge */}
                    {paymentSummary.myPendingPayments > 0 && (
                      <div className="relative bg-gradient-to-br from-yellow-900/30 via-yellow-800/20 to-yellow-900/30 backdrop-blur-sm border border-yellow-500/50 rounded-lg px-3 py-1.5 overflow-hidden w-fit">
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent pointer-events-none"></div>
                        <div className="relative flex items-center gap-2">
                          <span className="text-sm font-medium text-yellow-400">
                            {paymentSummary.myPendingPayments} pendiente{paymentSummary.myPendingPayments > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* All paid badge */}
                    {paymentSummary.totalPendingCents === 0 && (
                      <div className="relative bg-gradient-to-br from-green-900/30 via-green-800/20 to-green-900/30 backdrop-blur-sm border border-green-500/50 rounded-lg px-3 py-1.5 overflow-hidden w-fit">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none"></div>
                        <div className="relative flex items-center gap-2">
                          <span className="text-sm font-medium text-green-400">Completo</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => router.push(`/mi-equipo/${params.slug}/payments`)}
                    className="relative px-4 py-2 bg-gradient-to-br from-blue-600/90 via-blue-700/80 to-blue-800/90 text-white rounded-lg font-medium text-sm overflow-hidden group/btn border border-blue-600/50 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 w-full"
                    style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                    <span className="relative">Ver Detalles →</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Design Requests and Team Lineup Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Design Requests Gallery */}
          <div id="designs-section" className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-5 border border-gray-700 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="flex items-center justify-between mb-4 relative">
              <h2 className="text-2xl font-bold text-white">
                Diseños del Equipo
              </h2>
              <button
                onClick={() => router.push(`/mi-equipo/${params.slug}/design-request/new`)}
                className="relative px-4 py-2 bg-gradient-to-br from-blue-600/90 via-blue-700/80 to-blue-800/90 text-white rounded-lg font-medium text-sm overflow-hidden group/btn border border-blue-600/50 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                <span className="relative">+ Nueva Solicitud</span>
              </button>
            </div>

            {designRequests.length > 0 ? (
              <>
                {/* Carousel pagination */}
                {(() => {
                  const DESIGNS_PER_PAGE = 4;
                  const totalPages = Math.ceil(designRequests.length / DESIGNS_PER_PAGE);
                  const startIndex = currentDesignPage * DESIGNS_PER_PAGE;
                  const endIndex = startIndex + DESIGNS_PER_PAGE;
                  const currentDesigns = designRequests.slice(startIndex, endIndex);

                  return (
                    <>
                      {/* Navigation arrows */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mb-4 relative">
                          <button
                            onClick={() => setCurrentDesignPage(Math.max(0, currentDesignPage - 1))}
                            disabled={currentDesignPage === 0}
                            className={`p-2 rounded-lg border ${
                              currentDesignPage === 0
                                ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                                : 'border-gray-700 text-white hover:border-[#e21c21]/50 hover:bg-gray-800/50'
                            } transition-all`}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <div className="text-sm text-gray-300">
                            Página {currentDesignPage + 1} de {totalPages}
                          </div>
                          <button
                            onClick={() => setCurrentDesignPage(Math.min(totalPages - 1, currentDesignPage + 1))}
                            disabled={currentDesignPage === totalPages - 1}
                            className={`p-2 rounded-lg border ${
                              currentDesignPage === totalPages - 1
                                ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                                : 'border-gray-700 text-white hover:border-[#e21c21]/50 hover:bg-gray-800/50'
                            } transition-all`}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      )}

                      {/* Design cards grid - full width for single card, 2x2 for multiple */}
                      <div className={`grid ${currentDesigns.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-4 relative`}>
                        {currentDesigns.map((request) => (
                <div
                  key={request.id}
                  className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 rounded-lg p-3 hover:border-[#e21c21]/50 overflow-hidden group/card"
                  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none"></div>

                  {/* Mockup Images with overlays */}
                  {request.mockup_urls && request.mockup_urls.length > 0 ? (
                    <div className="mb-3 bg-gray-900/50 rounded-lg p-4 relative border border-gray-700">
                      <img
                        src={request.mockup_urls[0]}
                        alt="Design mockup"
                        className="w-full h-48 object-contain rounded"
                      />

                      {/* Status Badge - Top Left */}
                      <div className="absolute top-2 left-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium shadow-lg ${
                            request.status === 'approved'
                              ? 'bg-green-500/90 text-white border border-green-400'
                              : 'bg-blue-500/90 text-white border border-blue-400'
                          }`}
                        >
                          {request.status === 'approved' ? 'Aprobado' : 'Listo'}
                        </span>
                      </div>

                      {/* Voting Buttons on Image - Show when mockup exists and not approved */}
                      {request.status !== 'approved' && (
                        <>
                          {/* Thumbs Up - Bottom Left */}
                          <button
                            onClick={async () => {
                              const supabase = getBrowserClient();
                              const { data: { user } } = await supabase.auth.getUser();
                              if (!user) return;

                              if (request.user_reaction === 'like') {
                                await supabase
                                  .from('design_request_reactions')
                                  .delete()
                                  .eq('design_request_id', request.id)
                                  .eq('user_id', user.id);
                              } else {
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
                              window.location.reload();
                            }}
                            className={`absolute bottom-2 left-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors shadow-lg ${
                              request.user_reaction === 'like'
                                ? 'bg-green-500/90 text-white border border-green-400'
                                : 'bg-gray-800/90 text-gray-200 border border-gray-600 hover:bg-green-500/80 hover:border-green-400'
                            }`}
                          >
                            <span className="text-sm font-bold">{request.likes_count || 0}</span>
                          </button>

                          {/* Thumbs Down - Bottom Right */}
                          <button
                            onClick={async () => {
                              const supabase = getBrowserClient();
                              const { data: { user } } = await supabase.auth.getUser();
                              if (!user) return;

                              if (request.user_reaction === 'dislike') {
                                await supabase
                                  .from('design_request_reactions')
                                  .delete()
                                  .eq('design_request_id', request.id)
                                  .eq('user_id', user.id);
                              } else {
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
                              window.location.reload();
                            }}
                            className={`absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors shadow-lg ${
                              request.user_reaction === 'dislike'
                                ? 'bg-red-500/90 text-white border border-red-400'
                                : 'bg-gray-800/90 text-gray-200 border border-gray-600 hover:bg-red-500/80 hover:border-red-400'
                            }`}
                          >
                            <span className="text-sm font-bold">{request.dislikes_count || 0}</span>
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="mb-3 bg-gray-900/30 rounded-lg p-12 text-center relative border border-gray-700">
                      <span className="text-4xl"></span>
                      <p className="text-gray-400 text-sm mt-2">Diseño en proceso</p>

                      {/* Status Badge - Top Left for pending designs */}
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-1 rounded-full text-xs font-medium shadow-lg bg-gray-700/90 text-gray-200 border border-gray-600">
                          Pendiente
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Show vote results for approved designs */}
                  {request.status === 'approved' && (request.likes_count > 0 || request.dislikes_count > 0) && (
                    <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-700 relative">
                      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
                        <span className="font-medium text-green-400">{request.likes_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
                        <span className="font-medium text-red-400">{request.dislikes_count || 0}</span>
                      </div>
                      <span className="text-xs text-gray-400 ml-auto">Resultados finales</span>
                    </div>
                  )}

                  {/* Manager Actions */}
                  {isManager && (
                    <div className="flex flex-row gap-2">
                      {/* Share Design - When design has mockup */}
                      {request.mockup_urls && request.mockup_urls.length > 0 && (
                        <button
                          onClick={async () => {
                            await loadCollectionLink();
                            setShowLinkModal(true);
                          }}
                          className="relative flex-1 px-3 py-2 bg-gradient-to-br from-purple-600/90 via-purple-700/80 to-purple-800/90 text-white rounded-lg font-medium text-xs overflow-hidden group/share border border-purple-600/50 shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50"
                          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/share:opacity-100 transition-opacity pointer-events-none"></div>
                          <span className="relative">Compartir</span>
                        </button>
                      )}

                      {/* Approve Design - When design has mockup and is not yet approved */}
                      {(request.status === 'pending' || request.status === 'ready' || request.status === 'ready_for_voting') && request.mockup_urls && request.mockup_urls.length > 0 && (
                        <button
                          onClick={() => setSelectedDesignForApproval(request.id)}
                          className="relative flex-1 px-3 py-2 bg-gradient-to-br from-green-600/90 via-green-700/80 to-green-800/90 text-white rounded-lg font-medium text-xs overflow-hidden group/approve border border-green-600/50 shadow-lg shadow-green-600/30 hover:shadow-green-600/50"
                          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/approve:opacity-100 transition-opacity pointer-events-none"></div>
                          <span className="relative">Aprobar</span>
                        </button>
                      )}

                      {/* View Order - When design is approved */}
                      {request.status === 'approved' && (
                        <button
                          onClick={() => router.push(`/mi-equipo/${params.slug}/payments`)}
                          className="relative flex-1 px-3 py-2 bg-gradient-to-br from-blue-600/90 via-blue-700/80 to-blue-800/90 text-white rounded-lg font-medium text-xs overflow-hidden group/view border border-blue-600/50 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50"
                          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/view:opacity-100 transition-opacity pointer-events-none"></div>
                          <span className="relative">Ver Pagos</span>
                        </button>
                      )}
                    </div>
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
                      className="relative w-full mt-3 px-4 py-2 bg-gradient-to-br from-red-900/30 via-red-800/20 to-red-900/30 text-red-400 border border-red-500/50 rounded-lg hover:border-red-500 font-medium overflow-hidden group/delete"
                      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover/delete:opacity-100 transition-opacity pointer-events-none"></div>
                      <span className="relative">Eliminar Solicitud</span>
                    </button>
                  )}
                </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <div className="text-center py-12 bg-gray-900/30 rounded-lg border border-gray-700 relative">
                <span className="text-6xl mb-4 block"></span>
                <p className="text-gray-400 mb-4 text-lg">No hay solicitudes de diseño todavía</p>
                <p className="text-gray-500 text-sm mb-6">
                  {isManager
                    ? 'Crea tu primera solicitud de diseño para comenzar'
                    : 'Tu equipo aún no ha creado solicitudes de diseño'}
                </p>
                <button
                  onClick={() => router.push(`/dashboard/teams/${team.id}/design`)}
                  className="relative px-6 py-3 bg-gradient-to-br from-blue-600/90 via-blue-700/80 to-blue-800/90 text-white rounded-lg font-medium inline-flex items-center gap-2 overflow-hidden group/create border border-blue-600/50 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50"
                  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/create:opacity-100 transition-opacity pointer-events-none"></div>
                  <span className="relative">+</span>
                  <span className="relative">Crear Primera Solicitud</span>
                </button>
              </div>
            )}
          </div>

          {/* Mini-Field Visualization - Show for latest request */}
          {designRequests.length > 0 && players.length > 0 && (
            <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-5 border border-gray-700 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <MiniFieldMap
                sport={mapSportToSlug(team.sport?.slug)}
                players={players}
                onPlayerClick={(player) => setSelectedPlayer(player)}
                onPlayerSwap={handlePlayerSwap}
                teamSlug={params.slug}
                isManager={isManager}
              />
            </div>
          )}
        </div>

      </div>

      {/* Player Detail Modal */}
      <PlayerDetailModal
        player={selectedPlayer}
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
      />

      {/* Edit/Add My Info Modal */}
      {showEditPlayerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-2xl max-w-lg w-full p-6 border border-gray-700 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="flex justify-between items-center mb-4 relative">
              <h2 className="text-2xl font-bold text-white">
                {editingMyInfo ? 'Editar Mi Información' : 'Agregar Mi Información'}
              </h2>
              <button
                onClick={() => {
                  setShowEditPlayerModal(false);
                  setEditingMyInfo(null);
                  setPlayerFormData({
                    player_name: '',
                    jersey_number: '',
                    size: '',
                    position: '',
                    additional_notes: '',
                  });
                }}
                className="text-gray-400 hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateMyInfo} className="space-y-4 relative">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Nombre del Jugador *
                </label>
                <input
                  type="text"
                  value={playerFormData.player_name}
                  onChange={(e) => setPlayerFormData({ ...playerFormData, player_name: e.target.value })}
                  className="w-full px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Número de Jersey
                  </label>
                  <input
                    type="text"
                    value={playerFormData.jersey_number}
                    onChange={(e) => setPlayerFormData({ ...playerFormData, jersey_number: e.target.value })}
                    className="w-full px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                    placeholder="Ej: 10"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Talla *
                  </label>
                  <select
                    value={playerFormData.size}
                    onChange={(e) => setPlayerFormData({ ...playerFormData, size: e.target.value })}
                    className="w-full px-4 py-2 backdrop-blur-md border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 appearance-none cursor-pointer"
                    style={{
                      backgroundColor: '#0a0a0b',
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem'
                    }}
                    required
                  >
                    <option value="" className="bg-black text-white">Seleccionar</option>
                    <option value="XS" className="bg-black text-white">XS</option>
                    <option value="S" className="bg-black text-white">S</option>
                    <option value="M" className="bg-black text-white">M</option>
                    <option value="L" className="bg-black text-white">L</option>
                    <option value="XL" className="bg-black text-white">XL</option>
                    <option value="XXL" className="bg-black text-white">XXL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Posición
                </label>
                <select
                  value={playerFormData.position}
                  onChange={(e) => setPlayerFormData({ ...playerFormData, position: e.target.value })}
                  className="w-full px-4 py-2 backdrop-blur-md border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 appearance-none cursor-pointer"
                  style={{
                    backgroundColor: '#0a0a0b',
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="" className="bg-black text-white">Seleccionar posición (opcional)</option>
                  {team?.sport?.slug && getFieldLayout(mapSportToSlug(team.sport.slug)).positions.map((pos) => (
                    <option key={pos.name} value={pos.name} className="bg-black text-white">
                      {pos.name} ({pos.abbr})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Notas Adicionales
                </label>
                <textarea
                  value={playerFormData.additional_notes}
                  onChange={(e) => setPlayerFormData({ ...playerFormData, additional_notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 resize-none"
                  placeholder="Información adicional..."
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditPlayerModal(false);
                    setEditingMyInfo(null);
                    setPlayerFormData({
                      player_name: '',
                      jersey_number: '',
                      size: '',
                      position: '',
                      additional_notes: '',
                    });
                  }}
                  className="relative flex-1 px-6 py-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 text-gray-300 hover:text-white rounded-lg border border-gray-700 hover:border-gray-600 font-medium overflow-hidden group/cancel"
                  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/cancel:opacity-100 transition-opacity pointer-events-none"></div>
                  <span className="relative">Cancelar</span>
                </button>
                <button
                  type="submit"
                  className="relative flex-1 px-6 py-2 bg-gradient-to-br from-blue-600/90 via-blue-700/80 to-blue-800/90 text-white rounded-lg font-medium overflow-hidden group/submit border border-blue-600/50 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50"
                  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/submit:opacity-100 transition-opacity pointer-events-none"></div>
                  <span className="relative">{editingMyInfo ? 'Guardar Cambios' : 'Agregar Información'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* Collection Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-2xl max-w-2xl w-full border border-gray-700 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>

            {/* Header */}
            <div className="relative p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white">Enlace de Recolección</h2>
                </div>
                <button
                  onClick={() => {
                    setShowLinkModal(false);
                    setLinkCopied(false);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <span className="text-2xl">✕</span>
                </button>
              </div>
              <p className="text-gray-300 mt-2">
                Comparte este enlace con tu equipo para que completen su información (talla, número, posición)
              </p>
            </div>

            {/* Content */}
            <div className="relative p-6 space-y-6">
              {loadingLink ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                  <p className="text-gray-300 mt-4">Generando enlace...</p>
                </div>
              ) : (
                <>
                  {/* Link Display */}
                  <div className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 rounded-lg p-4 border border-gray-700 overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        URL del Enlace
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={collectionLink || ''}
                          readOnly
                          className="flex-1 bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm"
                        />
                        <button
                          onClick={copyLinkToClipboard}
                          className={`relative px-6 py-3 rounded-lg font-medium overflow-hidden group/copy border transition-all ${
                            linkCopied
                              ? 'bg-gradient-to-br from-green-600/90 via-green-700/80 to-green-800/90 border-green-600/50 shadow-lg shadow-green-600/30'
                              : 'bg-gradient-to-br from-blue-600/90 via-blue-700/80 to-blue-800/90 border-blue-600/50 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50'
                          }`}
                          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/copy:opacity-100 transition-opacity pointer-events-none"></div>
                          <span className="relative text-white whitespace-nowrap">
                            {linkCopied ? 'Copiado' : 'Copiar'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Share Options */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-white">Compartir vía:</h3>

                    {/* WhatsApp */}
                    <button
                      onClick={shareViaWhatsApp}
                      className="relative w-full px-6 py-4 bg-gradient-to-br from-green-600/90 via-green-700/80 to-green-800/90 text-white rounded-lg font-medium overflow-hidden group/whatsapp border border-green-600/50 shadow-lg shadow-green-600/30 hover:shadow-green-600/50"
                      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/whatsapp:opacity-100 transition-opacity pointer-events-none"></div>
                      <div className="relative flex items-center justify-center gap-3">
                        <span className="text-lg">Compartir por WhatsApp</span>
                      </div>
                    </button>
                  </div>

                  {/* Info Box */}
                  <div className="relative bg-gradient-to-br from-blue-900/30 via-blue-800/20 to-blue-900/30 backdrop-blur-sm border border-blue-500/50 rounded-lg p-4 overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="relative flex gap-3">
                      <div className="text-sm text-blue-200">
                        <p className="font-semibold mb-1">¿Cómo funciona?</p>
                        <ul className="space-y-1 text-blue-300/80">
                          <li>• Los jugadores acceden al enlace desde cualquier dispositivo</li>
                          <li>• Completan su información (nombre, talla, número, posición)</li>
                          <li>• Los datos se guardan automáticamente en el sistema</li>
                          <li>• Puedes ver el progreso en tiempo real</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="relative p-6 border-t border-gray-700 flex justify-end">
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  setLinkCopied(false);
                }}
                className="relative px-6 py-2 bg-gradient-to-br from-gray-700/90 via-gray-800/80 to-gray-900/90 text-white rounded-lg font-medium overflow-hidden group/close border border-gray-600/50 hover:border-gray-500/50"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/close:opacity-100 transition-opacity pointer-events-none"></div>
                <span className="relative">Cerrar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
