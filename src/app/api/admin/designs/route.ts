// GET /api/admin/designs - List all designs
// POST /api/admin/designs - Create new design
import { requireAdmin } from '@/lib/auth/admin-guard';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const supabase = createSupabaseServer();
    const { searchParams } = new URL(request.url);

    // Filters
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const featured = searchParams.get('featured');
    const sport = searchParams.get('sport');
    const sortBy = searchParams.get('sort') || 'newest';

    // Build query
    let query = supabase
      .from('designs')
      .select(`
        *,
        design_mockups (
          id,
          sport_id,
          product_type_slug,
          mockup_url,
          is_primary,
          sports:sport_id (
            id,
            slug,
            name
          )
        )
      `);

    // Apply filters
    if (status === 'active') {
      query = query.eq('active', true);
    } else if (status === 'inactive') {
      query = query.eq('active', false);
    }

    if (featured === 'true') {
      query = query.eq('featured', true);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply sorting
    switch (sortBy) {
      case 'name-asc':
        query = query.order('name', { ascending: true });
        break;
      case 'name-desc':
        query = query.order('name', { ascending: false });
        break;
      case 'featured':
        query = query.order('featured', { ascending: false }).order('created_at', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    const { data: designs, error } = await query;

    if (error) {
      logger.error('Error fetching designs:', error);
      return apiError('Failed to fetch designs', 500);
    }

    // Post-process: Filter by sport if specified (after fetching mockups)
    let filteredDesigns = designs || [];
    if (sport) {
      filteredDesigns = filteredDesigns.filter((design: any) => {
        return design.design_mockups?.some((mockup: any) => mockup.sports?.slug === sport);
      });
    }

    // Transform data: Add summary info
    const transformedDesigns = filteredDesigns.map((design: any) => {
      const mockups = design.design_mockups || [];
      const availableSports = [...new Set(mockups.map((m: any) => m.sports?.slug).filter(Boolean))];
      const availableProductTypes = [...new Set(mockups.map((m: any) => m.product_type_slug).filter(Boolean))];
      const primaryMockup = mockups.find((m: any) => m.is_primary) || mockups[0];

      return {
        ...design,
        mockup_count: mockups.length,
        available_sports: availableSports,
        available_product_types: availableProductTypes,
        primary_mockup_url: primaryMockup?.mockup_url || null,
      };
    });

    return apiSuccess({
      designs: transformedDesigns,
      total: transformedDesigns.length,
    }, `Found ${transformedDesigns.length} designs`);

  } catch (error) {
    logger.error('Unexpected error in designs endpoint:', error);
    return apiError('An unexpected error occurred while fetching designs');
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const supabase = createSupabaseServer();
    const body = await request.json();

    const {
      name,
      slug,
      description,
      designer_name,
      style_tags,
      color_scheme,
      is_customizable,
      allows_recoloring,
      featured,
      active,
      mockups, // Array of { sport_id, product_type_slug, mockup_url, view_angle, is_primary }
    } = body;

    // Validation
    if (!name || !slug) {
      return apiError('Name and slug are required', 400);
    }

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('designs')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      return apiError('Slug already exists', 400);
    }

    // Create design
    const { data: design, error: designError } = await supabase
      .from('designs')
      .insert({
        name,
        slug,
        description,
        designer_name,
        style_tags: style_tags || [],
        color_scheme: color_scheme || [],
        is_customizable: is_customizable !== undefined ? is_customizable : true,
        allows_recoloring: allows_recoloring !== undefined ? allows_recoloring : true,
        featured: featured || false,
        active: active || false,
      })
      .select()
      .single();

    if (designError) {
      logger.error('Error creating design:', designError);
      return apiError('Failed to create design', 500);
    }

    // Create mockups if provided
    if (mockups && mockups.length > 0) {
      const mockupsToInsert = mockups.map((mockup: any) => ({
        design_id: design.id,
        sport_id: mockup.sport_id,
        product_type_slug: mockup.product_type_slug,
        mockup_url: mockup.mockup_url,
        view_angle: mockup.view_angle || 'front',
        is_primary: mockup.is_primary || false,
        sort_order: mockup.sort_order || 0,
      }));

      const { error: mockupsError } = await supabase
        .from('design_mockups')
        .insert(mockupsToInsert);

      if (mockupsError) {
        logger.error('Error creating mockups:', mockupsError);
        // Don't fail the whole request, just log the error
      }
    }

    return apiSuccess(design, 'Design created successfully', 201);

  } catch (error) {
    logger.error('Unexpected error creating design:', error);
    return apiError('An unexpected error occurred while creating design');
  }
}

// Explicitly disable other methods
export async function PUT() {
  return apiError('Method not allowed', 405);
}

export async function DELETE() {
  return apiError('Method not allowed', 405);
}
