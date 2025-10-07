'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { CustomizeBanner } from '@/components/customize/CustomizeBanner';
import { SplitPayButton } from '@/components/payment/SplitPayButton';

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

interface TeamMember {
  user_id: string;
  role: string;
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
}

export default function MyTeamPage() {
  const router = useRouter();
  const supabase = getBrowserClient();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [designRequests, setDesignRequests] = useState<DesignRequest[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    loadTeamData();
  }, []);

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

  const loadTeamData = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        router.push('/');
        return;
      }

      setUser(currentUser);

      // Get user's team
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('owner_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!teamData) {
        // No team yet, redirect to catalog
        router.push('/catalog');
        return;
      }

      setTeam(teamData);

      // Share link
      setShareLink(`${window.location.origin}/join/${teamData.slug}`);

      // Get members
      const { data: membersData } = await supabase
        .from('team_memberships')
        .select('user_id, role')
        .eq('team_id', teamData.id);

      setMembers(membersData || []);

      // Get all design requests
      const { data: requestsData } = await supabase
        .from('design_requests')
        .select('*')
        .eq('team_id', teamData.id)
        .order('created_at', { ascending: false });

      setDesignRequests(requestsData || []);
    } catch (error) {
      console.error('Error loading team:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !team) return;

    setInviting(true);
    try {
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

      await supabase.from('team_invites').insert({
        team_id: team.id,
        email: inviteEmail,
        token,
      });

      const response = await fetch('/api/send-team-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          teamSlug: team.slug,
          teamName: team.name,
          inviterName: user?.email || 'teammate',
          token,
        }),
      });

      if (response.ok) {
        alert(`¡Invitación enviada a ${inviteEmail}!`);
        setInviteEmail('');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  if (!team) {
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
                    backgroundColor: [team.colors.primary, team.colors.secondary, team.colors.accent][i % 3],
                  }}
                />
              </div>
            ))}
          </div>
          <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-white rounded-2xl shadow-2xl px-12 py-8 border-4" style={{ borderColor: team.colors.primary }}>
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold mb-2" style={{ color: team.colors.primary }}>
                ¡Bienvenido!
              </h2>
              <p className="text-gray-600">Tu diseño está siendo procesado</p>
            </div>
          </div>
        </div>
      )}

      {/* Banner */}
      <CustomizeBanner
        teamName={team.name}
        customColors={team.colors}
        customLogoUrl={team.logo_url}
        readonly={true}
      />

      <div className="max-w-6xl mx-auto px-4 py-12 pt-64">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2 space-y-8">
            {/* Designs */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Mis Diseños</h2>
                <button
                  onClick={() => router.push('/catalog')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  + Nuevo Diseño
                </button>
              </div>

              {designRequests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">No tienes diseños aún</p>
                  <button
                    onClick={() => router.push('/catalog')}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Crear primer diseño
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {designRequests.map((req) => (
                    <div key={req.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold">{req.product_name}</h3>
                          <p className="text-sm text-gray-600 capitalize">{req.sport_slug}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(req.created_at).toLocaleDateString('es-CL')}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm h-fit ${
                            req.status === 'ready'
                              ? 'bg-green-100 text-green-800'
                              : req.status === 'rendering'
                              ? 'bg-blue-100 text-blue-800 animate-pulse'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {req.status === 'ready' ? '✓ Listo' : req.status === 'rendering' ? '⏳ Generando...' : '📝 Pendiente'}
                        </span>
                      </div>

                      {/* Colors */}
                      <div className="flex gap-2 mb-3">
                        <div className="w-8 h-8 rounded border" style={{ backgroundColor: req.primary_color }} />
                        <div className="w-8 h-8 rounded border" style={{ backgroundColor: req.secondary_color }} />
                        <div className="w-8 h-8 rounded border" style={{ backgroundColor: req.accent_color }} />
                      </div>

                      {/* Mockups */}
                      {req.status === 'ready' && req.mockup_urls && req.mockup_urls.length > 0 && (
                        <div className="mb-3 grid grid-cols-2 gap-2">
                          {req.mockup_urls.slice(0, 2).map((url, i) => (
                            <Image key={i} src={url} alt={`Mockup ${i + 1}`} width={200} height={200} className="rounded border w-full" />
                          ))}
                        </div>
                      )}

                      {/* Payment - Show for all statuses for testing */}
                      {user && req.order_id && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm font-semibold mb-2">Pagar este diseño (Prueba - CLP $500)</p>
                          <SplitPayButton orderId={req.order_id} userId={user.id} amountCents={50000} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Members */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">Miembros ({members.length})</h2>
              <div className="space-y-3">
                {members.map((m) => (
                  <div key={m.user_id} className="flex justify-between py-3 border-b last:border-0">
                    <div>
                      <p className="font-medium">{m.user_id === user?.id ? 'Tú' : `Miembro ${m.user_id.substring(0, 8)}`}</p>
                      <p className="text-sm text-gray-600 capitalize">{m.role}</p>
                    </div>
                    {m.user_id === team.owner_id && (
                      <span className="px-2 py-1 text-xs rounded-full" style={{ backgroundColor: `${team.colors.primary}20`, color: team.colors.primary }}>
                        Propietario
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Share */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Compartir</h3>
              <div className="flex gap-2">
                <input type="text" value={shareLink} readOnly className="flex-1 px-3 py-2 text-sm border rounded bg-gray-50" />
                <button
                  onClick={() => { navigator.clipboard.writeText(shareLink); alert('Copiado!'); }}
                  className="px-4 py-2 text-white text-sm rounded"
                  style={{ background: `linear-gradient(135deg, ${team.colors.primary}, ${team.colors.accent})` }}
                >
                  Copiar
                </button>
              </div>
            </div>

            {/* Invite */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Invitar</h3>
              <form onSubmit={handleInvite} className="space-y-3">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@ejemplo.com"
                  className="w-full px-3 py-2 border rounded"
                  required
                />
                <button
                  type="submit"
                  disabled={inviting}
                  className="w-full px-4 py-2 text-white rounded disabled:bg-gray-400"
                  style={!inviting ? { background: `linear-gradient(135deg, ${team.colors.primary}, ${team.colors.accent})` } : {}}
                >
                  {inviting ? 'Enviando...' : 'Enviar'}
                </button>
              </form>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Acciones</h3>
              <div className="space-y-2">
                <button onClick={() => router.push('/catalog')} className="w-full px-4 py-2 border rounded hover:bg-gray-50 text-sm">
                  Ver Catálogo
                </button>
                <button onClick={() => router.push('/personaliza')} className="w-full px-4 py-2 border rounded hover:bg-gray-50 text-sm">
                  Personalizar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
