'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { useDesignRequestWizard } from '@/store/design-request-wizard';

export default function DesignRequestEntryPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const { setSelectedTeams, resetWizard } = useDesignRequestWizard();

  useEffect(() => {
    async function checkTeamTypeAndRedirect() {
      try {
        const supabase = getBrowserClient();

        // Reset wizard state at the start of design request flow
        console.log('[Design Request] Resetting wizard state');
        resetWizard();

        // Get team to check type
        const { data: team, error } = await supabase
          .from('teams')
          .select(`
            id,
            name,
            team_type,
            sport_id,
            sports!teams_sport_id_fkey (
              name
            )
          `)
          .eq('slug', slug)
          .single();

        if (error) {
          console.error('[Design Request] Error loading team:', error);
          router.push(`/mi-equipo/${slug}`);
          return;
        }

        console.log('[Design Request] Team type detected:', team.team_type);

        // Route based on team type
        if (team.team_type === 'institution') {
          // Institution flow: select sub-teams first
          console.log('[Design Request] Routing to institution wizard (teams step)');
          router.push(`/mi-equipo/${slug}/design-request/new/teams`);
        } else {
          // Single team flow: Initialize selectedTeams with current team
          console.log('[Design Request] Initializing selectedTeams for single team:', team.name);
          setSelectedTeams([{
            id: team.id,
            name: team.name,
            slug: slug,
            sport_id: team.sport_id,
            sport_name: team.sports?.name,
            isNew: false,
          }]);

          // Go directly to products (gender is already in team record)
          console.log('[Design Request] Routing to single team wizard (products step)');
          router.push(`/mi-equipo/${slug}/design-request/new/products`);
        }
      } catch (error) {
        console.error('[Design Request] Error:', error);
        router.push(`/mi-equipo/${slug}`);
      } finally {
        setChecking(false);
      }
    }

    checkTeamTypeAndRedirect();
  }, [slug, router, setSelectedTeams, resetWizard]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-300">Iniciando...</p>
      </div>
    </div>
  );
}
