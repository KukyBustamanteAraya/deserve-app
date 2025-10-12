// POST /api/admin/designs/[id]/mockups - Upload new mockup for design
// GET /api/admin/designs/[id]/mockups - Get all mockups for design
import { requireAdmin } from '@/lib/auth/admin-guard';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const { id } = params;
    const supabase = createSupabaseServer();

    const { data: mockups, error } = await supabase
      .from('design_mockups')
      .select(`
        *,
        sports:sport_id (
          id,
          slug,
          name
        )
      `)
      .eq('design_id', id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Error fetching mockups:', error);
      return apiError('Failed to fetch mockups', 500);
    }

    return apiSuccess(mockups || [], `Found ${mockups?.length || 0} mockups`);

  } catch (error) {
    logger.error('Unexpected error fetching mockups:', error);
    return apiError('An unexpected error occurred while fetching mockups');
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const { id: design_id } = params;
    const supabase = createSupabaseServer();
    const body = await request.json();

    const {
      sport_id,
      product_type_slug,
      product_id,      // NEW: Link to specific product
      mockup_url,
      view_angle,
      is_primary,
      sort_order,
    } = body;

    // Validation
    if (!sport_id || !mockup_url) {
      return apiError('sport_id and mockup_url are required', 400);
    }

    // Either product_id or product_type_slug must be provided
    if (!product_id && !product_type_slug) {
      return apiError('Either product_id or product_type_slug is required', 400);
    }

    // Verify design exists
    const { data: design } = await supabase
      .from('designs')
      .select('id')
      .eq('id', design_id)
      .single();

    if (!design) {
      return apiError('Design not found', 404);
    }

    // If setting as primary, unset other primaries for this sport+product combo
    if (is_primary) {
      let query = supabase
        .from('design_mockups')
        .update({ is_primary: false })
        .eq('design_id', design_id)
        .eq('sport_id', sport_id);

      // Match by product_id if provided, otherwise by product_type_slug
      if (product_id) {
        query = query.eq('product_id', product_id);
      } else {
        query = query.eq('product_type_slug', product_type_slug);
      }

      await query;
    }

    // Create mockup
    const insertData: any = {
      design_id,
      sport_id,
      product_type_slug,
      mockup_url,
      view_angle: view_angle || 'front',
      is_primary: is_primary || false,
      sort_order: sort_order || 0,
    };

    // Add product_id if provided
    if (product_id) {
      insertData.product_id = product_id;
    }

    const { data: mockup, error } = await supabase
      .from('design_mockups')
      .insert(insertData)
      .select(`
        *,
        sports:sport_id (
          id,
          slug,
          name
        )
      `)
      .single();

    if (error) {
      logger.error('Error creating mockup:', error);
      return apiError('Failed to create mockup', 500);
    }

    return apiSuccess(mockup, 'Mockup created successfully', 201);

  } catch (error) {
    logger.error('Unexpected error creating mockup:', error);
    return apiError('An unexpected error occurred while creating mockup');
  }
}

// Explicitly disable other methods
export async function PATCH() {
  return apiError('Method not allowed', 405);
}

export async function PUT() {
  return apiError('Method not allowed', 405);
}

export async function DELETE() {
  return apiError('Method not allowed', 405);
}
