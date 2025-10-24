'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { getFieldLayout, type SportSlug } from '@/lib/sports/fieldLayouts';

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

type PlayerInfo = {
  id: string;
  player_name: string;
  jersey_number: string;
  size: string;
  position: string;
  additional_notes?: string;
  created_at: string;
  confirmed_by_player?: boolean;
  confirmation_date?: string;
  confirmation_method?: string;
  user_id?: string | null;
};

export default function TeamPlayersPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const [team, setTeam] = useState<any>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [designRequest, setDesignRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for adding/editing players
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerInfo | null>(null);
  const [formData, setFormData] = useState({
    player_name: '',
    jersey_number: '',
    size: '',
    position: '',
    additional_notes: '',
  });

  // Collection link state
  const [collectionLink, setCollectionLink] = useState<string | null>(null);
  const [loadingLink, setLoadingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

  useEffect(() => {
    loadTeamAndPlayers();
  }, [slug]);

  async function loadTeamAndPlayers() {
    try {
      const supabase = getBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get team with sport info (join with sports table)
      const { data: teamData, error: teamError} = await supabase
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

      // Get team logo from settings
      const { data: settingsData } = await supabase
        .from('team_settings')
        .select('logo_url')
        .eq('team_id', teamData.id)
        .single();

      // Extract sport slug from joined data
      const sportSlug = (teamData as any).sports?.slug || null;
      setTeam({ ...teamData, sport: sportSlug, logo_url: settingsData?.logo_url });

      // Get latest design request (DO NOT auto-create - users should create via "+ Nueva Solicitud")
      const { data: designData } = await supabase
        .from('design_requests')
        .select('*')
        .eq('team_id', teamData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setDesignRequest(designData);

      // Get ALL player info submissions for this team (not just for one design request)
      const { data: playersData, error: playersError } = await supabase
        .from('player_info_submissions')
        .select('*, confirmed_by_player, confirmation_date, confirmation_method, user_id')
        .eq('team_id', teamData.id)
        .order('created_at', { ascending: false });

      if (playersError) throw playersError;
      setPlayers(playersData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.player_name.trim() || !formData.size) {
      alert('Por favor completa el nombre y la talla del jugador');
      return;
    }

    try {
      const supabase = getBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('player_info_submissions')
        .insert({
          team_id: team.id,
          design_request_id: designRequest?.id || null, // Optional - can be NULL for manager-only teams
          player_name: formData.player_name.trim(),
          jersey_number: formData.jersey_number.trim() || null,
          size: formData.size,
          position: formData.position.trim() || null,
          additional_notes: formData.additional_notes.trim() || null,
          submitted_by_manager: true,
          user_id: null, // Manager-added players have no account yet - will be linked when they accept invite
        })
        .select()
        .single();

      if (error) throw error;

      setPlayers([data, ...players]);
      setFormData({
        player_name: '',
        jersey_number: '',
        size: '',
        position: '',
        additional_notes: '',
      });
      setShowAddModal(false);
    } catch (error: any) {
      alert(`Error al agregar jugador: ${error.message}`);
    }
  };

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingPlayer) return;

    try {
      const supabase = getBrowserClient();

      const { data, error } = await supabase
        .from('player_info_submissions')
        .update({
          player_name: formData.player_name.trim(),
          jersey_number: formData.jersey_number.trim() || null,
          size: formData.size,
          position: formData.position.trim() || null,
          additional_notes: formData.additional_notes.trim() || null,
        })
        .eq('id', editingPlayer.id)
        .select()
        .single();

      if (error) throw error;

      setPlayers(players.map((p) => (p.id === editingPlayer.id ? data : p)));
      setEditingPlayer(null);
      setFormData({
        player_name: '',
        jersey_number: '',
        size: '',
        position: '',
        additional_notes: '',
      });
    } catch (error: any) {
      alert(`Error al actualizar jugador: ${error.message}`);
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm('¿Estás seguro de eliminar este jugador?')) return;

    try {
      const supabase = getBrowserClient();

      // Find the player to get their user_id
      const player = players.find((p) => p.id === playerId);

      console.log('[Delete Player] Deleting player:', { playerId, userId: player?.user_id });

      // 1. Delete from player_info_submissions (roster table)
      const { error: submissionError } = await supabase
        .from('player_info_submissions')
        .delete()
        .eq('id', playerId);

      if (submissionError) {
        console.error('[Delete Player] Error deleting from player_info_submissions:', submissionError);
        throw submissionError;
      }

      // 2. Delete from team_players (mini field table) if user_id exists
      if (player?.user_id && team?.id) {
        const { error: teamPlayerError } = await supabase
          .from('team_players')
          .delete()
          .eq('team_id', team.id)
          .eq('user_id', player.user_id);

        if (teamPlayerError) {
          console.error('[Delete Player] Error deleting from team_players:', teamPlayerError);
          // Don't throw - continue with deletion
        } else {
          console.log('[Delete Player] Removed from team_players');
        }
      }

      // 3. Delete from team_memberships (team access) if user_id exists
      if (player?.user_id && team?.id) {
        const { error: membershipError } = await supabase
          .from('team_memberships')
          .delete()
          .eq('team_id', team.id)
          .eq('user_id', player.user_id);

        if (membershipError) {
          console.error('[Delete Player] Error deleting from team_memberships:', membershipError);
          // Don't throw - continue with deletion
        } else {
          console.log('[Delete Player] Removed from team_memberships');
        }
      }

      console.log('[Delete Player] Successfully deleted player from all tables');
      setPlayers(players.filter((p) => p.id !== playerId));
    } catch (error: any) {
      alert(`Error al eliminar jugador: ${error.message}`);
    }
  };

  const startEdit = (player: PlayerInfo) => {
    setEditingPlayer(player);
    setFormData({
      player_name: player.player_name,
      jersey_number: player.jersey_number || '',
      size: player.size,
      position: player.position || '',
      additional_notes: player.additional_notes || '',
    });
  };

  const loadCollectionLink = async () => {
    if (!team) return;

    setLoadingLink(true);
    try {
      const response = await fetch(`/api/teams/${team.id}/collection-link`);
      if (!response.ok) throw new Error('Failed to load collection link');

      const data = await response.json();
      setCollectionLink(data.url);
    } catch (error: any) {
      alert(`Error al cargar el enlace: ${error.message}`);
    } finally {
      setLoadingLink(false);
    }
  };

  const copyLinkToClipboard = () => {
    if (!collectionLink) return;

    navigator.clipboard.writeText(collectionLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const shareViaWhatsApp = () => {
    if (!collectionLink || !team) return;

    const message = encodeURIComponent(
      `🏆 ${team.name}\n\n` +
      `Por favor, completa tu información de jugador usando este enlace:\n\n` +
      `${collectionLink}\n\n` +
      `¡Gracias!`
    );

    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-lg text-gray-300">Cargando...</div>
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
            onClick={() => router.push(`/mi-equipo/${slug}`)}
            className="text-[#e21c21] hover:text-[#c11a1e] font-medium"
          >
            ← Volver al equipo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Team Header Banner */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

          {/* Back Arrow - Top Left */}
          <button
            onClick={() => router.push(`/mi-equipo/${slug}`)}
            className="absolute top-2 left-2 p-1.5 rounded-md bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 text-gray-400 hover:text-white hover:border-[#e21c21]/50 transition-all z-10"
            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

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
                    <span className="text-4xl">🏆</span>
                  </div>
                )}
              </div>

              {/* Team Info */}
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-white mb-2">{team.name}</h1>
                <p className="text-gray-300 text-lg">
                  Gestión de Jugadores • {players.length} {players.length === 1 ? 'jugador' : 'jugadores'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* NOTE: Collection link works without design request, but adding players manually requires one */}
          <>
            {/* Actions Bar */}
            <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-4 mb-6 flex items-center justify-between border border-gray-700 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <div className="flex gap-3 relative">
                <button
                  onClick={() => {
                    setShowAddModal(true);
                    setEditingPlayer(null);
                    setFormData({
                      player_name: '',
                      jersey_number: '',
                      size: '',
                      position: '',
                      additional_notes: '',
                    });
                  }}
                  className="relative px-4 py-2 bg-gradient-to-br from-blue-600/90 via-blue-700/80 to-blue-800/90 text-white rounded-lg font-medium flex items-center gap-2 overflow-hidden group/add border border-blue-600/50 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50"
                  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/add:opacity-100 transition-opacity pointer-events-none"></div>
                  <span className="relative">+</span>
                  <span className="relative">Agregar Jugador</span>
                </button>

                <button
                  onClick={() => {
                    setShowLinkModal(true);
                    if (!collectionLink) {
                      loadCollectionLink();
                    }
                  }}
                  className="relative px-4 py-2 bg-gradient-to-br from-green-600/90 via-green-700/80 to-green-800/90 text-white rounded-lg font-medium flex items-center gap-2 overflow-hidden group/link border border-green-600/50 shadow-lg shadow-green-600/30 hover:shadow-green-600/50"
                  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/link:opacity-100 transition-opacity pointer-events-none"></div>
                  <span className="relative">🔗</span>
                  <span className="relative">Enlace de Recolección</span>
                </button>
              </div>

              <div className="text-sm text-gray-300 relative flex items-center gap-4">
                <span>
                  <span className="font-semibold text-white">{players.length}</span> jugadores registrados
                </span>
                <span className="text-gray-600">|</span>
                <span className="inline-flex items-center gap-1">
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-semibold text-green-400">{players.filter(p => p.confirmed_by_player).length}</span>
                  <span>confirmados</span>
                </span>
                {players.filter(p => !p.confirmed_by_player).length > 0 && (
                  <>
                    <span className="text-gray-600">|</span>
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="font-semibold text-yellow-400">{players.filter(p => !p.confirmed_by_player).length}</span>
                      <span>pendientes</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Players Table */}
            <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl overflow-hidden border border-gray-700 group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              {players.length === 0 ? (
                <div className="text-center py-12 relative">
                  <span className="text-4xl mb-4 block">👕</span>
                  <p className="text-gray-300 mb-4">No hay jugadores registrados todavía</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    + Agregar primer jugador
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto relative">
                  <table className="w-full">
                    <thead className="bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border-b border-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Nombre
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Número
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Talla
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Posición
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Notas
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {players.map((player) => (
                        <tr key={player.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-white">{player.player_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                            {player.jersey_number || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded">
                              {player.size}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                            {player.position || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {player.confirmed_by_player ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/50 rounded">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Confirmado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 rounded">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Pendiente
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate">
                            {player.additional_notes || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => startEdit(player)}
                              className="text-blue-400 hover:text-blue-300 mr-4"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeletePlayer(player.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
      </div>

      {/* Add/Edit Player Modal */}
      {(showAddModal || editingPlayer) && (
        <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-2xl max-w-lg w-full p-6 border border-gray-700 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="flex justify-between items-center mb-4 relative">
              <h2 className="text-2xl font-bold text-white">
                {editingPlayer ? 'Editar Jugador' : 'Agregar Jugador'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingPlayer(null);
                  setFormData({
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

            <form onSubmit={editingPlayer ? handleUpdatePlayer : handleAddPlayer} className="space-y-4 relative">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Nombre del Jugador *
                </label>
                <input
                  type="text"
                  value={formData.player_name}
                  onChange={(e) => setFormData({ ...formData, player_name: e.target.value })}
                  className="w-full px-4 py-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Número de Jersey
                  </label>
                  <input
                    type="text"
                    value={formData.jersey_number}
                    onChange={(e) => setFormData({ ...formData, jersey_number: e.target.value })}
                    className="w-full px-4 py-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    placeholder="Ej: 10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Talla *
                  </label>
                  <select
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="w-full px-4 py-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    required
                  >
                    <option value="">Seleccionar</option>
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Posición
                </label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-4 py-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                >
                  <option value="">Seleccionar posición (opcional)</option>
                  {getFieldLayout(mapSportToSlug(team?.sport)).positions.map((pos) => (
                    <option key={pos.name} value={pos.name}>
                      {pos.name} ({pos.abbr})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Notas Adicionales
                </label>
                <textarea
                  value={formData.additional_notes}
                  onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                  placeholder="Información adicional..."
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingPlayer(null);
                    setFormData({
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
                  <span className="relative">{editingPlayer ? 'Guardar Cambios' : 'Agregar Jugador'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collection Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-2xl max-w-2xl w-full p-6 border border-gray-700 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="flex justify-between items-center mb-6 relative">
              <h2 className="text-2xl font-bold text-white">🔗 Enlace de Recolección</h2>
              <button
                onClick={() => setShowLinkModal(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6 relative">
              <div className="relative bg-gradient-to-br from-blue-900/30 via-blue-800/20 to-blue-900/30 backdrop-blur-sm border border-blue-500/50 rounded-lg p-4 mb-4 overflow-hidden group/info">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none"></div>
                <p className="text-sm text-blue-300 relative">
                  <strong>📋 Instrucciones:</strong> Comparte este enlace con tus jugadores para que
                  puedan enviar su información (nombre, número, talla, posición) sin necesidad de
                  crear una cuenta.
                </p>
              </div>

              {loadingLink ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-4 text-gray-300">Generando enlace...</span>
                </div>
              ) : collectionLink ? (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-white mb-2">
                      Enlace de Recolección
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={collectionLink}
                        readOnly
                        className="flex-1 px-4 py-3 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 rounded-lg text-sm font-mono text-gray-300"
                      />
                      <button
                        onClick={copyLinkToClipboard}
                        className={`relative px-6 py-3 rounded-lg font-medium overflow-hidden group/copy border ${
                          linkCopied
                            ? 'bg-gradient-to-br from-green-600/90 via-green-700/80 to-green-800/90 text-white border-green-600/50 shadow-lg shadow-green-600/30'
                            : 'bg-gradient-to-br from-blue-600/90 via-blue-700/80 to-blue-800/90 text-white border-blue-600/50 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50'
                        }`}
                        style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/copy:opacity-100 transition-opacity pointer-events-none"></div>
                        <span className="relative">{linkCopied ? '✓ Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={shareViaWhatsApp}
                      className="relative flex-1 px-6 py-3 bg-gradient-to-br from-green-600/90 via-green-700/80 to-green-800/90 text-white rounded-lg font-medium flex items-center justify-center gap-2 overflow-hidden group/whatsapp border border-green-600/50 shadow-lg shadow-green-600/30 hover:shadow-green-600/50"
                      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/whatsapp:opacity-100 transition-opacity pointer-events-none"></div>
                      <span className="relative">📱</span>
                      <span className="relative">Compartir por WhatsApp</span>
                    </button>
                  </div>

                  <div className="relative mt-6 p-4 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 rounded-lg border border-gray-700 overflow-hidden group/tips">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/tips:opacity-100 transition-opacity pointer-events-none"></div>
                    <h3 className="font-semibold text-white mb-2 relative">💡 Consejos:</h3>
                    <ul className="text-sm text-gray-300 space-y-1 relative">
                      <li>• El enlace no expira y puede ser usado múltiples veces</li>
                      <li>• Los jugadores pueden enviar su información sin registrarse</li>
                      <li>• Todas las sumisiones aparecerán en esta tabla automáticamente</li>
                    </ul>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No se pudo cargar el enlace. Por favor intenta de nuevo.
                </div>
              )}
            </div>

            <div className="flex justify-end relative">
              <button
                onClick={() => setShowLinkModal(false)}
                className="relative px-6 py-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 text-gray-300 hover:text-white rounded-lg border border-gray-700 hover:border-gray-600 font-medium overflow-hidden group/close"
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
