'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';

interface TeamPageProps {
  params: {
    slug: string;
    teamSlug: string;
  };
}

export default function TeamDetailPage({ params }: TeamPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teamData, setTeamData] = useState<any>(null);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('male');

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      const supabase = getBrowserClient();

      console.log('[Team Page] Loading team with slug:', params.teamSlug);

      // Get team data - select specific fields to avoid issues with missing columns
      const { data: team, error } = await supabase
        .from('institution_sub_teams')
        .select(`
          id,
          name,
          slug,
          sport_id,
          level,
          active,
          gender_category,
          institution_team_id,
          sports(id, name, slug)
        `)
        .eq('slug', params.teamSlug)
        .single();

      if (error) {
        console.error('[Team Page] Error loading team:', error);
        throw error;
      }

      // Fetch institution data from teams table
      const { data: institution, error: instError } = await supabase
        .from('teams')
        .select('id, name, slug, logo_url, colors')
        .eq('id', team.institution_team_id)
        .single();

      if (instError) {
        console.error('[Team Page] Error loading institution:', instError);
      }

      // Combine the data
      const teamWithInstitution = {
        ...team,
        institution: institution ? {
          id: institution.id,
          name: institution.name,
          slug: institution.slug,
          logo_url: institution.logo_url,
          primary_color: institution.colors?.primary || '#e21c21',
          secondary_color: institution.colors?.secondary || '#000000',
        } : null,
      };

      console.log('[Team Page] Team loaded:', teamWithInstitution);
      setTeamData(teamWithInstitution);

      // Set initial gender - use team's gender_category if available, default to male
      if (team.gender_category === 'both') {
        setSelectedGender('male'); // Default to male view when both
      } else if (team.gender_category === 'female') {
        setSelectedGender('female');
      } else {
        setSelectedGender('male');
      }
    } catch (error) {
      console.error('[Team Page] Failed to load team:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e21c21] mx-auto mb-4"></div>
          <p className="text-gray-300">Cargando equipo...</p>
        </div>
      </div>
    );
  }

  if (!teamData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300 mb-4">Equipo no encontrado</p>
          <button
            onClick={() => router.push(`/mi-equipo/${params.slug}`)}
            className="text-[#e21c21] hover:text-[#c11a1e]"
          >
            Volver a la institución
          </button>
        </div>
      </div>
    );
  }

  // Only show gender toggle if team has gender_category field and it's set to 'both'
  const showGenderToggle = teamData?.gender_category === 'both';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/mi-equipo/${params.slug}`)}
          className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a {teamData.institution?.name}
        </button>

        {/* Team Header */}
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{teamData.name}</h1>
              <p className="text-gray-400">{teamData.sports?.name} • {teamData.level || 'Varsity'}</p>
            </div>
            {teamData.institution?.logo_url && (
              <img
                src={teamData.institution.logo_url}
                alt={teamData.institution.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
          </div>

          {/* Gender Toggle (only if both) */}
          {showGenderToggle && (
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-700">
              <span className="text-sm text-gray-400">Ver datos de:</span>
              <div className="flex items-center gap-2 p-1 bg-black/50 rounded-lg border border-gray-700">
                <button
                  onClick={() => setSelectedGender('male')}
                  className={`px-6 py-2 rounded-md font-medium transition-all ${
                    selectedGender === 'male'
                      ? 'bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Hombres
                </button>
                <button
                  onClick={() => setSelectedGender('female')}
                  className={`px-6 py-2 rounded-md font-medium transition-all ${
                    selectedGender === 'female'
                      ? 'bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Mujeres
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Home & Away Kits Display */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-8 mb-8">
          {/* Home Kit */}
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
            <div className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
                <h2 className="text-sm sm:text-base lg:text-xl font-bold text-white">Kit Local</h2>
                <div className="px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 bg-[#e21c21]/20 border border-[#e21c21] rounded-full">
                  <span className="text-[#e21c21] text-[10px] sm:text-xs lg:text-sm font-medium">LOCAL</span>
                </div>
              </div>

              {/* Kit Mockup Placeholder */}
              <div className="aspect-square bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-lg border border-gray-600 flex items-center justify-center mb-2 sm:mb-3 lg:mb-4">
                <div className="text-center">
                  <svg className="w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-gray-500 mx-auto mb-1 sm:mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500 text-[10px] sm:text-xs lg:text-sm">Kit no disponible</p>
                </div>
              </div>

              {/* Kit Info */}
              <div className="space-y-1 sm:space-y-2 mb-2 sm:mb-3 lg:mb-4">
                <p className="text-gray-400 text-[10px] sm:text-xs lg:text-sm">Diseño: <span className="text-white">Sin asignar</span></p>
                <p className="text-gray-400 text-[10px] sm:text-xs lg:text-sm">Conjuntos: <span className="text-white">0</span></p>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-1 sm:gap-1.5 lg:gap-2">
                <button className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-[#e21c21] hover:bg-[#c11a1e] text-white rounded-lg transition-colors text-[10px] sm:text-xs lg:text-sm font-medium">
                  Reordenar
                </button>
                <button className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-[10px] sm:text-xs lg:text-sm font-medium">
                  Modificar
                </button>
                <button className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-[10px] sm:text-xs lg:text-sm font-medium">
                  Nuevo
                </button>
                <button className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-[10px] sm:text-xs lg:text-sm font-medium">
                  Detalles
                </button>
              </div>
            </div>
          </div>

          {/* Away Kit */}
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
            <div className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
                <h2 className="text-sm sm:text-base lg:text-xl font-bold text-white">Kit Visitante</h2>
                <div className="px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 bg-blue-500/20 border border-blue-500 rounded-full">
                  <span className="text-blue-400 text-[10px] sm:text-xs lg:text-sm font-medium">VISIT</span>
                </div>
              </div>

              {/* Kit Mockup Placeholder */}
              <div className="aspect-square bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-lg border border-gray-600 flex items-center justify-center mb-2 sm:mb-3 lg:mb-4">
                <div className="text-center">
                  <svg className="w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-gray-500 mx-auto mb-1 sm:mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500 text-[10px] sm:text-xs lg:text-sm">Kit no disponible</p>
                </div>
              </div>

              {/* Kit Info */}
              <div className="space-y-1 sm:space-y-2 mb-2 sm:mb-3 lg:mb-4">
                <p className="text-gray-400 text-[10px] sm:text-xs lg:text-sm">Diseño: <span className="text-white">Sin asignar</span></p>
                <p className="text-gray-400 text-[10px] sm:text-xs lg:text-sm">Conjuntos: <span className="text-white">0</span></p>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-1 sm:gap-1.5 lg:gap-2">
                <button className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-[#e21c21] hover:bg-[#c11a1e] text-white rounded-lg transition-colors text-[10px] sm:text-xs lg:text-sm font-medium">
                  Reordenar
                </button>
                <button className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-[10px] sm:text-xs lg:text-sm font-medium">
                  Modificar
                </button>
                <button className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-[10px] sm:text-xs lg:text-sm font-medium">
                  Nuevo
                </button>
                <button className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-[10px] sm:text-xs lg:text-sm font-medium">
                  Detalles
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Design Requests in Progress */}
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Solicitudes de Diseño Activas</h2>

          <div className="text-center py-8">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-400 mb-4">No hay solicitudes de diseño activas</p>
            <button
              onClick={() => router.push(`/mi-equipo/${params.slug}/design-request/new`)}
              className="px-6 py-3 bg-[#e21c21] hover:bg-[#c11a1e] text-white rounded-lg transition-colors font-medium"
            >
              Iniciar Nueva Solicitud de Diseño
            </button>
          </div>
        </div>

        {/* Roster Grid */}
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Roster y Tallas</h2>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium">
                Agregar Jugador
              </button>
              <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium">
                Importar CSV
              </button>
              <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium">
                Exportar
              </button>
            </div>
          </div>

          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-400 mb-2">No hay jugadores en este equipo</p>
            <p className="text-gray-500 text-sm">Agrega jugadores para gestionar tallas y números</p>
          </div>
        </div>
      </div>
    </div>
  );
}
