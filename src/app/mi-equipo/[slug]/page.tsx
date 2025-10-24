'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import InstitutionDashboard from './institution-page';
import SingleTeamDashboard from './single-team-page';

/**
 * Lightweight router component that determines team type and renders appropriate dashboard
 * This replaces the massive conditional rendering in the original page
 */
export default function TeamPageRouter({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const [teamType, setTeamType] = useState<'single_team' | 'institution' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function determineTeamType() {
      try {
        const supabase = getBrowserClient();

        // Get current user (require auth)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        // Fetch ONLY the team type (minimal query)
        console.log('[Router] Looking for team with slug:', slug);
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('team_type')
          .eq('slug', slug)
          .single();

        if (teamError) {
          console.error('[Router] Failed to find team with slug:', slug);
          console.error('[Router] Error details:', teamError);
          throw new Error(`Team not found with slug: "${slug}". ${teamError.message}`);
        }

        console.log('[Router] Team type determined:', teamData.team_type);
        setTeamType(teamData.team_type || 'single_team');
      } catch (err: any) {
        console.error('[Router] Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    determineTeamType();
  }, [slug, router]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-lg text-gray-300">Cargando equipo...</div>
      </div>
    );
  }

  // Error state
  if (error || !teamType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">Error cargando equipo</p>
          <p className="text-gray-400 mb-6">{error || 'Equipo no encontrado'}</p>
          <button
            onClick={() => router.push('/mi-equipo')}
            className="px-6 py-3 bg-[#e21c21] hover:bg-[#c11a1e] text-white rounded-lg transition-colors"
          >
            Volver a Mis Equipos
          </button>
        </div>
      </div>
    );
  }

  // Route to appropriate dashboard
  if (teamType === 'institution') {
    return <InstitutionDashboard params={{ slug }} />;
  }

  return <SingleTeamDashboard params={{ slug }} />;
}
