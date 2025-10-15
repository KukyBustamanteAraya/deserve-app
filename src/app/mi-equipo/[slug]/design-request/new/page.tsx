'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DesignRequestEntryPage({ params }: { params: { slug: string } }) {
  const router = useRouter();

  useEffect(() => {
    // Redirect to team selection step (sport selection is now embedded in team creation)
    router.push(`/mi-equipo/${params.slug}/design-request/new/teams`);
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
