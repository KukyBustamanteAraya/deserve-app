// GET /api/designs/[slug]
// Returns design details with mockups for all sports
// Supports sport switching via query param: ?sport=futbol
// Example: GET /api/designs/elevate?sport=futbol

import { createSupabaseServer } from '@/lib/supabase/server-client';
import { apiSuccess, apiError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const supabase = await createSupabaseServer();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const selectedSportSlug = searchParams.get('sport'); // Optional: filter mockups by sport

    // 1. Get design by slug
    const { data: design, error: designError } = await supabase
      .from('designs')
      .select('*')
      .eq('slug', slug)
      .eq('active', true)
      .single();

    if (designError || !design) {
      logger.error('Design not found', { slug });
      return apiError(`Design "${slug}" not found`, 404);
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
      return apiError('Failed to fetch design mockups', 500);
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
    const sportsArray = Array.from(availableSports).map((s: unknown) => JSON.parse(s as string));
    
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
    let currentSport: { id: number; slug: string; name: string } | null = null;

    if (selectedSportSlug) {
      const selectedSport = sportsArray.find(s => s.slug === selectedSportSlug);
      if (selectedSport) {
        filteredMockups = mockupsGrouped.filter(g => g.sport_id === selectedSport.id);
        currentSport = selectedSport;
      }
    } else {
      // Default to first available sport
      currentSport = sportsArray[0] || null;
      if (currentSport) {
        filteredMockups = mockupsGrouped.filter(g => g.sport_id === currentSport!.id);
      }
    }

    // 5. Return design with mockups
    return apiSuccess(
      {
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
        mockups_by_sport: mockupsGrouped, // All mockups grouped by sport
        current_mockups: filteredMockups, // Mockups for selected/default sport
        total_sports: sportsArray.length,
      },
      `Design loaded with ${sportsArray.length} sport variant(s)`
    );

  } catch (error) {
    logger.error('Unexpected error in design detail API:', toError(error));
    return apiError('An unexpected error occurred');
  }
}

// Disable other HTTP methods
export async function POST() {
  return apiError('Method not allowed', 405);
}

export async function PATCH() {
  return apiError('Method not allowed', 405);
}

export async function PUT() {
  return apiError('Method not allowed', 405);
}

export async function DELETE() {
  return apiError('Method not allowed', 405);
}
