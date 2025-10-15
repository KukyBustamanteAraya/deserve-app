'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { useDesignRequestWizard, type Team } from '@/store/design-request-wizard';
import { WizardLayout } from '@/components/institution/design-request/WizardLayout';

interface Sport {
  id: number;
  name: string;
  slug: string;
}

interface ExistingTeam {
  id: string;
  name: string;
  coach: string | null;
  gender_category: 'male' | 'female' | 'both';
  sport_id: number;
  sport_name: string;
  sport_slug: string;
}

export default function TeamsSelectionPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const { selectedTeams, setSelectedTeams, institutionId, setSport, setInstitutionContext } = useDesignRequestWizard();
  const [sports, setSports] = useState<Sport[]>([]);
  const [existingTeams, setExistingTeams] = useState<ExistingTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExistingTeamIds, setSelectedExistingTeamIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [showGenderSelection, setShowGenderSelection] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // New team creation state
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamSportId, setNewTeamSportId] = useState<number | null>(null);
  const [teamGender, setTeamGender] = useState<'male' | 'female' | 'both'>('male');
  const [mensCoach, setMensCoach] = useState('');
  const [womensCoach, setWomensCoach] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        loadSports(),
        loadExistingTeams()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadSports = async () => {
    try {
      const supabase = getBrowserClient();
      const { data: sportsData, error } = await supabase
        .from('sports')
        .select('id, name, slug')
        .order('name');

      if (error) throw error;
      setSports(sportsData || []);
    } catch (error) {
      console.error('Error loading sports:', error);
    }
  };

  const loadExistingTeams = async () => {
    try {
      const supabase = getBrowserClient();

      // Get institution first
      const { data: institution } = await supabase
        .from('teams')
        .select('id')
        .eq('slug', params.slug)
        .single();

      if (!institution) {
        throw new Error('Institution not found');
      }

      // Set institution context
      setInstitutionContext(institution.id, params.slug);

      // Load all teams for this institution (across all sports)
      const { data: teams, error } = await supabase
        .from('institution_sub_teams')
        .select(`
          id,
          name,
          head_coach_user_id,
          gender_category,
          sport_id,
          sports:sport_id (
            id,
            name,
            slug
          )
        `)
        .eq('institution_team_id', institution.id)
        .eq('active', true)
        .order('name');

      if (error) throw error;

      const transformedTeams = teams?.map((t: any) => ({
        id: t.id,
        name: t.name,
        coach: null,
        gender_category: (t.gender_category || 'male') as 'male' | 'female' | 'both',
        sport_id: t.sport_id,
        sport_name: t.sports?.name || 'Desconocido',
        sport_slug: t.sports?.slug || '',
      })) || [];

      setExistingTeams(transformedTeams);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const handleExistingTeamToggle = (team: ExistingTeam) => {
    const newSelected = new Set(selectedExistingTeamIds);
    if (newSelected.has(team.id)) {
      newSelected.delete(team.id);
    } else {
      newSelected.add(team.id);
    }
    setSelectedExistingTeamIds(newSelected);

    // Check if we need to show gender selection (only if team has 'both')
    const hasBothGender = Array.from(newSelected).some(id => {
      const t = existingTeams.find(team => team.id === id);
      return t?.gender_category === 'both';
    });

    if (hasBothGender) {
      setShowGenderSelection(true);
      setTeamGender('both'); // Pre-select "both"
    } else {
      setShowGenderSelection(false);

      // Auto-set gender based on selected team if single-gender
      if (newSelected.size > 0) {
        const firstSelectedTeam = existingTeams.find(t => newSelected.has(t.id));
        if (firstSelectedTeam) {
          setTeamGender(firstSelectedTeam.gender_category);
        }
      }
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      alert('Por favor ingresa un nombre para el equipo');
      return;
    }

    if (!newTeamSportId) {
      alert('Por favor selecciona un deporte');
      return;
    }

    setCreating(true);
    try {
      const slug = `${newTeamName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36).slice(-4)}`;
      const selectedSport = sports.find(s => s.id === newTeamSportId);

      const response = await fetch(`/api/institutions/${params.slug}/sub-teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTeamName.trim(),
          slug,
          sport_id: newTeamSportId,
          gender_category: teamGender,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create team');
      }

      const { sub_team } = await response.json();

      // Add to existing teams list
      const newTeam: ExistingTeam = {
        id: sub_team.id,
        name: sub_team.name,
        coach: null,
        gender_category: teamGender,
        sport_id: newTeamSportId,
        sport_name: selectedSport?.name || 'Desconocido',
        sport_slug: selectedSport?.slug || '',
      };

      setExistingTeams([...existingTeams, newTeam]);

      // Auto-select the new team
      const newSelected = new Set(selectedExistingTeamIds);
      newSelected.add(sub_team.id);
      setSelectedExistingTeamIds(newSelected);

      // Reset form
      setNewTeamName('');
      setNewTeamSportId(null);
      setTeamGender('male');
      setMensCoach('');
      setWomensCoach('');

      // Show gender selection if team has 'both' category
      if (teamGender === 'both') {
        setShowGenderSelection(true);
      }

      // Show success message
      setSuccessMessage(`Equipo "${newTeam.name}" creado exitosamente`);

      // Auto-hide after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error: any) {
      console.error('Error creating team:', error);
      setSuccessMessage(`Error: ${error.message || 'Error al crear equipo'}`);

      // Auto-hide error after 4 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
    } finally {
      setCreating(false);
    }
  };

  const handleContinue = async () => {
    try {
      const finalTeams: Team[] = [];
      const selectedTeamsList = Array.from(selectedExistingTeamIds).map(id =>
        existingTeams.find(t => t.id === id)
      ).filter(Boolean) as ExistingTeam[];

      // Check that all selected teams are for the same sport
      const sportIds = new Set(selectedTeamsList.map(t => t.sport_id));
      if (sportIds.size > 1) {
        alert('Por favor selecciona equipos del mismo deporte');
        return;
      }

      // Get the sport from the first selected team
      const firstTeam = selectedTeamsList[0];
      if (firstTeam) {
        setSport(firstTeam.sport_id, firstTeam.sport_name);
      }

      // Add selected existing teams
      for (const team of selectedTeamsList) {
        finalTeams.push({
          id: team.id,
          name: team.name,
          coach: team.coach || undefined,
          isNew: false,
        });
      }

      setSelectedTeams(finalTeams);

      // Set gender category based on selected team(s)
      const { setGenderCategory, setBothConfig } = useDesignRequestWizard.getState();
      setGenderCategory(teamGender);

      // If gender is "both", set default config
      if (teamGender === 'both') {
        setBothConfig({
          same_design: true,
          same_colors: true,
        });
      }

      // Navigate directly to products page
      router.push(`/mi-equipo/${params.slug}/design-request/new/products`);
    } catch (error) {
      console.error('Error saving teams:', error);
      alert('Error al guardar equipos. Por favor intenta de nuevo.');
    }
  };

  const canContinue = () => {
    return selectedExistingTeamIds.size > 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Cargando equipos...</p>
        </div>
      </div>
    );
  }

  return (
    <WizardLayout
      step={1}
      totalSteps={6}
      title="¿Para qué equipo es este pedido?"
      subtitle="Selecciona un equipo existente o crea uno nuevo"
      onBack={() => router.push(`/mi-equipo/${params.slug}`)}
      onContinue={handleContinue}
      canContinue={canContinue()}
    >
      {/* 2-Column Layout */}
      <div className="grid grid-cols-2 gap-4 md:gap-6">
        {/* LEFT COLUMN - Existing Teams */}
        <div className="space-y-3">
          <h3 className="text-sm md:text-base font-semibold text-white">Equipos Existentes</h3>

          {existingTeams.length === 0 ? (
            <div className="text-center py-12 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 rounded-lg border border-gray-700">
              <p className="text-xs md:text-sm text-gray-400">No hay equipos aún.</p>
              <p className="text-xs text-gray-500 mt-1">Crea uno nuevo →</p>
            </div>
          ) : (
            <div className="space-y-2">
              {existingTeams.map((team) => {
                const isSelected = selectedExistingTeamIds.has(team.id);
                return (
                  <button
                    key={team.id}
                    onClick={() => handleExistingTeamToggle(team)}
                    className={`w-full relative group bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-sm p-2 md:p-3 text-left transition-all hover:shadow-lg border-2 ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/50'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-600'
                        }`}>
                          {isSelected && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <h4 className="text-xs md:text-sm font-bold text-white truncate">{team.name}</h4>
                          <div className={`w-5 h-5 md:w-6 md:h-6 rounded flex items-center justify-center flex-shrink-0 ${
                            team.gender_category === 'male' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                            team.gender_category === 'female' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' :
                            'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          }`}>
                            {team.gender_category === 'male' ? (
                              <svg className="w-3 h-3 md:w-3.5 md:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                <circle cx="10" cy="14" r="6" />
                                <path d="M16 8l6-6m0 0h-5m5 0v5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            ) : team.gender_category === 'female' ? (
                              <svg className="w-3 h-3 md:w-3.5 md:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                <circle cx="12" cy="8" r="6" />
                                <path d="M12 14v8m-3-3h6" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 md:w-3.5 md:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] md:text-xs text-gray-400">{team.sport_name}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN - Create Team or Gender Selection */}
        <div className="space-y-3">
          {!showGenderSelection ? (
            /* Create New Team Form */
            <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-sm p-3 md:p-4 border border-gray-700">
              <h3 className="text-xs md:text-base font-semibold text-white mb-3">Crear Nuevo Equipo</h3>

              {/* Success/Error Message */}
              {successMessage && (
                <div className={`mb-3 p-2.5 rounded-lg border text-xs md:text-sm ${
                  successMessage.startsWith('Error')
                    ? 'bg-red-500/10 border-red-500/50 text-red-400'
                    : 'bg-green-500/10 border-green-500/50 text-green-400'
                }`}>
                  <div className="flex items-center gap-2">
                    {successMessage.startsWith('Error') ? (
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <span>{successMessage}</span>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {/* Team Name */}
                <div>
                  <label className="block text-[10px] md:text-sm font-medium text-gray-300 mb-1.5">
                    Nombre del Equipo *
                  </label>
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="ej: Varsity, JV, U-17..."
                    className="w-full px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white text-xs md:text-sm placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Sport Selection */}
                <div>
                  <label className="block text-[10px] md:text-sm font-medium text-gray-300 mb-1.5">
                    Deporte *
                  </label>
                  <select
                    value={newTeamSportId || ''}
                    onChange={(e) => setNewTeamSportId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white text-xs md:text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Selecciona un deporte</option>
                    {sports.map((sport) => (
                      <option key={sport.id} value={sport.id}>
                        {sport.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Gender Category */}
                <div>
                  <label className="block text-[10px] md:text-sm font-medium text-gray-300 mb-1.5">
                    Categoría de Género *
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTeamGender('male')}
                      className={`px-2 py-2 md:py-2.5 rounded-lg border transition-all flex items-center justify-center gap-1 ${
                        teamGender === 'male'
                          ? 'bg-blue-500/20 border-blue-400 text-blue-300'
                          : 'bg-black/50 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <circle cx="10" cy="14" r="6" />
                        <path d="M16 8l6-6m0 0h-5m5 0v5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeamGender('female')}
                      className={`px-2 py-2 md:py-2.5 rounded-lg border transition-all flex items-center justify-center gap-1 ${
                        teamGender === 'female'
                          ? 'bg-pink-500/20 border-pink-400 text-pink-300'
                          : 'bg-black/50 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <circle cx="12" cy="8" r="6" />
                        <path d="M12 14v8m-3-3h6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeamGender('both')}
                      className={`px-2 py-2 md:py-2.5 rounded-lg border transition-all flex items-center justify-center gap-1 ${
                        teamGender === 'both'
                          ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                          : 'bg-black/50 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Coach Fields */}
                {teamGender === 'both' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] md:text-xs font-medium text-gray-300 mb-1">
                        Entrenador H (opc)
                      </label>
                      <input
                        type="text"
                        value={mensCoach}
                        onChange={(e) => setMensCoach(e.target.value)}
                        placeholder="Nombre"
                        className="w-full px-2 py-1.5 bg-black/50 border border-gray-700 rounded-lg text-white text-xs placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-xs font-medium text-gray-300 mb-1">
                        Entrenadora M (opc)
                      </label>
                      <input
                        type="text"
                        value={womensCoach}
                        onChange={(e) => setWomensCoach(e.target.value)}
                        placeholder="Nombre"
                        className="w-full px-2 py-1.5 bg-black/50 border border-gray-700 rounded-lg text-white text-xs placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] md:text-sm font-medium text-gray-300 mb-1.5">
                      {teamGender === 'female' ? 'Entrenadora (opcional)' : 'Entrenador (opcional)'}
                    </label>
                    <input
                      type="text"
                      value={teamGender === 'female' ? womensCoach : mensCoach}
                      onChange={(e) => teamGender === 'female' ? setWomensCoach(e.target.value) : setMensCoach(e.target.value)}
                      placeholder={teamGender === 'female' ? 'Nombre de la entrenadora' : 'Nombre del entrenador'}
                      className="w-full px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white text-xs md:text-sm placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                )}

                {/* Create Button */}
                <button
                  onClick={handleCreateTeam}
                  disabled={creating || !newTeamName.trim() || !newTeamSportId}
                  className="w-full px-4 py-2.5 bg-[#e21c21] hover:bg-[#c11a1e] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium text-xs md:text-sm"
                >
                  {creating ? 'Creando...' : 'Crear Equipo'}
                </button>
              </div>
            </div>
          ) : (
            /* Gender Selection - Only show if team has 'both' category */
            <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-sm p-3 md:p-4 border border-gray-700">
              <h3 className="text-sm md:text-base font-semibold text-white mb-2">¿El diseño es para ambos o solo uno?</h3>
              <p className="text-xs text-gray-400 mb-3">Selecciona si quieres crear un diseño para hombres, mujeres, o ambas categorías</p>

              <div className="flex items-center gap-2 p-1 bg-black/50 rounded-lg border border-gray-700">
                <button
                  onClick={() => setTeamGender('male')}
                  className={`flex-1 px-3 py-2 rounded-md font-medium transition-all text-xs md:text-sm flex items-center justify-center gap-1.5 ${
                    teamGender === 'male'
                      ? 'bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <circle cx="10" cy="14" r="6" />
                    <path d="M16 8l6-6m0 0h-5m5 0v5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  onClick={() => setTeamGender('female')}
                  className={`flex-1 px-3 py-2 rounded-md font-medium transition-all text-xs md:text-sm flex items-center justify-center gap-1.5 ${
                    teamGender === 'female'
                      ? 'bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <circle cx="12" cy="8" r="6" />
                    <path d="M12 14v8m-3-3h6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  onClick={() => setTeamGender('both')}
                  className={`flex-1 px-3 py-2 rounded-md font-medium transition-all text-xs md:text-sm flex items-center justify-center gap-1.5 ${
                    teamGender === 'both'
                      ? 'bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </WizardLayout>
  );
}
