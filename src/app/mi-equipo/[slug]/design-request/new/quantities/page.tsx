'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { useDesignRequestWizard } from '@/store/design-request-wizard';
import { WizardLayout } from '@/components/institution/design-request/WizardLayout';
import { GenderBadge } from '@/components/team/orders/GenderBadge';

export default function QuantitiesPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const {
    selectedTeams,
    teamRosterEstimates,
    setRosterEstimateForTeam,
  } = useDesignRequestWizard();

  const [teamType, setTeamType] = useState<'single_team' | 'institution' | null>(null);

  // Local state for roster sizes per team
  const [localRosterSizes, setLocalRosterSizes] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadTeamType() {
      const supabase = getBrowserClient();
      const { data: team } = await supabase
        .from('teams')
        .select('team_type')
        .eq('slug', slug)
        .single();

      if (team) {
        setTeamType(team.team_type);
      }
    }

    loadTeamType();
  }, [slug]);

  useEffect(() => {
    // Initialize local state from store or defaults
    const initial: Record<string, number> = {};
    selectedTeams.forEach(team => {
      const teamId = team.id || team.slug || team.name;
      initial[teamId] = teamRosterEstimates[teamId] || 20; // Default to 20
    });
    setLocalRosterSizes(initial);
  }, [selectedTeams, teamRosterEstimates]);

  const handleContinue = () => {
    // Save roster estimates for each team
    selectedTeams.forEach(team => {
      const teamId = team.id || team.slug || team.name;
      const estimate = localRosterSizes[teamId] || 20;
      setRosterEstimateForTeam(teamId, estimate);
    });

    router.push(`/mi-equipo/${slug}/design-request/new/review`);
  };

  const updateRosterSize = (teamId: string, size: number) => {
    setLocalRosterSizes(prev => ({
      ...prev,
      [teamId]: size,
    }));
  };

  const currentStep = teamType === 'single_team' ? 4 : 5;
  const totalWizardSteps = teamType === 'single_team' ? 5 : 6;

  return (
    <WizardLayout
      step={currentStep}
      totalSteps={totalWizardSteps}
      title="Tamaño estimado de los rosters"
      subtitle="Danos una estimación aproximada del tamaño de cada equipo"
      onBack={() => router.push(`/mi-equipo/${slug}/design-request/new/colors`)}
      onContinue={handleContinue}
      canContinue={true}
    >
      <div className="space-y-4">
        {teamType === 'institution' && (
          <div className="relative bg-gradient-to-br from-blue-800/30 via-blue-900/20 to-gray-900/30 backdrop-blur-md rounded-lg shadow-sm p-5 border border-blue-500/30">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-white">👥</span>
                <h3 className="text-lg font-semibold text-white">Tamaño estimado de los rosters</h3>
              </div>
              <p className="text-sm text-gray-300">
                ¿Cuántos jugadores aproximadamente tiene cada equipo? Esto nos ayudará a preparar los rosters automáticamente.
              </p>

              {/* Per-Team Roster Inputs */}
              <div className="space-y-3">
                {selectedTeams.map((team, index) => {
                  const teamId = team.id || team.slug || team.name;
                  const rosterSize = localRosterSizes[teamId] || 20;

                  // Determine gender category
                  // Use team.gender_category directly (teams always have this set now)
                  // Fallback: parse from name if legacy data lacks gender_category
                  const teamGenderCategory = team.gender_category ||
                    (team.name.toLowerCase().includes('women') || team.name.toLowerCase().includes('femenino')
                      ? 'female'
                      : 'male');

                  return (
                    <div
                      key={teamId}
                      className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-sm p-4 border border-gray-700"
                    >
                      <div className="flex items-center justify-between gap-4">
                        {/* Team Info */}
                        <div className="flex items-center gap-3 flex-1">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-semibold text-white">{team.name}</h4>
                              <GenderBadge
                                gender={teamGenderCategory as 'male' | 'female' | 'both'}
                                size="sm"
                              />
                            </div>
                            <p className="text-xs text-gray-400">{team.sport_name}</p>
                          </div>
                        </div>

                        {/* Roster Size Input */}
                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-300 font-medium whitespace-nowrap">
                            Jugadores:
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value={rosterSize}
                            onChange={(e) => updateRosterSize(teamId, parseInt(e.target.value) || 0)}
                            className="w-24 px-3 py-2 bg-black/50 border border-blue-500/50 rounded-lg text-white text-center text-base font-semibold focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 outline-none"
                            placeholder="20"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-xs text-blue-300/80 bg-blue-900/20 px-3 py-2 rounded border border-blue-500/20">
                💡 Estos números se usarán para crear placeholders en los rosters que podrás editar después
              </div>
            </div>
          </div>
        )}
      </div>
    </WizardLayout>
  );
}
