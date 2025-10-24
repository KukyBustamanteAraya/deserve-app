'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { SizeAssignmentCard } from '@/components/team/orders/SizeAssignmentCard';
import { MockupCarousel } from '@/components/design/MockupCarousel';
import { getAllMockups, hasMockups } from '@/lib/mockup-helpers';
import { KitDisplayCard } from '@/components/design/KitDisplayCard';
import Image from 'next/image';

interface DesignRequest {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  design_id: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  feedback: string | null;
  sport_slug: string | null;
  designs?: {
    id: string;
    name: string;
    slug: string;
    design_mockups: {
      id: string;
      mockup_url: string;
      is_primary: boolean;
      view_angle: string;
      product_type_slug: string;
      sport_id: number;
    }[];
  };
}

interface RosterMember {
  id: string;
  player_name: string;
  jersey_number: string;
  position: string | null;
  size: string | null;
  email: string | null;
  additional_info: any;
  created_at: string;
}

interface TeamPageProps {
  params: {
    slug: string;
    teamSlug: string;
  };
}

export default function TeamDetailPage({ params }: TeamPageProps) {
  const { slug, teamSlug } = params;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teamData, setTeamData] = useState<any>(null);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('male');
  const [designRequests, setDesignRequests] = useState<DesignRequest[]>([]);
  const [rosterMembers, setRosterMembers] = useState<RosterMember[]>([]);
  const [showSizeModal, setShowSizeModal] = useState(false);

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      const supabase = getBrowserClient();

      console.log('[Team Page] Loading team with slug:', teamSlug);

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
        .eq('slug', teamSlug)
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

      // Fetch design requests for this sub-team
      await loadDesignRequests(team.id);

      // Fetch roster members for this sub-team
      await loadRosterMembers(team.id);
    } catch (error) {
      console.error('[Team Page] Failed to load team:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDesignRequests = async (subTeamId: string) => {
    try {
      const supabase = getBrowserClient();

      console.log('[Team Page] Loading design requests for sub-team:', subTeamId);

      const { data: requests, error } = await supabase
        .from('design_requests')
        .select(`
          id,
          status,
          created_at,
          updated_at,
          design_id,
          primary_color,
          secondary_color,
          accent_color,
          feedback,
          sport_slug,
          mockup_preference,
          mockups,
          mockup_urls,
          designs (
            id,
            name,
            slug,
            design_mockups (
              id,
              mockup_url,
              is_primary,
              view_angle,
              product_type_slug,
              sport_id
            )
          )
        `)
        .eq('sub_team_id', subTeamId)
        .in('status', ['pending', 'in_review', 'changes_requested', 'approved', 'ready', 'design_ready'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Team Page] Error loading design requests:', error);
        return;
      }

      console.log('[Team Page] Design requests loaded:', requests);
      console.log('[Team Page] First request details:', requests?.[0]);
      console.log('[Team Page] First request design_id:', requests?.[0]?.design_id);
      console.log('[Team Page] First request designs:', requests?.[0]?.designs);
      setDesignRequests(requests || []);
    } catch (error) {
      console.error('[Team Page] Failed to load design requests:', error);
    }
  };

  const loadRosterMembers = async (subTeamId: string) => {
    try {
      const supabase = getBrowserClient();

      console.log('[Team Page] Loading roster members for sub-team:', subTeamId);

      const { data: members, error } = await supabase
        .from('institution_sub_team_members')
        .select('*')
        .eq('sub_team_id', subTeamId)
        .order('jersey_number', { ascending: true });

      if (error) {
        console.error('[Team Page] Error loading roster members:', error);
        return;
      }

      console.log('[Team Page] Roster members loaded:', members?.length || 0);
      setRosterMembers(members || []);
    } catch (error) {
      console.error('[Team Page] Failed to load roster members:', error);
    }
  };

  // Handler for size assignment completion
  const handleSizeAssignmentComplete = async () => {
    if (teamData?.id) {
      await loadRosterMembers(teamData.id);
      setShowSizeModal(false);
    }
  };

  // Calculate current size distribution from roster members
  const currentSizes: Record<string, number> = {};
  rosterMembers.forEach(member => {
    if (member.size && member.size !== '-') {
      currentSizes[member.size] = (currentSizes[member.size] || 0) + 1;
    }
  });

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
            onClick={() => router.push(`/mi-equipo/${slug}`)}
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
          onClick={() => router.push(`/mi-equipo/${slug}`)}
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

        {/* Home & Away Kits Display - Integrated with Design Requests */}
        <KitDisplayCard
          mockups={(designRequests[0] as any)?.mockups || {}}
          teamName={teamData.name}
          onDetails={() => {
            if (designRequests[0]) {
              // Navigate to unified order summary page using design-request-{id} format
              router.push(`/mi-equipo/${slug}/orders/design-request-${designRequests[0].id}`);
            }
          }}
          onModify={() => {
            if (designRequests[0]) {
              router.push(`/mi-equipo/${slug}/design-requests/${designRequests[0].id}`);
            }
          }}
          onNewKit={() => {
            router.push(`/mi-equipo/${slug}/design-request/new`);
          }}
          onReorder={() => {
            if (designRequests[0]) {
              // Navigate to unified order summary page
              router.push(`/mi-equipo/${slug}/orders/design-request-${designRequests[0].id}`);
            }
          }}
        />

        {/* Roster Grid */}
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Roster y Tallas</h2>
              {rosterMembers.length > 0 && (
                <p className="text-sm text-gray-400 mt-1">
                  {rosterMembers.length} jugador{rosterMembers.length !== 1 ? 'es' : ''}
                  {rosterMembers.filter(m => m.additional_info?.auto_generated).length > 0 && (
                    <span className="text-blue-400 ml-2">
                      ({rosterMembers.filter(m => m.additional_info?.auto_generated).length} auto-generados)
                    </span>
                  )}
                </p>
              )}
            </div>
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
              {rosterMembers.length > 0 && (
                <button
                  onClick={() => setShowSizeModal(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Asignar Tallas
                </button>
              )}
            </div>
          </div>

          {rosterMembers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">#</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Nombre</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Talla</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Estado</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-300">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="text-white font-semibold">{member.jersey_number}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`${member.additional_info?.auto_generated ? 'text-gray-400 italic' : 'text-white'}`}>
                          {member.player_name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-400">{member.size || '-'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-400 text-sm">{member.email || '-'}</span>
                      </td>
                      <td className="py-3 px-4">
                        {member.additional_info?.auto_generated ? (
                          <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded-full">
                            Placeholder
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 border border-green-500/50 rounded-full">
                            Completo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button className="text-gray-400 hover:text-white transition-colors p-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-400 mb-2">No hay jugadores en este equipo</p>
              <p className="text-gray-500 text-sm">Agrega jugadores para gestionar tallas y números</p>
            </div>
          )}
        </div>
      </div>

      {/* Size Assignment Modal */}
      {showSizeModal && teamData?.id && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setShowSizeModal(false)}
              className="absolute top-4 right-4 z-10 text-gray-400 hover:text-white transition-colors bg-gray-800/80 rounded-full p-2"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <SizeAssignmentCard
              subTeamId={teamData.id}
              institutionSlug={slug}
              rosterSize={rosterMembers.length}
              currentSizes={currentSizes}
              onAssignmentComplete={handleSizeAssignmentComplete}
            />
          </div>
        </div>
      )}
    </div>
  );
}
