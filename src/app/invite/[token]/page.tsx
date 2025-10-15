'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';

interface InviteData {
  id: string;
  team_id: string;
  player_submission_id: string | null;
  email: string | null;
  role: string;
  status: string;
  expires_at: string;
  team: {
    name: string;
    slug: string;
  };
  player: {
    player_name: string;
  } | null;
}

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const supabase = getBrowserClient();

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    loadInviteData();
  }, [params.token]);

  const loadInviteData = async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      // Fetch invite by token
      const response = await fetch(`/api/invites/${params.token}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invite not found');
        setLoading(false);
        return;
      }

      setInvite(data.invite);

      // If user is logged in, check if they're already a member of this team
      if (currentUser && data.invite?.team_id) {
        console.log('[Invite] Checking if user is already a member of team:', data.invite.team_id);

        const { data: membership, error: membershipError } = await supabase
          .from('team_memberships')
          .select('role')
          .eq('team_id', data.invite.team_id)
          .eq('user_id', currentUser.id)
          .maybeSingle();

        console.log('[Invite] Membership check result:', { membership, error: membershipError?.message });

        if (membership) {
          console.log('[Invite] User is already a member! Role:', membership.role);
          setAlreadyMember(true);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('[Invite] Error loading invite:', err);
      setError('Failed to load invite');
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!invite || !user) return;

    setAccepting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in to accept this invite');
        router.push(`/login?redirect=/invite/${params.token}`);
        return;
      }

      const response = await fetch(`/api/invites/${params.token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to accept invite');
        setAccepting(false);
        return;
      }

      alert('Invite accepted! You are now a member of the team.');
      router.push(`/mi-equipo?team=${invite.team_id}`);
    } catch (error) {
      console.error('[Invite] Error accepting invite:', error);
      alert('Failed to accept invite');
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-[#e21c21] mx-auto"></div>
          <p className="mt-4 text-gray-300">Cargando invitación...</p>
        </div>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-700">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>

          <div className="relative">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
              <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Invitación No Encontrada</h1>
            <p className="text-gray-400 mb-6">
              {error || 'Esta invitación puede haber expirado, sido cancelada, o no es válida.'}
            </p>
            <button
              onClick={() => router.push('/')}
              className="relative px-6 py-3 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">Ir al Inicio</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check if invite is expired
  const isExpired = new Date(invite.expires_at) < new Date();
  const isAccepted = invite.status !== 'pending';

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-700">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>

          <div className="relative">
            <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/30">
              <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Invitación Expirada</h1>
            <p className="text-gray-400 mb-6">
              Esta invitación expiró el {new Date(invite.expires_at).toLocaleDateString()}.
              Por favor contacta al administrador del equipo para una nueva invitación.
            </p>
            <button
              onClick={() => router.push('/')}
              className="relative px-6 py-3 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">Ir al Inicio</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isAccepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-700">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>

          <div className="relative">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
              <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Invitación Ya Aceptada</h1>
            <p className="text-gray-400 mb-6">
              Esta invitación ya ha sido aceptada.
            </p>
            <button
              onClick={() => router.push(`/mi-equipo?team=${invite.team_id}`)}
              className="relative px-6 py-3 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">Ir al Equipo</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (alreadyMember && invite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-700">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>

          <div className="relative">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
              <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">¡Ya Eres Miembro!</h1>
            <p className="text-gray-400 mb-6">
              Ya eres parte de <strong className="text-white">{invite.team.name}</strong>. ¡No necesitas aceptar esta invitación de nuevo!
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push(`/mi-equipo/${invite.team.slug}`)}
                className="relative w-full px-6 py-3 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <span className="relative">Ir a la Página del Equipo</span>
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="relative w-full px-6 py-3 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md text-gray-300 rounded-lg font-semibold transition-all border border-gray-700 hover:border-gray-600 overflow-hidden group"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <span className="relative">Ir al Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-xl shadow-2xl p-8 max-w-md w-full border border-gray-700">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>

        <div className="relative">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-[#e21c21]/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#e21c21]/30">
              <svg className="w-10 h-10 text-[#e21c21]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              ¡Estás Invitado!
            </h1>
            <p className="text-gray-400">
              Únete a <strong className="text-white">{invite.team.name}</strong> como {invite.role}
            </p>
          </div>

          {invite.player && (
            <div className="relative bg-[#e21c21]/10 rounded-lg p-4 mb-6 border border-[#e21c21]/20">
              <p className="text-sm text-gray-300">
                <strong className="text-white">Nota:</strong> Esta invitación es específicamente para{' '}
                <strong className="text-white">{invite.player.player_name}</strong>. Al aceptar, tu cuenta
                se vinculará a este registro de jugador.
              </p>
            </div>
          )}

          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between py-3 border-b border-gray-700">
              <span className="text-gray-400">Equipo:</span>
              <span className="font-semibold text-white">{invite.team.name}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-700">
              <span className="text-gray-400">Rol:</span>
              <span className="font-semibold text-white capitalize">{invite.role}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-700">
              <span className="text-gray-400">Expira:</span>
              <span className="font-semibold text-white">
                {new Date(invite.expires_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {!user ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 text-center mb-4">
                Necesitas iniciar sesión o crear una cuenta para aceptar esta invitación
              </p>
              <button
                onClick={() => router.push(`/login?redirect=/invite/${params.token}`)}
                className="relative w-full px-6 py-3 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <span className="relative">Iniciar Sesión</span>
              </button>
              <button
                onClick={() => router.push(`/register?redirect=/invite/${params.token}`)}
                className="relative w-full px-6 py-3 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md text-gray-300 rounded-lg font-semibold transition-all border border-[#e21c21]/50 hover:border-[#e21c21] overflow-hidden group"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <span className="relative">Crear Cuenta</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 text-center mb-4">
                Conectado como <strong className="text-white">{user.email}</strong>
              </p>
              <button
                onClick={handleAcceptInvite}
                disabled={accepting}
                className="relative w-full px-6 py-3 bg-gradient-to-br from-green-600/90 to-green-700/90 backdrop-blur-md text-white rounded-lg font-semibold transition-all shadow-lg shadow-green-600/30 hover:shadow-green-600/50 border border-green-600/50 overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <span className="relative">{accepting ? 'Aceptando...' : 'Aceptar Invitación'}</span>
              </button>
              <button
                onClick={() => router.push('/')}
                className="relative w-full px-6 py-3 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md text-gray-300 rounded-lg font-semibold transition-all border border-gray-700 hover:border-gray-600 overflow-hidden group"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <span className="relative">Rechazar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
