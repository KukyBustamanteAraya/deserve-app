'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InstitutionProgram } from '@/lib/mockData/institutionData';
import { CreateTeamModal } from './CreateTeamModal';

interface DesignRequest {
  id: string | number;
  sub_team_id: string;
  status: string;
  created_at: string;
}

interface ProgramsBySportProps {
  programs: InstitutionProgram[];
  institutionSlug: string;
  designRequests?: DesignRequest[];
  onRefresh?: () => void;
  onAddProgram?: () => void;
  canAddPrograms?: boolean;
}

export function ProgramsBySport({ programs, institutionSlug, designRequests = [], onRefresh, onAddProgram, canAddPrograms = false }: ProgramsBySportProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [selectedSport, setSelectedSport] = useState<{ id: number; name: string } | null>(null);

  // Helper function to check if a sub-team has active design requests
  const hasActiveDesignRequest = (teamId: string) => {
    return designRequests.some(dr => dr.sub_team_id === teamId);
  };

  // Helper function to check if a program (sport) has any active design requests
  const programHasDesignRequests = (program: InstitutionProgram) => {
    return program.teams.some(team => hasActiveDesignRequest(team.id));
  };

  // Get gender symbol SVG
  const getGenderSymbol = (genderCategory: string) => {
    if (genderCategory === 'male') {
      return (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <circle cx="10" cy="14" r="6" />
          <path d="M16 8l6-6m0 0h-5m5 0v5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    } else if (genderCategory === 'female') {
      return (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <circle cx="12" cy="8" r="6" />
          <path d="M12 14v8m-3-3h6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    } else {
      // both
      return (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
  };

  const getGenderColor = (genderCategory: string) => {
    if (genderCategory === 'male') return 'text-blue-400';
    if (genderCategory === 'female') return 'text-pink-400';
    return 'text-purple-400';
  };

  const getGenderLabel = (genderCategory: string) => {
    if (genderCategory === 'male') return 'Hombres';
    if (genderCategory === 'female') return 'Mujeres';
    return 'Ambos';
  };

  if (programs.length === 0) {
    return (
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

        <div className="relative p-6">
          <h2 className="text-lg font-bold text-white mb-6">Programas Deportivos</h2>

          {/* Sport Tabs - Show placeholder tab with + button */}
          <div className="grid grid-cols-4 gap-2 mb-6 border-b border-gray-700 pb-4">
            {/* Add Program Button as first tab - Only show if user has permission */}
            {canAddPrograms && (
              <button
                onClick={() => onAddProgram?.()}
                className="relative px-3 py-2 rounded-lg text-sm font-medium transition-all overflow-hidden group/add bg-gradient-to-br from-gray-800/30 via-black/20 to-gray-900/30 text-gray-300 border border-dashed border-gray-700 hover:border-[#e21c21]/50 hover:text-white"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/add:opacity-100 transition-opacity pointer-events-none"></div>
                <div className="relative flex items-center justify-center">
                  <span className="text-lg">+</span>
                </div>
              </button>
            )}
          </div>

          {/* Empty state message */}
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">
              {canAddPrograms
                ? <>Haz clic en el botón <span className="text-white font-medium">+</span> para agregar tu primer programa deportivo</>
                : 'No hay programas deportivos aún. Contacta al Director Atlético para agregar programas.'
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  const activeProgram = programs[activeTab];

  return (
    <>
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

        <div className="relative p-6">
          <h2 className="text-lg font-bold text-white mb-6">Programas Deportivos</h2>

          {/* Sport Tabs */}
          <div className="grid grid-cols-4 gap-2 mb-6 border-b border-gray-700 pb-4">
            {programs.map((program, index) => {
              const hasDesignRequests = programHasDesignRequests(program);
              return (
                <button
                  key={program.sportSlug}
                  onClick={() => setActiveTab(index)}
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all overflow-hidden group/tab ${
                    activeTab === index
                      ? 'bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white border border-[#e21c21]/50 shadow-lg shadow-[#e21c21]/30'
                      : 'bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 text-gray-300 border border-gray-700 hover:border-gray-600'
                  }`}
                  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/tab:opacity-100 transition-opacity pointer-events-none"></div>
                  <div className="relative flex items-center justify-center gap-1.5">
                    <span>{program.sport}</span>
                    <span className="text-xs opacity-75">({program.teams.length})</span>
                    {hasDesignRequests && (
                      <span className="flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Add Program Button - Only show if user has permission */}
            {canAddPrograms && (
              <button
                onClick={() => onAddProgram?.()}
                className="relative px-3 py-2 rounded-lg text-sm font-medium transition-all overflow-hidden group/add bg-gradient-to-br from-gray-800/30 via-black/20 to-gray-900/30 text-gray-300 border border-dashed border-gray-700 hover:border-[#e21c21]/50 hover:text-white"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/add:opacity-100 transition-opacity pointer-events-none"></div>
                <div className="relative flex items-center justify-center">
                  <span className="text-lg">+</span>
                </div>
              </button>
            )}
          </div>

          {/* Active Program Teams */}
          {activeProgram && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">
                  Programa de {activeProgram.sport}
                </h3>
                <span className="text-xs text-gray-400">
                  {activeProgram.teams.length} equipo{activeProgram.teams.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Team Cards */}
              {activeProgram.teams.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeProgram.teams.map((team) => {
                    const teamHasDesignRequest = hasActiveDesignRequest(team.id);
                    return (
                      <button
                        key={team.id}
                        onClick={() => router.push(`/mi-equipo/${institutionSlug}/team/${team.slug}`)}
                        className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 rounded-lg p-3 text-left transition-all border border-gray-700 hover:border-[#e21c21]/50 overflow-hidden group/card"
                        style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none"></div>

                        <div className="relative flex items-center gap-3">
                          {/* Team Info */}
                          <div className="flex-1 min-w-0">
                            {/* Team Header */}
                            <div className="mb-2">
                              <div className="flex items-center gap-2 mb-0.5">
                                <h4 className="font-semibold text-white text-sm">{team.name}</h4>
                                {/* Gender Badge */}
                                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded ${getGenderColor(team.gender_category || 'male')} bg-gray-800/50 border border-current/30`} title={getGenderLabel(team.gender_category || 'male')}>
                                  {getGenderSymbol(team.gender_category || 'male')}
                                </div>
                              </div>
                              {/* Design Request Badge */}
                              {teamHasDesignRequest && (
                                <div className="inline-flex items-center gap-1.5 px-2 py-1 mb-1 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400">
                                  <span className="flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-yellow-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-yellow-500"></span>
                                  </span>
                                  <span className="font-medium">Diseño Pendiente</span>
                                </div>
                              )}
                              <p className="text-xs text-gray-400">
                                Entrenador: {team.coach}
                              </p>
                            </div>

                        {/* Team Stats */}
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-800/50 rounded-lg border border-gray-700">
                            <span className="text-white font-medium">{team.members}</span>
                            <span className="text-gray-400">atletas</span>
                          </div>
                        </div>
                      </div>

                      {/* Kit Image Placeholder */}
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-lg border border-gray-600 flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      </div>

                      {/* Arrow indicator */}
                      <div className="flex-shrink-0 text-gray-400 group-hover/card:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        </div>
                      </div>
                    </button>
                  );
                })}
                </div>
              )}

              {/* Add Team Button */}
              <button
                onClick={() => {
                  setSelectedSport({ id: activeProgram.sport_id ?? 0, name: activeProgram.sport });
                  setShowCreateTeamModal(true);
                }}
                className="relative w-full mt-3 px-3 py-2 bg-gradient-to-br from-gray-800/30 via-black/20 to-gray-900/30 text-gray-300 hover:text-white border border-dashed border-gray-700 hover:border-[#e21c21]/50 rounded-lg text-sm font-medium overflow-hidden group/add transition-all"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/add:opacity-100 transition-opacity pointer-events-none"></div>
                <div className="relative flex items-center justify-center gap-2">
                  <span className="text-base">+</span>
                  <span>Agregar Equipo a {activeProgram.sport}</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Team Modal - Rendered outside card container */}
      {selectedSport && (
        <CreateTeamModal
          isOpen={showCreateTeamModal}
          onClose={() => {
            setShowCreateTeamModal(false);
            setSelectedSport(null);
          }}
          institutionSlug={institutionSlug}
          sportId={selectedSport.id}
          sportName={selectedSport.name}
          onSuccess={() => {
            onRefresh?.();
          }}
        />
      )}
    </>
  );
}
