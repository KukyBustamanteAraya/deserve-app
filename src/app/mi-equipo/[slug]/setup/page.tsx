'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { getFieldLayout } from '@/lib/sports/fieldLayouts';
import { useProfile } from '@/hooks/useProfile';

// Translation map: Spanish positions → English positions (for field layout)
const POSITION_TRANSLATION: Record<string, string> = {
  // Fútbol
  'Portero': 'Goalkeeper',
  'Defensa Central': 'Center Back (Left)', // Default to left
  'Lateral Derecho': 'Right Back',
  'Lateral Izquierdo': 'Left Back',
  'Mediocampista Defensivo': 'Defensive Midfielder',
  'Mediocampista Central': 'Center Midfielder (Left)', // Default to left
  'Mediocampista Ofensivo': 'Attacking Midfielder',
  'Extremo Derecho': 'Right Winger',
  'Extremo Izquierdo': 'Left Winger',
  'Delantero Centro': 'Striker (Left)', // Default to left
  // Básquetbol
  'Base (Point Guard)': 'Point Guard',
  'Escolta (Shooting Guard)': 'Shooting Guard',
  'Alero (Small Forward)': 'Small Forward',
  'Ala-Pívot (Power Forward)': 'Power Forward',
  'Pívot (Center)': 'Center',
  // Vóleibol
  'Armador/a (Setter)': 'Setter',
  'Opuesto/a': 'Opposite Hitter',
  'Punta (Outside Hitter)': 'Outside Hitter (Left)', // Default to left
  'Central (Middle Blocker)': 'Middle Blocker (Left)', // Default to left
  'Líbero': 'Libero',
};

export default function TeamSetupPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const { profile } = useProfile(); // Get user profile for pre-filling
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [team, setTeam] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Form state
  const [playerInfo, setPlayerInfo] = useState({
    player_name: '',
    jersey_name: '', // NEW: Name to print on jersey (can be nickname, first name, etc.)
    jersey_number: '',
    position: '',
  });

  useEffect(() => {
    loadTeamAndCheckSetup();
  }, [slug]);

  // Separate effect to pre-fill from profile when it loads
  useEffect(() => {
    if (!profile || !team || !currentUser) {
      console.log('[Setup] Waiting for data...', { hasProfile: !!profile, hasTeam: !!team, hasUser: !!currentUser });
      return;
    }

    console.log('[Setup] Profile loaded, pre-filling form:', {
      profile,
      teamSport: team.sport,
      athleticProfile: profile.athletic_profile
    });

    // Pre-fill name from profile.full_name
    const fullName = profile.full_name ||
                 currentUser.user_metadata?.full_name ||
                 currentUser.email?.split('@')[0] || '';

    // Pre-fill jersey name with first name by default (user can change it)
    const firstName = fullName.split(' ')[0];

    // Pre-fill jersey number from athletic_profile if available
    const jerseyNumber = profile.athletic_profile?.jersey_number || '';

    // Pre-fill position from athletic_profile if available and matches team sport
    // positions array format: "Sport - Position" (in Spanish)
    const positions = profile.athletic_profile?.positions || [];
    const teamSportName = team.sport?.name;

    console.log('[Setup] Position matching:', {
      teamSportName,
      userPositions: positions,
      positionsType: typeof positions
    });

    // Find matching position for this team's sport
    const matchingPosition = positions.find((p: string) => {
      const matches = teamSportName && p.startsWith(teamSportName);
      console.log('[Setup] Checking position:', p, 'matches:', matches);
      return matches;
    });

    // Extract Spanish position name and translate to English for field layout
    let position = '';
    if (matchingPosition) {
      const spanishPosition = matchingPosition.split(' - ')[1];
      position = POSITION_TRANSLATION[spanishPosition] || spanishPosition;
      console.log('[Setup] Position translation:', {
        spanish: spanishPosition,
        english: position
      });
    }

    console.log('[Setup] Pre-filled values:', {
      fullName,
      firstName,
      jerseyNumber,
      position,
      matchingPosition
    });

    setPlayerInfo(prev => ({
      ...prev,
      player_name: fullName,
      jersey_name: firstName,
      jersey_number: jerseyNumber,
      position: position,
    }));
  }, [profile, team, currentUser]);

  async function loadTeamAndCheckSetup() {
    try {
      const supabase = getBrowserClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUser(user);

      // Get team with sport information
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*, sport:sports(*)')
        .eq('slug', slug)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      // Check if player info already exists
      const { data: playerData } = await supabase
        .from('team_players')
        .select('*')
        .eq('team_id', teamData.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (playerData) {
        // Setup complete, redirect to team page
        router.push(`/mi-equipo/${slug}`);
        return;
      }

      // Pre-filling happens in separate useEffect that watches for profile changes

    } catch (error) {
      console.error('Error loading team:', error);
      alert('Error loading team. Redirecting...');
      router.push('/mi-equipo');
    } finally {
      setLoading(false);
    }
  }

  async function handlePlayerInfoSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate jersey name
    if (!playerInfo.jersey_name.trim()) {
      alert('Por favor ingresa el nombre para tu camiseta');
      return;
    }

    // Validate position only if sport has positions
    if (team?.sport?.slug && !playerInfo.position) {
      alert('Por favor selecciona tu posición');
      return;
    }

    setSaving(true);
    try {
      const supabase = getBrowserClient();

      // Get full name from profile (this is the official roster name)
      const fullName = profile?.full_name || currentUser.user_metadata?.full_name || playerInfo.jersey_name.trim();
      const jerseyName = playerInfo.jersey_name.trim();

      console.log('[Setup] Saving player info:', { fullName, jerseyName });

      // Create player record in team_players (for mini field view)
      // Use jersey_name for display on the field
      const { error: playersError } = await supabase
        .from('team_players')
        .insert({
          team_id: team.id,
          user_id: currentUser.id,
          player_name: jerseyName, // Display name for field
          jersey_name: jerseyName, // Jersey name (new column)
          jersey_number: playerInfo.jersey_number || null,
          position: playerInfo.position || null,
          is_starter: true, // Owner/creator is starter by default
        });

      if (playersError) throw playersError;

      // ALSO create player_info_submission (for roster view)
      // This ensures the team creator appears in the roster list
      // Use full name for official roster display
      const { error: submissionError } = await supabase
        .from('player_info_submissions')
        .insert({
          team_id: team.id,
          user_id: currentUser.id,
          player_name: fullName, // Full legal name for roster display
          jersey_name: jerseyName, // Jersey name (new column)
          jersey_number: playerInfo.jersey_number || null,
          size: 'M', // Default size for team creator
          position: playerInfo.position || null,
          submitted_by_manager: true, // Team creator submits as manager
          submission_token: null, // No token for setup submissions
          confirmed_by_player: false, // NOT confirmed yet - needs final confirmation
          confirmation_date: null, // Will be set when player confirms
          confirmation_method: null, // Will be set when player confirms
        });

      if (submissionError) {
        console.error('Error creating player_info_submission:', submissionError);
        // Don't throw - this is not critical, player is already in team_players
      }

      // Setup complete! Redirect to team page
      router.push(`/mi-equipo/${slug}`);
    } catch (error: any) {
      console.error('Error saving player info:', error);
      alert('Error guardando información: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-lg text-gray-300">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            ¡Completa tu información!
          </h1>
          <p className="text-gray-400">
            Solo un paso más para empezar
          </p>
        </div>

        {/* Manager-Only Option */}
        <div className="mb-6">
          <button
            onClick={async () => {
              setSaving(true);
              try {
                const supabase = getBrowserClient();

                // If user is currently a 'player', upgrade them to 'hybrid'
                // because they're managing a team (need manager capabilities)
                if (profile?.user_type === 'player') {
                  console.log('[Setup] User is player, upgrading to hybrid for manager role');

                  // Create basic manager_profile if they don't have one
                  const managerProfile = profile.manager_profile || {
                    organization_name: team.name, // Use team name as default
                    role: 'Manager',
                    phone: '',
                    department: ''
                  };

                  // Update user to hybrid type with manager_profile
                  const { error: profileError } = await supabase
                    .from('profiles')
                    .update({
                      user_type: 'hybrid', // Player who also manages
                      manager_profile: managerProfile
                    })
                    .eq('id', currentUser.id);

                  if (profileError) {
                    console.error('[Setup] Error upgrading to hybrid:', profileError);
                    throw profileError;
                  }

                  console.log('[Setup] Successfully upgraded player to hybrid');
                }

                // Mark team as manager-only
                const { error } = await supabase
                  .from('teams')
                  .update({ manager_only_team: true })
                  .eq('id', team.id);

                if (error) throw error;

                // Redirect to team page
                router.push(`/mi-equipo/${slug}`);
              } catch (error: any) {
                console.error('Error setting manager-only mode:', error);
                alert('Error: ' + error.message);
                setSaving(false);
              }
            }}
            disabled={saving}
            className="w-full py-4 bg-gray-700/80 hover:bg-gray-600/80 text-white rounded-lg font-medium transition-all border border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg">👔</span>
              <span>Soy solo el Manager - No juego en el equipo</span>
            </div>
            <p className="text-sm text-gray-400 mt-1">Puedes agregar jugadores después</p>
          </button>
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-gray-900 text-gray-400">O completa tu información de jugador</span>
          </div>
        </div>

        {/* Player Info Form */}
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-8 border border-gray-700 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>

          <div className="relative">
            <h2 className="text-2xl font-bold text-white mb-4">
              Tu Información de Jugador
            </h2>
              <p className="text-gray-300 mb-6">
                Completa tu información para aparecer en el roster del equipo
              </p>

              <form onSubmit={handlePlayerInfoSubmit} className="space-y-4">
                {/* Show user's full name as reference */}
                {profile?.full_name && (
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-200">
                      <strong>Tu nombre completo:</strong> {profile.full_name}
                    </p>
                    <p className="text-xs text-blue-300/70 mt-1">
                      Este es tu nombre oficial para el roster del equipo
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ¿Qué nombre quieres en tu camiseta? *
                  </label>
                  <input
                    type="text"
                    value={playerInfo.jersey_name}
                    onChange={(e) => setPlayerInfo({ ...playerInfo, jersey_name: e.target.value })}
                    className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#e21c21] focus:border-[#e21c21] outline-none transition-all"
                    placeholder="Ej: PÉREZ, Juan, JP"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Puede ser tu apellido, apodo, o nombre completo
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Número de Jersey
                  </label>
                  <input
                    type="text"
                    value={playerInfo.jersey_number}
                    onChange={(e) => setPlayerInfo({ ...playerInfo, jersey_number: e.target.value })}
                    className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#e21c21] focus:border-[#e21c21] outline-none transition-all"
                    placeholder="Ej: 10"
                  />
                </div>

                {team?.sport?.slug && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Posición *
                    </label>
                    <select
                      value={playerInfo.position}
                      onChange={(e) => setPlayerInfo({ ...playerInfo, position: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#e21c21] focus:border-[#e21c21] outline-none transition-all appearance-none cursor-pointer"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.5rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.5em 1.5em',
                        paddingRight: '2.5rem'
                      }}
                    >
                      <option value="">Seleccionar posición (opcional)</option>
                      {getFieldLayout(team.sport.slug).positions.map((pos) => (
                        <option key={pos.name} value={pos.name}>
                          {pos.name} ({pos.abbr})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="relative w-full px-6 py-3 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group/btn border border-[#e21c21]/50"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                  <span className="relative">
                    {saving ? 'Guardando...' : 'Completar Configuración →'}
                  </span>
                </button>
              </form>
            </div>
          </div>
      </div>
    </div>
  );
}
