'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { CustomizeBanner } from '@/components/customize/CustomizeBanner';
import { PlayerDashboard } from '@/components/dashboard/PlayerDashboard';
import { ManagerDashboard } from '@/components/dashboard/ManagerDashboard';

interface Team {
  id: string;
  slug: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  logo_url?: string;
  owner_id: string;
  created_at: string;
}

interface TeamMembership {
  team_id: string;
  user_id: string;
  role: string;
  team: Team;
}

interface TeamMember {
  user_id: string;
  role: string;
  profiles?: {
    email: string;
    full_name?: string;
  };
}

interface DesignRequest {
  id: string;
  status: string;
  product_name: string;
  product_slug: string;
  sport_slug: string;
  created_at: string;
  output_url?: string;
  mockup_urls?: string[];
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  order_id?: string;
  user_type?: string; // 'player' or 'manager'
}

interface Order {
  id: string;
  status: string;
  payment_status: string;
  total_amount_cents: number;
  created_at: string;
}

export default function MyTeamPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getBrowserClient();

  // Get team ID from URL params (for team switching)
  const teamIdFromUrl = searchParams.get('team');

  const [user, setUser] = useState<any>(null);
  const [allTeams, setAllTeams] = useState<TeamMembership[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('player');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [designRequests, setDesignRequests] = useState<DesignRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareLink, setShareLink] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [showTeamSwitcher, setShowTeamSwitcher] = useState(false);

  // Determine dashboard type based on team composition
  const [dashboardType, setDashboardType] = useState<'player' | 'manager'>('player');
  const [manualOverride, setManualOverride] = useState(false); // Track if user manually changed view

  useEffect(() => {
    loadAllTeams();
  }, []);

  useEffect(() => {
    if (currentTeam && user) {
      loadTeamData();
    }
  }, [currentTeam, user]);

  // Check for celebration
  useEffect(() => {
    const isNewTeam = sessionStorage.getItem('newTeamCreated');
    if (isNewTeam === 'true') {
      setTimeout(() => setShowCelebration(true), 500);
      setTimeout(() => setShowCelebration(false), 3500);
      sessionStorage.removeItem('newTeamCreated');
    }
  }, []);

  // Poll for rendering designs
  useEffect(() => {
    const hasRendering = designRequests.some((dr) => dr.status === 'rendering');
    if (hasRendering) {
      const interval = setInterval(() => {
        loadTeamData();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [designRequests]);

  const loadAllTeams = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        router.push('/');
        return;
      }

      setUser(currentUser);

      // Get all teams user is a member of
      const { data: memberships } = await supabase
        .from('team_memberships')
        .select('team_id, user_id, role, team:teams(*)')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (!memberships || memberships.length === 0) {
        // No teams yet, redirect to catalog
        setLoading(false);
        router.push('/catalog');
        return;
      }

      setAllTeams(memberships as any);

      // Determine which team to show
      let selectedTeam: Team | null = null;
      let userRole = 'player';

      if (teamIdFromUrl) {
        // If team ID in URL, use that
        const membership = memberships.find((m: any) => m.team.id === teamIdFromUrl);
        if (membership) {
          selectedTeam = (membership as any).team;
          userRole = (membership as any).role;
        }
      }

      if (!selectedTeam) {
        // Default to first team (most recently created)
        selectedTeam = (memberships[0] as any).team;
        userRole = (memberships[0] as any).role;
      }

      setCurrentTeam(selectedTeam);
      setCurrentUserRole(userRole);
    } catch (error) {
      console.error('Error loading teams:', error);
      setLoading(false);
    }
  };

  const loadTeamData = async () => {
    if (!currentTeam || !user) return;

    try {
      // Share link
      setShareLink(`${window.location.origin}/join/${currentTeam.slug}`);

      // Get members with profile info
      const { data: membersData } = await supabase
        .from('team_memberships')
        .select('user_id, role, profiles(email, full_name)')
        .eq('team_id', currentTeam.id);

      setMembers(membersData || []);

      // Get all design requests for this team
      const { data: requestsData } = await supabase
        .from('design_requests')
        .select('*')
        .eq('team_id', currentTeam.id)
        .order('created_at', { ascending: false});

      setDesignRequests(requestsData || []);

      // Get all orders for this team
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('team_id', currentTeam.id)
        .order('created_at', { ascending: false });

      setOrders(ordersData || []);

      // Only auto-detect dashboard type if user hasn't manually overridden it
      if (!manualOverride) {
        // Determine dashboard type based on:
        // 1. Current user's role
        // 2. Team size
        // 3. Design request user_type
        const isManager = currentUserRole === 'owner' || currentUserRole === 'manager';
        const hasManagerDesigns = requestsData?.some((dr) => dr.user_type === 'manager');
        const isLargeTeam = (membersData?.length || 0) > 15;

        if (isManager || hasManagerDesigns || isLargeTeam) {
          setDashboardType('manager');
        } else {
          setDashboardType('player');
        }
      }
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchTeam = (teamId: string) => {
    const membership = allTeams.find((t) => t.team.id === teamId);
    if (membership) {
      setCurrentTeam(membership.team);
      setCurrentUserRole(membership.role);
      setShowTeamSwitcher(false);
      // Update URL without reload
      window.history.pushState({}, '', `/mi-equipo?team=${teamId}`);
    }
  };

  const handleInvite = async (email: string) => {
    if (!email || !currentTeam) return;

    try {
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

      await supabase.from('team_invites').insert({
        team_id: currentTeam.id,
        email: email,
        token,
      });

      const response = await fetch('/api/send-team-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          teamSlug: currentTeam.slug,
          teamName: currentTeam.name,
          inviterName: user?.email || 'teammate',
          token,
        }),
      });

      if (response.ok) {
        alert(`¡Invitación enviada a ${email}!`);
      } else {
        alert('Error al enviar invitación');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al enviar invitación');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  if (!currentTeam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Crea tu primer diseño</h1>
          <button
            onClick={() => router.push('/catalog')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Ver Catálogo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Celebration */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-fall"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-${Math.random() * 20}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 2}s`,
                }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: [currentTeam.colors.primary, currentTeam.colors.secondary, currentTeam.colors.accent][i % 3],
                  }}
                />
              </div>
            ))}
          </div>
          <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-white rounded-2xl shadow-2xl px-12 py-8 border-4" style={{ borderColor: currentTeam.colors.primary }}>
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold mb-2" style={{ color: currentTeam.colors.primary }}>
                ¡Bienvenido!
              </h2>
              <p className="text-gray-600">Tu diseño está siendo procesado</p>
            </div>
          </div>
        </div>
      )}

      {/* Team Switcher Dropdown */}
      {showTeamSwitcher && allTeams.length > 1 && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowTeamSwitcher(false)}>
          <div
            className="absolute top-20 left-1/2 transform -translate-x-1/2 w-80 bg-white rounded-lg shadow-xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">Cambiar de Equipo</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {allTeams.map((membership) => (
                <button
                  key={membership.team.id}
                  onClick={() => switchTeam(membership.team.id)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    currentTeam.id === membership.team.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-3 h-8 rounded" style={{ backgroundColor: membership.team.colors.primary }} />
                      <div className="w-3 h-8 rounded" style={{ backgroundColor: membership.team.colors.secondary }} />
                    </div>
                    <div>
                      <p className="font-semibold">{membership.team.name}</p>
                      <p className="text-xs text-gray-600 capitalize">{membership.role}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Banner with Team Switcher */}
      <div className="relative">
        <CustomizeBanner
          teamName={currentTeam.name}
          customColors={currentTeam.colors}
          customLogoUrl={currentTeam.logo_url}
          readonly={true}
        />

        {/* Team Switcher Button - Only show if user has multiple teams */}
        {allTeams.length > 1 && (
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setShowTeamSwitcher(!showTeamSwitcher)}
              className="px-4 py-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-lg shadow-md flex items-center gap-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 12h12M8 17h12M3 7h.01M3 12h.01M3 17h.01" />
              </svg>
              {allTeams.length} Equipos
            </button>
          </div>
        )}
      </div>

      {/* Dashboard Type Toggle (for testing/preference) */}
      <div className="max-w-7xl mx-auto px-4 pt-64 pb-4">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              setDashboardType('player');
              setManualOverride(true);
            }}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
              dashboardType === 'player'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Vista Jugador
          </button>
          <button
            onClick={() => {
              setDashboardType('manager');
              setManualOverride(true);
            }}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
              dashboardType === 'manager'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Vista Manager
          </button>
        </div>
      </div>

      {/* Render appropriate dashboard based on type */}
      {dashboardType === 'player' ? (
        <PlayerDashboard
          team={currentTeam}
          designRequests={designRequests}
          orders={orders}
          members={members}
          currentUserId={user.id}
          shareLink={shareLink}
          onInvite={handleInvite}
        />
      ) : (
        <ManagerDashboard
          team={currentTeam}
          designRequests={designRequests}
          orders={orders}
          members={members}
          currentUserId={user.id}
          shareLink={shareLink}
          onInvite={handleInvite}
        />
      )}
    </div>
  );
}
