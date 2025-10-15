'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';

type Team = {
  id: string;
  name: string;
  slug: string;
  sport: string;
  institution_name?: string;
  created_at: string;
};

export default function MinimalTeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [modalStep, setModalStep] = useState<'type' | 'details'>('type');

  // Form state
  const [teamType, setTeamType] = useState<'single' | 'organization' | null>(null);
  const [teamName, setTeamName] = useState('');
  const [sportId, setSportId] = useState<number | null>(null); // For single teams - USE ID not slug
  const [selectedSportIds, setSelectedSportIds] = useState<number[]>([]); // For organizations - USE IDs
  const [institutionName, setInstitutionName] = useState('');
  const [sports, setSports] = useState<Array<{ id: number; slug: string; name: string }>>([]);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null); // Track which team is pending deletion

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = getBrowserClient();

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('No autenticado');

        // ALWAYS load sports first (needed for dropdown regardless of teams)
        const { data: sportsData, error: sportsError } = await supabase
          .from('sports')
          .select('id, slug, name')
          .order('name', { ascending: true });

        if (sportsError) {
          console.error('Error loading sports:', sportsError);
        } else {
          console.log('[Sports] Loaded sports:', sportsData);
          setSports(sportsData || []);
        }

        // Get teams where user is a member
        const { data: memberships, error: membershipsError } = await supabase
          .from('team_memberships')
          .select('team_id')
          .eq('user_id', user.id);

        if (membershipsError) throw membershipsError;

        if (!memberships || memberships.length === 0) {
          setTeams([]);
          setLoading(false);
          return;
        }

        const teamIds = memberships.map(m => m.team_id);

        // Get team details with sport info (join with sports table)
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select(`
            *,
            sports:sport_id (
              id,
              slug,
              name
            )
          `)
          .in('id', teamIds);

        if (teamsError) throw teamsError;

        // Extract sport names from joined data
        const teamsWithSportNames = teamsData?.map(team => ({
          ...team,
          sport: (team as any).sports?.name || 'Sin deporte'
        })) || [];

        setTeams(teamsWithSportNames);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleDeleteTeam = async (teamId: string, teamName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking delete

    // First click: Set team to "pending deletion" state
    if (deletingTeamId !== teamId) {
      setDeletingTeamId(teamId);
      return;
    }

    // Second click: Actually delete the team
    try {
      const supabase = getBrowserClient();

      // Delete the team (cascade should handle memberships and settings)
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      // Remove from local state - team disappears smoothly
      setTeams(teams.filter(t => t.id !== teamId));
      setDeletingTeamId(null);

      // No alert - just visual feedback by removing the team card
    } catch (error: any) {
      console.error('Error deleting team:', error);
      alert(`Error al eliminar equipo: ${error.message}`);
      setDeletingTeamId(null);
    }
  };

  const handleCreateTeamClick = () => {
    setShowCreateModal(true);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate based on team type
    if (!teamType) {
      alert('Error: Tipo de equipo no seleccionado. Por favor intenta de nuevo.');
      console.error('[Team Creation] teamType is null or undefined:', teamType);
      return;
    }

    if (!teamName.trim()) {
      alert('Por favor ingresa el nombre del equipo');
      return;
    }

    if (teamType === 'single' && !sportId) {
      alert('Por favor selecciona un deporte');
      return;
    }

    if (teamType === 'organization' && selectedSportIds.length === 0) {
      alert('Por favor selecciona al menos un deporte');
      return;
    }

    setCreating(true);

    try {
      const supabase = getBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('No autenticado');

      // Create team slug with timestamp for uniqueness
      const baseSlug = teamName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const uniqueSuffix = Date.now().toString(36).slice(-6); // 6-char timestamp
      const teamSlug = `${baseSlug}-${uniqueSuffix}`;

      // Prepare sports data - USE sport_id instead of slug
      const teamSportId = teamType === 'single' ? sportId : (selectedSportIds[0] || null);

      // For organizations, store array of sport slugs for backward compatibility
      const sportsArray = teamType === 'organization'
        ? selectedSportIds.map(id => sports.find(s => s.id === id)?.slug).filter(Boolean)
        : null;

      // Map UI team types to database enum values
      const dbTeamType = teamType === 'single' ? 'single_team' : 'institution';

      console.log('[Team Creation] Creating team with:', {
        teamType: teamType,
        dbTeamType: dbTeamType,
        sportId: teamSportId,
        sportsArray: sportsArray
      });

      // Create team - USE sport_id (foreign key)
      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({
          slug: teamSlug,
          name: teamName,
          owner_id: user.id,
          current_owner_id: user.id,
          created_by: user.id,
          sport_id: teamSportId, // ✅ USE sport_id foreign key
          sports: sportsArray, // Array of sport slugs for organizations (backward compatibility)
          team_type: dbTeamType, // 'single_team' or 'institution'
          institution_name: institutionName || null, // Institution affiliation
        })
        .select()
        .single();

      console.log('[Team Creation] Team created, result:', newTeam, 'Error:', teamError);

      if (teamError) throw teamError;

      console.log('[Team Creation] Team created successfully:', newTeam.id, 'Name:', newTeam.name);

      // Add creator as owner member
      console.log('[Team Creation] Creating owner membership for user:', user.id, 'team:', newTeam.id);

      const membershipInsert: any = {
        team_id: newTeam.id,
        user_id: user.id,
        role: 'owner',
      };

      // For organizations, also set institution_role to athletic_director
      if (teamType === 'organization') {
        membershipInsert.institution_role = 'athletic_director';
      }

      const { data: membershipData, error: memberError } = await supabase
        .from('team_memberships')
        .insert(membershipInsert)
        .select()
        .single();

      if (memberError) {
        console.error('[Team Creation] Membership creation failed:', memberError);
        throw memberError;
      }

      console.log('[Team Creation] Membership created successfully:', membershipData);

      // For organizations, sports are stored in teams.sports array
      // Sport programs will appear empty initially, prompting the user to add teams
      if (teamType === 'organization' && selectedSportIds.length > 0) {
        console.log('[Team Creation] Organization created with sports:', selectedSportIds.map(id => sports.find(s => s.id === id)?.name));
      }

      // Refresh teams list
      setTeams([newTeam, ...teams]);

      // Reset form and close modal
      setTeamName('');
      setSportId(null);
      setSelectedSportIds([]);
      setInstitutionName('');
      setTeamType(null);
      setModalStep('type');
      setShowCreateModal(false);

      // Navigate to new team
      router.push(`/mi-equipo/${newTeam.slug}`);
    } catch (error: any) {
      console.error('Error creating team:', error);
      alert(`Error al crear equipo: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-lg text-gray-300">Cargando equipos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="text-[#e21c21] hover:text-[#c11a1e] font-medium"
          >
            ← Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Mis Equipos</h1>
          <p className="text-gray-300">Gestiona tus equipos y organizaciones</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {teams.map((team) => (
            <div
              key={team.id}
              className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 flex flex-col min-h-[200px] group overflow-hidden transition-all"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              onClick={() => {
                // Reset deletion state when clicking on a different team card
                if (deletingTeamId && deletingTeamId !== team.id) {
                  setDeletingTeamId(null);
                }
              }}
            >
              {/* Glass shine effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

              {/* Delete button */}
              <button
                onClick={(e) => handleDeleteTeam(team.id, team.name, e)}
                className={`absolute top-3 right-3 rounded-lg transition-all z-10 ${
                  deletingTeamId === team.id
                    ? 'px-3 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white opacity-100 shadow-lg shadow-red-600/30'
                    : 'p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-full opacity-0 group-hover:opacity-100'
                }`}
                title={deletingTeamId === team.id ? 'Click para confirmar' : 'Eliminar equipo'}
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                {deletingTeamId === team.id ? (
                  <span className="text-sm font-semibold whitespace-nowrap">¿Eliminar?</span>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>

              {/* Team card content - clickable */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingTeamId(null); // Cancel any pending deletion
                  router.push(`/mi-equipo/${team.slug}`);
                }}
                className="text-left flex flex-col flex-1 relative"
              >
                <h3 className="text-xl font-semibold text-white mb-2">
                  {team.name}
                </h3>
                <p className="text-sm text-gray-300 mb-1">
                  <span className="font-medium">Deporte:</span> {team.sport}
                </p>
                {team.institution_name && (
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">Institución:</span> {team.institution_name}
                  </p>
                )}
                <div className="mt-auto pt-4 text-sm text-[#e21c21] font-medium">
                  Ver equipo →
                </div>
              </button>
            </div>
          ))}

          {/* Create Team Card */}
          <button
            onClick={handleCreateTeamClick}
            className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border-2 border-dashed border-gray-700 hover:border-[#e21c21]/50 transition-all flex flex-col items-center justify-center min-h-[200px] group overflow-hidden"
            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            {/* Glass shine effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

            <div className="w-16 h-16 rounded-full bg-[#e21c21]/20 border border-[#e21c21]/50 flex items-center justify-center mb-4 relative">
              <svg
                className="w-8 h-8 text-[#e21c21]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1 relative">
              Crea un equipo
            </h3>
            <p className="text-sm text-gray-300 text-center relative">
              Agrega un nuevo equipo para gestionar tus diseños
            </p>
          </button>

          {/* Join Team Card */}
          <button
            onClick={() => alert('Funcionalidad de unirse a equipo próximamente')}
            className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border-2 border-dashed border-gray-700 hover:border-[#e21c21]/50 transition-all flex flex-col items-center justify-center min-h-[200px] group overflow-hidden"
            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            {/* Glass shine effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

            <div className="w-16 h-16 rounded-full bg-[#e21c21]/20 border border-[#e21c21]/50 flex items-center justify-center mb-4 relative">
              <svg
                className="w-8 h-8 text-[#e21c21]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1 relative">
              Únete a un equipo
            </h3>
            <p className="text-sm text-gray-300 text-center relative">
              Solicita acceso a un equipo existente
            </p>
          </button>
        </div>

        <div className="mt-8 p-4 relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-700 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <p className="text-sm text-gray-300 relative">
            <strong className="text-white">Nota:</strong> Crea equipos individuales o instituciones con múltiples programas deportivos.
          </p>
        </div>
      </div>

      {/* Create Team Modal - Reusing from /dashboard/team/page.tsx */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 max-w-md w-full p-6 overflow-hidden group">
            {/* Glass shine effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

            <div className="flex justify-between items-center mb-4 relative">
              <h2 className="text-2xl font-bold text-white">
                {modalStep === 'type' ? '¿Qué tipo de equipo tienes?' : 'Crear Equipo'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setModalStep('type');
                  setTeamType(null);
                }}
                className="text-gray-400 hover:text-[#e21c21] transition-colors"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {modalStep === 'type' ? (
              // Step 1: Team Type Selection
              <div className="space-y-4 relative">
                <p className="text-gray-300 mb-6">
                  Selecciona el tipo de equipo que deseas crear
                </p>

                <button
                  onClick={() => {
                    console.log('[Team Creation] User clicked "Equipo Único" - Setting teamType to: single');
                    setTeamType('single');
                    setModalStep('details');
                  }}
                  className="relative w-full p-6 border-2 border-gray-700 rounded-lg hover:border-[#e21c21]/50 transition-all text-left group overflow-hidden bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50"
                  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  <div className="flex items-start gap-4 relative">
                    <div className="w-12 h-12 rounded-full bg-[#e21c21]/20 border border-[#e21c21]/50 flex items-center justify-center flex-shrink-0 transition-colors">
                      <svg className="w-6 h-6 text-[#e21c21]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-lg mb-1">Equipo Único</h3>
                      <p className="text-sm text-gray-300">
                        Un solo equipo deportivo (ej: Los Tigres, Equipo de Fútbol)
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    console.log('[Team Creation] User clicked "Organización" - Setting teamType to: organization');
                    setTeamType('organization');
                    setModalStep('details');
                  }}
                  className="relative w-full p-6 border-2 border-gray-700 rounded-lg hover:border-[#e21c21]/50 transition-all text-left group overflow-hidden bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50"
                  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  <div className="flex items-start gap-4 relative">
                    <div className="w-12 h-12 rounded-full bg-[#e21c21]/20 border border-[#e21c21]/50 flex items-center justify-center flex-shrink-0 transition-colors">
                      <svg className="w-6 h-6 text-[#e21c21]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-lg mb-1">Organización</h3>
                      <p className="text-sm text-gray-300">
                        Una institución con múltiples equipos (ej: Club Deportivo, Universidad)
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            ) : (
              // Step 2: Team Details Form
              <form onSubmit={handleCreateTeam} className="space-y-4 relative">
              <div className="relative">
                <label htmlFor="teamName" className="block text-sm font-medium text-white mb-2">
                  {teamType === 'organization' ? 'Nombre de la Organización *' : 'Nombre del Equipo *'}
                </label>
                <div className="relative overflow-hidden rounded-lg group/input">
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/input:opacity-100 transition-opacity pointer-events-none"></div>
                  <input
                    type="text"
                    id="teamName"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="relative w-full px-4 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 transition-all"
                    style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    placeholder={teamType === 'organization' ? 'Ej: Club Deportivo Águilas' : 'Ej: Los Tigres'}
                    required
                  />
                </div>
              </div>

              {/* Sport Selection - Different UI based on team type */}
              {teamType === 'single' ? (
                <div className="relative">
                  <label htmlFor="sport" className="block text-sm font-medium text-white mb-2">
                    Deporte *
                  </label>
                  <div className="relative overflow-hidden rounded-lg group/input">
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/input:opacity-100 transition-opacity pointer-events-none"></div>
                    <select
                      id="sport"
                      value={sportId || ''}
                      onChange={(e) => setSportId(e.target.value ? Number(e.target.value) : null)}
                      className="relative w-full px-4 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 transition-all"
                      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                      required
                    >
                      <option value="" className="bg-gray-900">Selecciona un deporte</option>
                      {sports.map((s) => (
                        <option key={s.id} value={s.id} className="bg-gray-900">
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <label className="block text-sm font-medium text-white mb-2">
                    Deportes de tu Organización *
                  </label>
                  <p className="text-xs text-gray-400 mb-3">
                    Selecciona los deportes que tendrá tu organización. Se crearán programas automáticamente.
                  </p>
                  <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto p-3 border border-gray-700 rounded-lg bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50">
                    {sports.map((s) => (
                      <label
                        key={s.id}
                        className={`relative flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all overflow-hidden group ${
                          selectedSportIds.includes(s.id)
                            ? 'border-[#e21c21]/50 bg-[#e21c21]/10'
                            : 'border-gray-700 hover:border-gray-600 bg-gray-800/30'
                        }`}
                        style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        <input
                          type="checkbox"
                          checked={selectedSportIds.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSportIds([...selectedSportIds, s.id]);
                            } else {
                              setSelectedSportIds(selectedSportIds.filter(id => id !== s.id));
                            }
                          }}
                          className="w-4 h-4 text-[#e21c21] bg-gray-800 border-gray-600 rounded focus:ring-[#e21c21]/50 relative"
                        />
                        <span className="text-sm font-medium text-white relative">{s.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    {selectedSportIds.length} deporte{selectedSportIds.length !== 1 ? 's' : ''} seleccionado{selectedSportIds.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}

              {/* Institution field - only show for single teams */}
              {teamType === 'single' && (
                <div className="relative">
                  <label htmlFor="institution" className="block text-sm font-medium text-white mb-2">
                    Institución (opcional)
                  </label>
                  <div className="relative overflow-hidden rounded-lg group/input">
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/input:opacity-100 transition-opacity pointer-events-none"></div>
                    <input
                      type="text"
                      id="institution"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      className="relative w-full px-4 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 transition-all"
                      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                      placeholder="Ej: Universidad Nacional"
                    />
                  </div>
                </div>
              )}

                <div className="flex items-center justify-between gap-3 mt-6 relative">
                  <button
                    type="button"
                    onClick={() => {
                      setModalStep('type');
                      setTeamType(null);
                    }}
                    className="px-6 py-2 text-gray-300 hover:text-white font-medium transition-colors"
                    style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  >
                    ← Volver
                  </button>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setModalStep('type');
                        setTeamType(null);
                      }}
                      className="px-6 py-2 text-gray-300 hover:text-white font-medium transition-colors"
                      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className={`relative px-6 py-2 rounded-lg font-semibold transition-all overflow-hidden group ${
                        creating
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50'
                      }`}
                      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    >
                      {!creating && (
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                      )}
                      <span className="relative">{creating ? 'Creando...' : 'Crear Equipo'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
