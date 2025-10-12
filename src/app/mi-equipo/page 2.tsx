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
  const [sport, setSport] = useState(''); // For single teams
  const [selectedSports, setSelectedSports] = useState<string[]>([]); // For organizations
  const [institutionName, setInstitutionName] = useState('');
  const [sports, setSports] = useState<any[]>([]);

  useEffect(() => {
    async function loadTeams() {
      try {
        const supabase = getBrowserClient();

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('No autenticado');

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

        // Get team details
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .in('id', teamIds);

        if (teamsError) throw teamsError;

        setTeams(teamsData || []);

        // Load sports for dropdown
        const { data: sportsData } = await supabase
          .from('sports')
          .select('slug, name')
          .order('name', { ascending: true });

        setSports(sportsData || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadTeams();
  }, []);

  const handleDeleteTeam = async (teamId: string, teamName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking delete

    if (!confirm(`¿Estás seguro de que deseas eliminar el equipo "${teamName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const supabase = getBrowserClient();

      // Delete the team (cascade should handle memberships and settings)
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      // Remove from local state
      setTeams(teams.filter(t => t.id !== teamId));

      alert('Equipo eliminado exitosamente');
    } catch (error: any) {
      console.error('Error deleting team:', error);
      alert(`Error al eliminar equipo: ${error.message}`);
    }
  };

  const handleCreateTeamClick = () => {
    setShowCreateModal(true);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate based on team type
    if (!teamName.trim()) {
      alert('Por favor ingresa el nombre del equipo');
      return;
    }

    if (teamType === 'single' && !sport) {
      alert('Por favor selecciona un deporte');
      return;
    }

    if (teamType === 'organization' && selectedSports.length === 0) {
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

      // Prepare sports data
      const teamSport = teamType === 'single' ? sport : (selectedSports[0] || 'general');
      const sportsArray = teamType === 'organization' ? selectedSports : null;

      // Map UI team types to database enum values
      const dbTeamType = teamType === 'single' ? 'single_team' : 'institution';

      // Create team
      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({
          slug: teamSlug,
          name: teamName,
          owner_id: user.id,
          current_owner_id: user.id,
          created_by: user.id,
          sports: sportsArray, // Array of sports for organizations
          team_type: dbTeamType, // 'single_team' or 'institution'
        })
        .select()
        .single();

      if (teamError) throw teamError;

      console.log('[Team Creation] Team created successfully:', newTeam.id, 'Name:', newTeam.name);

      // Add creator as owner member
      console.log('[Team Creation] Creating owner membership for user:', user.id, 'team:', newTeam.id);

      const { data: membershipData, error: memberError } = await supabase
        .from('team_memberships')
        .insert({
          team_id: newTeam.id,
          user_id: user.id,
          role: 'owner',
        })
        .select()
        .single();

      if (memberError) {
        console.error('[Team Creation] Membership creation failed:', memberError);
        throw memberError;
      }

      console.log('[Team Creation] Membership created successfully:', membershipData);

      // Refresh teams list
      setTeams([newTeam, ...teams]);

      // Reset form and close modal
      setTeamName('');
      setSport('');
      setSelectedSports([]);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Cargando equipos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mis Equipos</h1>
          <p className="text-gray-600">Gestiona tus equipos y organizaciones</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div
              key={team.id}
              className="relative bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow flex flex-col min-h-[200px] group"
            >
              {/* Delete button */}
              <button
                onClick={(e) => handleDeleteTeam(team.id, team.name, e)}
                className="absolute top-3 right-3 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                title="Eliminar equipo"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              {/* Team card content - clickable */}
              <button
                onClick={() => router.push(`/mi-equipo/${team.slug}`)}
                className="text-left flex flex-col flex-1"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {team.name}
                </h3>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Deporte:</span> {team.sport}
                </p>
                {team.institution_name && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Institución:</span> {team.institution_name}
                  </p>
                )}
                <div className="mt-auto pt-4 text-sm text-blue-600 font-medium">
                  Ver equipo →
                </div>
              </button>
            </div>
          ))}

          {/* Create Team Card */}
          <button
            onClick={handleCreateTeamClick}
            className="bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:shadow-md transition-all flex flex-col items-center justify-center min-h-[200px]"
          >
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-blue-600"
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
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Crea un equipo
            </h3>
            <p className="text-sm text-gray-500 text-center">
              Agrega un nuevo equipo para gestionar tus diseños
            </p>
          </button>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Crea equipos individuales o instituciones con múltiples programas deportivos.
          </p>
        </div>
      </div>

      {/* Create Team Modal - Reusing from /dashboard/team/page.tsx */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {modalStep === 'type' ? '¿Qué tipo de equipo tienes?' : 'Crear Equipo'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setModalStep('type');
                  setTeamType(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {modalStep === 'type' ? (
              // Step 1: Team Type Selection
              <div className="space-y-4">
                <p className="text-gray-600 mb-6">
                  Selecciona el tipo de equipo que deseas crear
                </p>

                <button
                  onClick={() => {
                    setTeamType('single');
                    setModalStep('details');
                  }}
                  className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg mb-1">Equipo Único</h3>
                      <p className="text-sm text-gray-600">
                        Un solo equipo deportivo (ej: Los Tigres, Equipo de Fútbol)
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setTeamType('organization');
                    setModalStep('details');
                  }}
                  className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg mb-1">Organización</h3>
                      <p className="text-sm text-gray-600">
                        Una institución con múltiples equipos (ej: Club Deportivo, Universidad)
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            ) : (
              // Step 2: Team Details Form
              <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del equipo *
                </label>
                <input
                  type="text"
                  id="teamName"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Los Tigres"
                  required
                />
              </div>

              {/* Sport Selection - Different UI based on team type */}
              {teamType === 'single' ? (
                <div>
                  <label htmlFor="sport" className="block text-sm font-medium text-gray-700 mb-2">
                    Deporte *
                  </label>
                  <select
                    id="sport"
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Selecciona un deporte</option>
                    {sports.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Programas Deportivos * (selecciona todos los que apliquen)
                  </label>
                  <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto p-3 border border-gray-200 rounded-lg">
                    {sports.map((s) => (
                      <label
                        key={s.slug}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedSports.includes(s.slug)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSports.includes(s.slug)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSports([...selectedSports, s.slug]);
                            } else {
                              setSelectedSports(selectedSports.filter(slug => slug !== s.slug));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">{s.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {selectedSports.length} deporte{selectedSports.length !== 1 ? 's' : ''} seleccionado{selectedSports.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="institution" className="block text-sm font-medium text-gray-700 mb-2">
                  Institución (opcional)
                </label>
                <input
                  type="text"
                  id="institution"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Universidad Nacional"
                />
              </div>

                <div className="flex items-center justify-between gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setModalStep('type');
                      setTeamType(null);
                    }}
                    className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
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
                      className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                        creating
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {creating ? 'Creando...' : 'Crear Equipo'}
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
