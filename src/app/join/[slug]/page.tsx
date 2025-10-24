'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import { MiniFieldMap } from '@/components/team/MiniFieldMap';
import type { SportSlug } from '@/types/catalog';

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
  sport?: SportSlug;
}

export default function JoinTeamPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const supabase = getBrowserClient();

  const [team, setTeam] = useState<Team | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [email, setEmail] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<any[]>([]);

  useEffect(() => {
    loadTeam();
  }, [slug]);

  // Handle auth callback and auto-join
  useEffect(() => {
    const handleAuthCallback = async () => {
      // Check if we just got back from a magic link
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      if (hashParams.get('access_token')) {
        // Auth successful, reload user state
        const { data: { user: authenticatedUser } } = await supabase.auth.getUser();
        if (authenticatedUser && team) {
          setUser(authenticatedUser);
          // Auto-join the team
          await handleJoinTeam();
        }
      }
    };

    if (team && !loading) {
      handleAuthCallback();
    }
  }, [team, loading]);

  const loadTeam = async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      // Get team with sport information
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select(`
          *,
          sports:sport_id (
            id,
            slug,
            name
          )
        `)
        .eq('slug', slug)
        .single();

      if (teamError) throw teamError;

      // Extract sport slug from joined data
      const sportSlug = (teamData as any).sports?.slug || null;
      setTeam({ ...teamData, sport: sportSlug });

      // Get current team players for field visualization
      const { data: players } = await supabase
        .from('team_players')
        .select('*')
        .eq('team_id', teamData.id)
        .order('created_at', { ascending: true });

      console.log('[Join Team] Loaded team players:', players?.length || 0);
      setTeamPlayers(players || []);

      // If user is already authenticated, check if they're already a member
      if (currentUser) {
        const { data: membership } = await supabase
          .from('team_memberships')
          .select('*')
          .eq('team_id', teamData.id)
          .eq('user_id', currentUser.id)
          .single();

        if (membership) {
          // Already a member, redirect to team page
          router.push(`/mi-equipo/${slug}`);
          return;
        }
      }
    } catch (error) {
      logger.error('Error loading team:', toError(error));
      setError('Equipo no encontrado');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/join/${slug}${token ? `?token=${token}` : ''}`,
        },
      });

      if (authError) {
        // Check for rate limit error
        if (authError.message?.includes('can only request this after')) {
          const match = authError.message.match(/(\d+)\s+seconds/);
          const seconds = match ? match[1] : '60';
          throw new Error(
            `Por favor espera ${seconds} segundos antes de solicitar otro link. Si ya recibiste un link en tu email, úsalo.`
          );
        }
        throw authError;
      }

      alert('¡Link mágico enviado! Revisa tu email para continuar.');
    } catch (error: any) {
      logger.error('Error sending magic link:', toError(error));
      setError(error.message || 'Error al enviar el link. Intenta de nuevo.');
    }
  };

  const handleJoinTeam = async () => {
    if (!user || !team) return;

    setJoining(true);
    setError(null);

    try {
      // Get user's full profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, user_type, athletic_profile, manager_profile')
        .eq('id', user.id)
        .single();

      // If user doesn't have user_type, they need to complete profile setup
      if (!profile?.user_type) {
        console.log('[Join Team] User has no user_type, redirecting to profile setup');
        router.push(`/profile/setup?welcome=true&next=${encodeURIComponent(`/join/${slug}${token ? `?token=${token}` : ''}`)}`);
        return;
      }

      // If user is manager/director joining as player, upgrade to hybrid
      if (profile.user_type === 'manager' || profile.user_type === 'athletic_director') {
        console.log('[Join Team] Manager/Director joining as player, upgrading to hybrid');

        // Create basic athletic_profile
        const basicAthleticProfile = {
          sports: team.sport ? [team.sport] : [],
          primary_sport: team.sport || '',
          positions: [],
          jersey_number: '',
          gender: null,
        };

        // Upgrade to hybrid
        await supabase
          .from('profiles')
          .update({
            user_type: 'hybrid',
            athletic_profile: basicAthleticProfile
          })
          .eq('id', user.id);

        console.log('[Join Team] User upgraded to hybrid successfully');
      }

      // Add user to team
      const { error: joinError } = await supabase
        .from('team_memberships')
        .insert({
          team_id: team.id,
          user_id: user.id,
          role: 'player',
        });

      if (joinError) throw joinError;

      // If there's a token, mark the invite as accepted
      if (token) {
        await supabase
          .from('team_invites')
          .update({ accepted: true })
          .eq('token', token);
      }

      // Redirect to team page
      router.push(`/mi-equipo/${slug}`);
    } catch (error: any) {
      logger.error('Error joining team:', toError(error));
      setError('Error al unirte al equipo. Intenta de nuevo.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-[#e21c21] mx-auto"></div>
          <p className="mt-4 text-gray-300">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error && !team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-xl shadow-2xl p-8 border border-gray-700 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>

          <div className="relative">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
              <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">{error}</h1>
            <button
              onClick={() => router.push('/')}
              className="relative px-6 py-3 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">Volver al inicio</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!team) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header with team colors */}
      <div
        className="h-64 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${team.colors.primary}, ${team.colors.secondary}, ${team.colors.accent})`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20"></div>
        <div className="max-w-3xl mx-auto px-4 h-full flex items-center justify-center relative z-10">
          <div className="text-center">
            {team.logo_url && (
              <div className="w-32 h-32 rounded-full bg-white/10 backdrop-blur-md border-4 border-white/30 shadow-2xl overflow-hidden mx-auto mb-6">
                <Image
                  src={team.logo_url}
                  alt="Logo del equipo"
                  width={128}
                  height={128}
                  className="object-cover"
                />
              </div>
            )}
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-2xl">
              ¡Te invitaron a {team.name}!
            </h1>
            <p className="text-white text-lg md:text-xl opacity-90 drop-shadow-lg">
              Únete para ver diseños y coordinar pedidos
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-16 pb-12">
        {/* Mini Field Preview */}
        {team.sport && teamPlayers.length > 0 && (
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-xl shadow-2xl p-6 mb-6 border border-gray-700">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>
            <div className="relative">
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-white mb-2">
                  🎯 ¡Conoce a tu futuro equipo!
                </h2>
                <p className="text-gray-300">
                  Mira quién ya está en el equipo
                </p>
              </div>
              <MiniFieldMap
                sport={team.sport}
                players={teamPlayers}
              />
            </div>
          </div>
        )}

        <div className="max-w-md mx-auto relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-xl shadow-2xl p-8 border border-gray-700">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>

          <div className="relative">
            {!user ? (
              // Not authenticated - show magic link form
              <>
                <h2 className="text-2xl font-bold text-white mb-6 text-center">
                  Ingresa con tu email
                </h2>
                <form onSubmit={handleSendMagicLink} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#e21c21] focus:border-[#e21c21] outline-none transition-all"
                      required
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-500/20 text-red-300 text-sm rounded-lg border border-red-500/30">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="relative w-full py-3 px-6 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white font-semibold rounded-lg transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group"
                    style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <span className="relative">Enviar link mágico</span>
                  </button>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    Te enviaremos un link para iniciar sesión sin contraseña
                  </p>
                </form>
              </>
            ) : (
              // Authenticated - show join button
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                    <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    ¡Listo para unirte!
                  </h2>
                  <p className="text-gray-400">
                    Estás conectado como <span className="font-medium text-white">{user.email}</span>
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/20 text-red-300 text-sm rounded-lg mb-4 border border-red-500/30">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleJoinTeam}
                  disabled={joining}
                  className="relative w-full py-3 px-6 bg-gradient-to-br from-green-600/90 to-green-700/90 backdrop-blur-md text-white font-semibold rounded-lg transition-all shadow-lg shadow-green-600/30 hover:shadow-green-600/50 border border-green-600/50 overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  <span className="relative">{joining ? 'Uniéndote...' : `Unirme a ${team.name}`}</span>
                </button>

                <button
                  onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
                  className="w-full mt-3 py-2 px-6 text-gray-400 hover:text-gray-200 text-sm transition-colors"
                >
                  Usar otra cuenta
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
