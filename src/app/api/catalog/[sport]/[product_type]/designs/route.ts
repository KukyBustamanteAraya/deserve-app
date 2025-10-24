// GET /api/catalog/[sport]/[product_type]/designs
// Returns all designs available for a specific sport + product type combination
// Example: GET /api/catalog/futbol/jersey/designs

import { createSupabaseServer } from '@/lib/supabase/server-client';
import { apiSuccess, apiError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

export async function GET(
  request: Request,
  { params }: { params: { sport: string; product_type: string } }
) {
  try {
    const { sport: sportSlug, product_type: productTypeSlug } = params;
    const supabase = await createSupabaseServer();

    // Parse query parameters for filtering/sorting
    const { searchParams } = new URL(request.url);
    const styleTag = searchParams.get('style');
    const featured = searchParams.get('featured') === 'true';
    const sortBy = searchParams.get('sort') || 'newest'; // newest, name, popular

    // 1. Look up sport by slug
    const { data: sport, error: sportError } = await supabase
      .from('sports')
      .select('id, name, slug')
      .eq('slug', sportSlug)
      .single();

    if (sportError || !sport) {
      logger.error('Sport not found', { slug: sportSlug });
      return apiError(`Sport "${sportSlug}" not found`, 404);
    }

    // 2. Get all design_mockups for this sport+product_type combination
    // Then join back to designs table to get design details
    const { data: mockups, error: mockupsError } = await supabase
      .from('design_mockups')
      .select(`
        design_id,
        mockup_url,
        is_primary,
        product_id,
        designs!inner (
          id,
          slug,
          name,
          description,
          designer_name,
          style_tags,
          color_scheme,
          is_customizable,
          allows_recoloring,
          featured,
          active,
          created_at
        )
      `)
      .eq('sport_id', sport.id)
      .eq('product_type_slug', productTypeSlug)
      .eq('designs.active', true);

    if (mockupsError) {
      logger.error('Error fetching design mockups:', mockupsError);
      return apiError('Failed to fetch designs', 500);
    }

    if (!mockups || mockups.length === 0) {
      return apiSuccess([], `No designs found for ${productTypeSlug} in ${sport.name}`);
    }

    // 3. Process designs and get cross-sport availability
    const designsMap = new Map();

    for (const mockup of mockups) {
      const design = mockup.designs as any;
      
      if (!design) continue;

      // Skip if already processed this design
      if (designsMap.has(design.id)) continue;

      // Apply filters
      if (featured && !design.featured) continue;
      if (styleTag && !design.style_tags?.includes(styleTag)) continue;

      // Get all sports this design is available on (for this product type)
      const { data: availableSports } = await supabase
        .from('design_mockups')
        .select(`
          sport_id,
          sports:sport_id (
            id,
            slug,
            name
          )
        `)
        .eq('design_id', design.id)
        .eq('product_type_slug', productTypeSlug);

      const uniqueSports = Array.from(
        new Map(
          (availableSports || []).map(item => [
            item.sport_id,
            item.sports
          ])
        ).values()
      );

      designsMap.set(design.id, {
        design_id: design.id,
        slug: design.slug,
        name: design.name,
        description: design.description,
        designer_name: design.designer_name,
        style_tags: design.style_tags || [],
        color_scheme: design.color_scheme || [],
        is_customizable: design.is_customizable,
        allows_recoloring: design.allows_recoloring,
        featured: design.featured,
        primary_mockup_url: mockup.mockup_url,
        available_on_sports: uniqueSports,
        created_at: design.created_at,
      });
    }

    let designs = Array.from(designsMap.values());

    // 4. Apply sorting
    designs.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'popular':
          // TODO: Add view count tracking
          return 0;
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    // 5. Return designs
    return apiSuccess(
      {
        sport: {
          id: sport.id,
          slug: sport.slug,
          name: sport.name,
        },
        product_type: productTypeSlug,
        designs,
        total_designs: designs.length,
        filters_applied: {
          style: styleTag || null,
          featured: featured || false,
          sort: sortBy,
        },
      },
      `Found ${designs.length} design(s) for ${productTypeSlug} in ${sport.name}`
    );

  } catch (error) {
    logger.error('Unexpected error in design browser API:', toError(error));
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
