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
};

export default function TeamPlayersPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [team, setTeam] = useState<any>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [designRequest, setDesignRequest] = useState<any>(null);
  const [isManager, setIsManager] = useState(false);
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
  }, [params.slug]);

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
        .eq('slug', params.slug)
        .single();

      if (teamError) throw teamError;

      // Extract sport slug from joined data
      const sportSlug = (teamData as any).sports?.slug || null;
      setTeam({ ...teamData, sport: sportSlug });

      // Check if user is manager
      const { data: membership } = await supabase
        .from('team_memberships')
        .select('role')
        .eq('team_id', teamData.id)
        .eq('user_id', user.id)
        .single();

      const userRole = membership?.role || (teamData.current_owner_id === user.id ? 'owner' : null);
      const isManagerUser = userRole === 'owner' || userRole === 'manager';
      setIsManager(isManagerUser);

      if (!isManagerUser) {
        throw new Error('Solo los managers pueden acceder a esta página');
      }

      // Get latest design request
      let { data: designData } = await supabase
        .from('design_requests')
        .select('*')
        .eq('team_id', teamData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // If no design request exists, create a default one for player management
      if (!designData) {
        const { data: newDesignRequest, error: createError } = await supabase
          .from('design_requests')
          .insert({
            team_id: teamData.id,
            requested_by: user.id,
            user_id: user.id,
            user_type: 'manager',
            status: 'pending'
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating default design request:', createError);
        } else {
          designData = newDesignRequest;
        }
      }

      setDesignRequest(designData);

      // Get ALL player info submissions for this team (not just for one design request)
      const { data: playersData, error: playersError } = await supabase
        .from('player_info_submissions')
        .select('*')
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

    if (!designRequest) {
      alert('Primero debes tener una solicitud de diseño activa');
      return;
    }

    try {
      const supabase = getBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('player_info_submissions')
        .insert({
          team_id: team.id,
          design_request_id: designRequest.id,
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

      const { error } = await supabase
        .from('player_info_submissions')
        .delete()
        .eq('id', playerId);

      if (error) throw error;

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Cargando...</div>
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
            onClick={() => router.push(`/mi-equipo/${params.slug}`)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Volver al equipo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.push(`/mi-equipo/${params.slug}`)}
            className="mb-4 text-white/90 hover:text-white font-medium flex items-center gap-2"
          >
            ← Volver al equipo
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">👥 Información de Jugadores</h1>
              <p className="text-white/80">{team.name}</p>
            </div>

            <div className="text-center bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3">
              <div className="text-3xl font-bold text-white">{players.length}</div>
              <div className="text-white/80 text-sm">Jugadores</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {!designRequest ? (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">📋</span>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                No hay solicitud de diseño activa
              </h2>
              <p className="text-gray-600 mb-6">
                Necesitas una solicitud de diseño aprobada para agregar información de jugadores
              </p>
              <button
                onClick={() => router.push(`/mi-equipo/${params.slug}`)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Ver Dashboard del Equipo
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Actions Bar */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between">
              <div className="flex gap-3">
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                >
                  <span>+</span>
                  Agregar Jugador
                </button>

                <button
                  onClick={() => {
                    setShowLinkModal(true);
                    if (!collectionLink) {
                      loadCollectionLink();
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
                >
                  <span>🔗</span>
                  Enlace de Recolección
                </button>
              </div>

              <div className="text-sm text-gray-600">
                <span className="font-semibold">{players.length}</span> jugadores registrados
              </div>
            </div>

            {/* Players Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {players.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-4xl mb-4 block">👕</span>
                  <p className="text-gray-500 mb-4">No hay jugadores registrados todavía</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Agregar primer jugador
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nombre
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Número
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Talla
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Posición
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notas
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {players.map((player) => (
                        <tr key={player.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{player.player_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                            {player.jersey_number || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                              {player.size}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                            {player.position || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                            {player.additional_notes || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => startEdit(player)}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeletePlayer(player.id)}
                              className="text-red-600 hover:text-red-900"
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
        )}
      </div>

      {/* Add/Edit Player Modal */}
      {(showAddModal || editingPlayer) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
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
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={editingPlayer ? handleUpdatePlayer : handleAddPlayer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Jugador *
                </label>
                <input
                  type="text"
                  value={formData.player_name}
                  onChange={(e) => setFormData({ ...formData, player_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Jersey
                  </label>
                  <input
                    type="text"
                    value={formData.jersey_number}
                    onChange={(e) => setFormData({ ...formData, jersey_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: 10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Talla *
                  </label>
                  <select
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Posición
                </label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas Adicionales
                </label>
                <textarea
                  value={formData.additional_notes}
                  onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
                  className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  {editingPlayer ? 'Guardar Cambios' : 'Agregar Jugador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collection Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">🔗 Enlace de Recolección</h2>
              <button
                onClick={() => setShowLinkModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <strong>📋 Instrucciones:</strong> Comparte este enlace con tus jugadores para que
                  puedan enviar su información (nombre, número, talla, posición) sin necesidad de
                  crear una cuenta.
                </p>
              </div>

              {loadingLink ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-4 text-gray-600">Generando enlace...</span>
                </div>
              ) : collectionLink ? (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enlace de Recolección
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={collectionLink}
                        readOnly
                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono"
                      />
                      <button
                        onClick={copyLinkToClipboard}
                        className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                          linkCopied
                            ? 'bg-green-600 text-white'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {linkCopied ? '✓ Copiado' : 'Copiar'}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={shareViaWhatsApp}
                      className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
                    >
                      <span>📱</span>
                      Compartir por WhatsApp
                    </button>
                  </div>

                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">💡 Consejos:</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• El enlace no expira y puede ser usado múltiples veces</li>
                      <li>• Los jugadores pueden enviar su información sin registrarse</li>
                      <li>• Todas las sumisiones aparecerán en esta tabla automáticamente</li>
                    </ul>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No se pudo cargar el enlace. Por favor intenta de nuevo.
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
