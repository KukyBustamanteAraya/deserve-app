// Main catalog page - Sport selector with product rows
import { createSupabaseServer } from '@/lib/supabase/server-client';
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
  // Catalog is public - no authentication required

  // Fetch all sports
  const sports = await getSports();

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12">
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
