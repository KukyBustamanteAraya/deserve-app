'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Team {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
  } | null;
  logo_url?: string | null;
  sports?: { name: string } | null;
}

interface TeamListClientProps {
  teams: Team[];
}

export function TeamListClient({ teams }: TeamListClientProps) {
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = getBrowserClient();

  const toggleSelection = (teamId: string) => {
    const newSelected = new Set(selectedTeams);
    if (newSelected.has(teamId)) {
      newSelected.delete(teamId);
    } else {
      newSelected.add(teamId);
    }
    setSelectedTeams(newSelected);
  };

  const selectAll = () => {
    if (selectedTeams.size === teams.length) {
      setSelectedTeams(new Set());
    } else {
      setSelectedTeams(new Set(teams.map(t => t.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTeams.size === 0) return;

    const count = selectedTeams.size;
    if (!confirm(`¿Estás seguro de que quieres eliminar ${count} equipo${count > 1 ? 's' : ''}? Esta acción eliminará todos los diseños y miembros asociados.`)) {
      return;
    }

    setDeleting(true);
    try {
      const teamIds = Array.from(selectedTeams);

      // Delete related records first
      // 1. Delete design requests
      await supabase
        .from('design_requests')
        .delete()
        .in('team_id', teamIds);

      // 2. Delete team memberships
      await supabase
        .from('team_memberships')
        .delete()
        .in('team_id', teamIds);

      // 3. Delete team invites
      await supabase
        .from('team_invites')
        .delete()
        .in('team_id', teamIds);

      // 4. Finally delete the teams
      const { error } = await supabase
        .from('teams')
        .delete()
        .in('id', teamIds);

      if (error) throw error;

      setSelectedTeams(new Set());
      router.refresh();
    } catch (error) {
      console.error('Error deleting teams:', error);
      alert('Error al eliminar los equipos. Por favor intenta de nuevo.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSingle = async (teamId: string, teamName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`¿Estás seguro de que quieres eliminar "${teamName}"? Esta acción eliminará todos los diseños y miembros asociados.`)) {
      return;
    }

    setDeleting(true);
    try {
      // Delete related records first
      // 1. Delete design requests
      await supabase
        .from('design_requests')
        .delete()
        .eq('team_id', teamId);

      // 2. Delete team memberships
      await supabase
        .from('team_memberships')
        .delete()
        .eq('team_id', teamId);

      // 3. Delete team invites
      await supabase
        .from('team_invites')
        .delete()
        .eq('team_id', teamId);

      // 4. Finally delete the team
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      router.refresh();
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Error al eliminar el equipo. Por favor intenta de nuevo.');
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Your Teams ({teams.length})</h2>
          {selectedTeams.size > 0 && (
            <span className="text-sm text-blue-600 font-medium">
              {selectedTeams.size} seleccionado{selectedTeams.size > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {selectedTeams.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {deleting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Eliminando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar ({selectedTeams.size})
                </>
              )}
            </button>
          )}
          <button
            onClick={selectAll}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            {selectedTeams.size === teams.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {teams.map((team) => {
          const isSelected = selectedTeams.has(team.id);
          return (
            <div
              key={team.id}
              className={`flex items-center gap-3 p-4 border rounded-lg transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'hover:border-blue-300 hover:shadow-md'
              }`}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelection(team.id)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />

              {/* Team Info - Clickable Link */}
              <Link
                href="/mi-equipo"
                className="flex-1 flex justify-between items-center gap-4"
              >
                <div className="flex items-center gap-4">
                  {/* Team Colors Preview */}
                  {team.colors && (
                    <div className="flex gap-1">
                      <div
                        className="w-3 h-12 rounded-l"
                        style={{ backgroundColor: team.colors.primary }}
                        title="Color primario"
                      />
                      <div
                        className="w-3 h-12"
                        style={{ backgroundColor: team.colors.secondary }}
                        title="Color secundario"
                      />
                      <div
                        className="w-3 h-12 rounded-r"
                        style={{ backgroundColor: team.colors.accent }}
                        title="Color acento"
                      />
                    </div>
                  )}

                  {/* Team Info */}
                  <div>
                    <p className="font-medium text-gray-900">{team.name}</p>
                    <p className="text-sm text-gray-600">{team.sports?.name || 'Unknown Sport'}</p>
                    <p className="text-xs text-gray-400">
                      Created {new Date(team.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>

              {/* Delete Single Button */}
              <button
                onClick={(e) => handleDeleteSingle(team.id, team.name, e)}
                disabled={deleting}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Eliminar equipo"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
