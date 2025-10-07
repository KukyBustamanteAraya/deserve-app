// Catalog page with server-side rendering and client interactivity
import { redirect } from 'next/navigation';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { queryProducts } from '@/lib/catalog/queryProducts';
import { CatalogClient } from './CatalogClient';
import type { Sport, ProductListResult } from '@/types/catalog';

export const revalidate = 60; // Revalidate every minute

async function getSports(): Promise<Sport[]> {
  const supabase = createSupabaseServer();

  try {
    await requireAuth(supabase);

    const { data: sports, error } = await supabase
      .from('sports')
      .select('id, slug, name, created_at')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching sports:', error);
      return [];
    }

    return sports || [];
  } catch (error) {
    console.error('Error in getSports:', error);
    return [];
  }
}

async function getInitialProducts(sportSlug?: string): Promise<ProductListResult> {
  try {
    // Use the standardized queryProducts helper
    const result = await queryProducts({
      sport: sportSlug,
      limit: 24
    });

    return result;
  } catch (error) {
    console.error('Error in getInitialProducts:', error);
    return { items: [], nextCursor: null, total: 0 };
  }
}

interface PageProps {
  searchParams: {
    sport?: string;
  };
}

export default async function CatalogPage({ searchParams }: PageProps) {
  const { sport } = searchParams;

  // Check authentication server-side
  const supabase = createSupabaseServer();
  try {
    await requireAuth(supabase);
  } catch (error) {
    redirect('/login?redirect=/catalog');
  }

  // Fetch initial data server-side
  const [sports, initialProducts] = await Promise.all([
    getSports(),
    getInitialProducts(sport),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Client-side catalog component */}
        <CatalogClient
          sports={sports}
          initialProducts={initialProducts}
          initialSport={sport || null}
        />
      </div>
    </div>
  );
}

// Metadata
export async function generateMetadata({ searchParams }: PageProps) {
  const { sport } = searchParams;

  if (sport) {
    return {
      title: `${sport.charAt(0).toUpperCase() + sport.slice(1)} - Catálogo | Deserve`,
      description: `Explora nuestra colección de uniformes de ${sport} de alta calidad.`,
    };
  }

  return {
    title: 'Catálogo de Productos | Deserve',
    description: 'Descubre nuestra colección completa de uniformes deportivos profesionales.',
  };
}