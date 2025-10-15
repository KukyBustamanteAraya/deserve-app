// Design Detail Page - Shows design with sport switcher
// Example: /designs/elevate?sport=futbol
import { notFound } from 'next/navigation';
import { DesignDetailClient } from './DesignDetailClient';
import { logger } from '@/lib/logger';
import { createSupabaseServer } from '@/lib/supabase/server-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    slug: string;
  };
  searchParams: {
    sport?: string;
  };
}

async function getDesignData(slug: string, sportSlug?: string) {
  try {
    const supabase = createSupabaseServer();

    // 1. Get design by slug
    const { data: design, error: designError } = await supabase
      .from('designs')
      .select('*')
      .eq('slug', slug)
      .eq('active', true)
      .single();

    if (designError || !design) {
      logger.error('Design not found:', slug);
      return null;
    }

    // 2. Get all mockups for this design across all sports
    const { data: mockups, error: mockupsError } = await supabase
      .from('design_mockups')
      .select(`
        id,
        sport_id,
        product_id,
        product_type_slug,
        mockup_url,
        view_angle,
        is_primary,
        sort_order,
        sports:sport_id (
          id,
          slug,
          name
        ),
        products:product_id (
          id,
          name,
          slug,
          price_clp,
          category
        )
      `)
      .eq('design_id', design.id)
      .order('sport_id', { ascending: true })
      .order('sort_order', { ascending: true });

    if (mockupsError) {
      logger.error('Error fetching mockups:', mockupsError);
      return null;
    }

    // 3. Organize mockups by sport
    const mockupsBySport = new Map();
    const availableSports = new Set();
    const availableProducts = new Map(); // Map<sport_id, Product[]>

    (mockups || []).forEach((mockup: any) => {
      const sportId = mockup.sport_id;
      const sportData = mockup.sports;

      if (!sportData) return;

      availableSports.add(JSON.stringify(sportData));

      // Add mockup to sport group
      if (!mockupsBySport.has(sportId)) {
        mockupsBySport.set(sportId, []);
      }
      mockupsBySport.get(sportId).push({
        id: mockup.id,
        mockup_url: mockup.mockup_url,
        view_angle: mockup.view_angle,
        is_primary: mockup.is_primary,
        sort_order: mockup.sort_order,
        product_id: mockup.product_id,
        product: mockup.products,
      });

      // Track available products per sport
      if (mockup.products) {
        if (!availableProducts.has(sportId)) {
          availableProducts.set(sportId, []);
        }
        const products = availableProducts.get(sportId);
        if (!products.find((p: any) => p.id === mockup.products.id)) {
          products.push(mockup.products);
        }
      }
    });

    // Convert sets/maps to arrays
    const sportsArray = Array.from(availableSports).map(s => JSON.parse(s));

    const mockupsGrouped = Array.from(mockupsBySport.entries()).map(([sportId, mockups]) => {
      const sport = sportsArray.find(s => s.id === sportId);
      return {
        sport_id: sportId,
        sport,
        mockups,
        products: availableProducts.get(sportId) || [],
      };
    });

    // 4. If sport filter is provided, filter mockups
    let filteredMockups = mockupsGrouped;
    let currentSport = null;

    if (sportSlug) {
      const selectedSport = sportsArray.find(s => s.slug === sportSlug);
      if (selectedSport) {
        filteredMockups = mockupsGrouped.filter(g => g.sport_id === selectedSport.id);
        currentSport = selectedSport;
      }
    } else {
      // Default to first available sport
      currentSport = sportsArray[0] || null;
      if (currentSport) {
        filteredMockups = mockupsGrouped.filter(g => g.sport_id === currentSport.id);
      }
    }

    // 5. Return design with mockups
    return {
      design: {
        id: design.id,
        slug: design.slug,
        name: design.name,
        description: design.description,
        designer_name: design.designer_name,
        style_tags: design.style_tags || [],
        color_scheme: design.color_scheme || [],
        is_customizable: design.is_customizable,
        allows_recoloring: design.allows_recoloring,
        featured: design.featured,
      },
      current_sport: currentSport,
      available_sports: sportsArray,
      mockups_by_sport: mockupsGrouped,
      current_mockups: filteredMockups,
      total_sports: sportsArray.length,
    };

  } catch (error) {
    logger.error('Error fetching design data:', error);
    return null;
  }
}

export default async function DesignDetailPage({ params, searchParams }: PageProps) {
  const { slug } = params;
  const { sport } = searchParams;

  // Fetch design data (no authentication required - catalog is public)
  const designData = await getDesignData(slug, sport);

  if (!designData) {
    notFound();
  }

  const {
    design,
    current_sport,
    available_sports,
    mockups_by_sport,
    current_mockups,
    total_sports,
  } = designData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-12">
        {/* Client component with sport switcher and design info */}
        <DesignDetailClient
          design={design}
          currentSport={current_sport}
          availableSports={available_sports}
          mockupsBySport={mockups_by_sport}
          currentMockups={current_mockups}
        />
      </div>
    </div>
  );
}

// Generate metadata
export async function generateMetadata({ params, searchParams }: PageProps) {
  const designData = await getDesignData(params.slug, searchParams.sport);

  if (!designData) {
    return {
      title: 'Diseño | Deserve',
      description: 'Explora nuestros diseños',
    };
  }

  const { design, current_sport } = designData;

  return {
    title: `${design.name}${current_sport ? ` - ${current_sport.name}` : ''} | Deserve`,
    description: design.description || `Diseño ${design.name} por ${design.designer_name || 'Deserve Studio'}`,
    openGraph: {
      title: design.name,
      description: design.description || `Diseño por ${design.designer_name || 'Deserve Studio'}`,
    },
  };
}
