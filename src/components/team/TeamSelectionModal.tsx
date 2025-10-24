'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

type Team = {
  id: string;
  name: string;
  slug: string;
  sport: string;
  institution_name?: string;
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
};

type TeamSelectionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onTeamSelected: (team: Team) => void;
  onCreateNew: () => void;
  onJoinTeam: (teamSlug: string) => Promise<void>;
  userId: string;
  preSelectedSport?: string;
};

export function TeamSelectionModal({
  isOpen,
  onClose,
  onTeamSelected,
  onCreateNew,
  onJoinTeam,
  userId,
  preSelectedSport,
}: TeamSelectionModalProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [joinTeamSlug, setJoinTeamSlug] = useState('');
  const [joiningTeam, setJoiningTeam] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const supabase = getBrowserClient();

  useEffect(() => {
    if (!isOpen || !userId) return;

    async function loadUserTeams() {
      try {
        // Get teams where user is a member
        const { data: memberships, error: membershipsError } = await supabase
          .from('team_memberships')
          .select('team_id')
          .eq('user_id', userId);

        if (membershipsError) throw membershipsError;

        if (!memberships || memberships.length === 0) {
          setTeams([]);
          setLoading(false);
          return;
        }

        const teamIds = memberships.map((m: any) => m.team_id);

        // Get team details
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .in('id', teamIds)
          .order('created_at', { ascending: false });

        if (teamsError) throw teamsError;

        setTeams(teamsData || []);
      } catch (error: any) {
        logger.error('Error loading teams:', error);
      } finally {
        setLoading(false);
      }
    }

    loadUserTeams();
  }, [isOpen, userId, supabase]);

  const handleConfirm = useCallback(() => {
    if (!selectedTeamId) return;

    const team = teams.find((t) => t.id === selectedTeamId);
    if (team) {
      onTeamSelected(team);
    }
  }, [selectedTeamId, teams, onTeamSelected]);

  const handleJoinTeam = useCallback(async () => {
    if (!joinTeamSlug.trim()) {
      setJoinError('Por favor ingresa un código de equipo');
      return;
    }

    setJoiningTeam(true);
    setJoinError(null);

    try {
      await onJoinTeam(joinTeamSlug.trim());
      // Parent will handle the rest (joining team and proceeding with design request)
    } catch (error: any) {
      setJoinError(error.message || 'Error al unirse al equipo');
    } finally {
      setJoiningTeam(false);
    }
  }, [joinTeamSlug, onJoinTeam]);

  const handleTeamSelect = useCallback((teamId: string) => {
    setSelectedTeamId(teamId);
  }, []);

  const handleJoinSlugChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setJoinTeamSlug(e.target.value);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Selecciona un Equipo</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Elige el equipo al que pertenece este diseño o crea uno nuevo
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Cargando equipos...</div>
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">No tienes equipos todavía</div>
              <p className="text-sm text-gray-400 mb-6">
                Crea tu primer equipo para continuar
              </p>
              <button
                onClick={onCreateNew}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                + Crear Nuevo Equipo
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Existing Teams */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Tus Equipos</h3>
                <div className="space-y-2">
                  {teams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => handleTeamSelect(team.id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedTeamId === team.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{team.name}</h4>
                          <p className="text-sm text-gray-600">
                            {team.sport}
                            {team.institution_name && ` • ${team.institution_name}`}
                          </p>
                        </div>
                        {selectedTeamId === team.id && (
                          <div className="ml-3">
                            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      {team.colors && (
                        <div className="mt-3 flex gap-2">
                          {team.colors.primary && (
                            <div
                              className="w-6 h-6 rounded border border-gray-200"
                              style={{ backgroundColor: team.colors.primary }}
                            />
                          )}
                          {team.colors.secondary && (
                            <div
                              className="w-6 h-6 rounded border border-gray-200"
                              style={{ backgroundColor: team.colors.secondary }}
                            />
                          )}
                          {team.colors.accent && (
                            <div
                              className="w-6 h-6 rounded border border-gray-200"
                              style={{ backgroundColor: team.colors.accent }}
                            />
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Join Existing Team */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">O únete a un equipo existente</h3>
                <div className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50">
                  <p className="text-sm text-gray-600 mb-3">
                    Si tienes un código o link de invitación, ingrésalo aquí:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={joinTeamSlug}
                      onChange={handleJoinSlugChange}
                      placeholder="codigo-del-equipo"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    <button
                      onClick={handleJoinTeam}
                      disabled={joiningTeam || !joinTeamSlug.trim()}
                      className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                        joiningTeam || !joinTeamSlug.trim()
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {joiningTeam ? 'Uniéndose...' : 'Unirse'}
                    </button>
                  </div>
                  {joinError && (
                    <div className="mt-2 text-sm text-red-600">
                      {joinError}
                    </div>
                  )}
                </div>
              </div>

              {/* Create New Option */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">O crea uno nuevo</h3>
                <button
                  onClick={onCreateNew}
                  className="w-full p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all text-center"
                >
                  <div className="text-blue-600 font-semibold">+ Crear Nuevo Equipo</div>
                  <p className="text-sm text-gray-500 mt-1">
                    Para un nuevo proyecto o institución
                  </p>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {teams.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedTeamId}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  selectedTeamId
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Confirmar Equipo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
