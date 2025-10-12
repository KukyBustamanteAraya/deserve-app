// Main catalog page - Sport selector with product rows
import { redirect } from 'next/navigation';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { CatalogWithSportSelector } from './CatalogWithSportSelector';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

async function getSports() {
  const supabase = createSupabaseServer();

  try {
    const { data: sports, error } = await supabase
      .from('sports')
      .select('id, slug, name')
      .order('name', { ascending: true });

    if (error) {
      logger.error('Error fetching sports:', error);
      return [];
    }

    return sports || [];
  } catch (error) {
    logger.error('Error in getSports:', error);
    return [];
  }
}

export default async function CatalogPage() {
  // Check authentication
  const supabase = createSupabaseServer();
  try {
    await requireAuth(supabase);
  } catch (error) {
    redirect('/login?redirect=/catalog');
  }

  // Fetch all sports
  const sports = await getSports();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Catálogo</h1>
          <p className="text-gray-400 text-lg">
            Explora nuestros diseños por deporte y producto
          </p>
        </div>

        {/* Sport selector and product rows */}
        <CatalogWithSportSelector sports={sports} />
      </div>
    </div>
  );
}

// Generate metadata
export async function generateMetadata() {
  return {
    title: 'Catálogo de Productos | Deserve',
    description: 'Explora nuestra colección de uniformes deportivos por deporte y producto',
  };
}
