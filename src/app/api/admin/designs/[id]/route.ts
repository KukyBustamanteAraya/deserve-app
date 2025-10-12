// GET /api/admin/designs/[id] - Get design details
// PATCH /api/admin/designs/[id] - Update design
// DELETE /api/admin/designs/[id] - Delete design
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

    const { data: design, error } = await supabase
      .from('designs')
      .select(`
        *,
        design_mockups (
          id,
          sport_id,
          product_type_slug,
          mockup_url,
          view_angle,
          is_primary,
          sort_order,
          sports:sport_id (
            id,
            slug,
            name
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error || !design) {
      logger.error('Design not found:', { id, error });
      return apiError('Design not found', 404);
    }

    return apiSuccess(design, 'Design retrieved successfully');

  } catch (error) {
    logger.error('Unexpected error fetching design:', error);
    return apiError('An unexpected error occurred while fetching design');
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const { id } = params;
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
    } = body;

    // If slug is being changed, check uniqueness
    if (slug) {
      const { data: existing } = await supabase
        .from('designs')
        .select('id')
        .eq('slug', slug)
        .neq('id', id)
        .single();

      if (existing) {
        return apiError('Slug already exists', 400);
      }
    }

    // Update design
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (designer_name !== undefined) updateData.designer_name = designer_name;
    if (style_tags !== undefined) updateData.style_tags = style_tags;
    if (color_scheme !== undefined) updateData.color_scheme = color_scheme;
    if (is_customizable !== undefined) updateData.is_customizable = is_customizable;
    if (allows_recoloring !== undefined) updateData.allows_recoloring = allows_recoloring;
    if (featured !== undefined) updateData.featured = featured;
    if (active !== undefined) updateData.active = active;

    const { data: design, error } = await supabase
      .from('designs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating design:', error);
      return apiError('Failed to update design', 500);
    }

    return apiSuccess(design, 'Design updated successfully');

  } catch (error) {
    logger.error('Unexpected error updating design:', error);
    return apiError('An unexpected error occurred while updating design');
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const { id } = params;
    const supabase = createSupabaseServer();

    // Delete design (cascade will handle mockups)
    const { error } = await supabase
      .from('designs')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting design:', error);
      return apiError('Failed to delete design', 500);
    }

    return apiSuccess(null, 'Design deleted successfully');

  } catch (error) {
    logger.error('Unexpected error deleting design:', error);
    return apiError('An unexpected error occurred while deleting design');
  }
}

// Explicitly disable other methods
export async function POST() {
  return apiError('Method not allowed', 405);
}

export async function PUT() {
  return apiError('Method not allowed', 405);
}
