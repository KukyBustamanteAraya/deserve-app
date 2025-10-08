'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import Image from 'next/image';

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
}

export default function JoinTeamPage({ params }: { params: { slug: string } }) {
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

  useEffect(() => {
    loadTeam();
  }, [params.slug]);

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

      // Get team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('slug', params.slug)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

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
          router.push(`/mi-equipo/${params.slug}`);
          return;
        }
      }
    } catch (error) {
      console.error('Error loading team:', error);
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
          emailRedirectTo: `${window.location.origin}/join/${params.slug}${token ? `?token=${token}` : ''}`,
        },
      });

      if (authError) throw authError;

      alert('¡Link mágico enviado! Revisa tu email para continuar.');
    } catch (error: any) {
      console.error('Error sending magic link:', error);
      setError(error.message || 'Error al enviar el link. Intenta de nuevo.');
    }
  };

  const handleJoinTeam = async () => {
    if (!user || !team) return;

    setJoining(true);
    setError(null);

    try {
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
      router.push(`/mi-equipo/${params.slug}`);
    } catch (error: any) {
      console.error('Error joining team:', error);
      setError('Error al unirte al equipo. Intenta de nuevo.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  if (error && !team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{error}</h1>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-700"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (!team) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with team colors */}
      <div
        className="h-64 relative"
        style={{
          background: `linear-gradient(135deg, ${team.colors.primary}, ${team.colors.secondary}, ${team.colors.accent})`,
        }}
      >
        <div className="max-w-3xl mx-auto px-4 h-full flex items-center justify-center">
          <div className="text-center">
            {team.logo_url && (
              <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-2xl overflow-hidden mx-auto mb-6">
                <Image
                  src={team.logo_url}
                  alt="Logo del equipo"
                  width={128}
                  height={128}
                  className="object-cover"
                />
              </div>
            )}
            <h1 className="text-5xl font-bold text-white mb-2">
              ¡Te invitaron a {team.name}!
            </h1>
            <p className="text-white text-xl opacity-90">Únete para ver diseños y coordinar pedidos</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-16">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {!user ? (
            // Not authenticated - show magic link form
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Ingresa con tu email
              </h2>
              <form onSubmit={handleSendMagicLink} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Enviar link mágico
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
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  ¡Listo para unirte!
                </h2>
                <p className="text-gray-600">
                  Estás conectado como <span className="font-medium">{user.email}</span>
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg mb-4">
                  {error}
                </div>
              )}

              <button
                onClick={handleJoinTeam}
                disabled={joining}
                className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-400"
              >
                {joining ? 'Uniéndote...' : `Unirme a ${team.name}`}
              </button>

              <button
                onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
                className="w-full mt-3 py-2 px-6 text-gray-600 hover:text-gray-800 text-sm"
              >
                Usar otra cuenta
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
