// Main catalog page - Sport selector with product rows
import { createClient } from '@supabase/supabase-js';
import { CatalogWithSportSelector } from './CatalogWithSportSelector';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

export const dynamic = 'force-dynamic';

async function getSports() {
  // Use direct client for public data - avoids cookies() call that causes Suspense hanging
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    logger.info('[CATALOG] Fetching sports...');
    const { data: sports, error } = await supabase
      .from('sports')
      .select('id, slug, name')
      .order('name', { ascending: true });

    if (error) {
      logger.error('[CATALOG] Error fetching sports:', toError(error));
      return [];
    }

    logger.info('[CATALOG] Sports fetched successfully:', { count: sports?.length || 0 });
    return sports || [];
  } catch (error) {
    logger.error('[CATALOG] Exception in getSports:', toError(error));
    return [];
  }
}

export default async function CatalogPage() {
  // Catalog is public - no authentication required

  logger.info('[CATALOG] Rendering CatalogPage...');

  // Fetch all sports
  const sports = await getSports();

  logger.info('[CATALOG] Rendering with sports:', { sportsCount: sports.length });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
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
