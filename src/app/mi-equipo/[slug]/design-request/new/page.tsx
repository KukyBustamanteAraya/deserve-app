'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';

export default function DesignRequestEntryPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkTeamTypeAndRedirect() {
      try {
        const supabase = getBrowserClient();

        // Get team to check type
        const { data: team, error } = await supabase
          .from('teams')
          .select('team_type, sport_id')
          .eq('slug', params.slug)
          .single();

        if (error) {
          console.error('[Design Request] Error loading team:', error);
          router.push(`/mi-equipo/${params.slug}`);
          return;
        }

        console.log('[Design Request] Team type detected:', team.team_type);

        // Route based on team type
        if (team.team_type === 'institution') {
          // Institution flow: select sub-teams first
          console.log('[Design Request] Routing to institution wizard (teams step)');
          router.push(`/mi-equipo/${params.slug}/design-request/new/teams`);
        } else {
          // Single team flow: skip teams step, go directly to gender selection
          console.log('[Design Request] Routing to single team wizard (gender step)');
          router.push(`/mi-equipo/${params.slug}/design-request/new/gender`);
        }
      } catch (error) {
        console.error('[Design Request] Error:', error);
        router.push(`/mi-equipo/${params.slug}`);
      } finally {
        setChecking(false);
      }
    }

    checkTeamTypeAndRedirect();
  }, [params.slug, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-300">Iniciando...</p>
      </div>
    </div>
  );
}
