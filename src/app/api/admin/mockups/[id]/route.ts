// DELETE /api/admin/mockups/[id] - Delete a specific mockup
// PATCH /api/admin/mockups/[id] - Update a specific mockup
import { requireAdmin } from '@/lib/auth/admin-guard';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const supabase = await createSupabaseServer();
    const body = await request.json();

    const {
      sport_id,
      product_type_slug,
      product_id,
      view_angle,
      is_primary,
      sort_order,
    } = body;

    // Verify mockup exists
    const { data: mockup } = await supabase
      .from('design_mockups')
      .select('id')
      .eq('id', id)
      .single();

    if (!mockup) {
      return apiError('Mockup not found', 404);
    }

    // Build update object
    const updateData: any = {};
    if (sport_id !== undefined) updateData.sport_id = sport_id;
    if (product_type_slug !== undefined) updateData.product_type_slug = product_type_slug;
    if (product_id !== undefined) updateData.product_id = product_id;
    if (view_angle !== undefined) updateData.view_angle = view_angle;
    if (is_primary !== undefined) updateData.is_primary = is_primary;
    if (sort_order !== undefined) updateData.sort_order = sort_order;

    // Update mockup
    const { data: updatedMockup, error } = await supabase
      .from('design_mockups')
      .update(updateData)
      .eq('id', id)
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
      logger.error('Error updating mockup:', toError(error));
      return apiError('Failed to update mockup', 500);
    }

    return apiSuccess(updatedMockup, 'Mockup updated successfully');

  } catch (error) {
    logger.error('Unexpected error updating mockup:', toError(error));
    return apiError('An unexpected error occurred while updating mockup');
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const supabase = await createSupabaseServer();

    // Verify mockup exists
    const { data: mockup } = await supabase
      .from('design_mockups')
      .select('id')
      .eq('id', id)
      .single();

    if (!mockup) {
      return apiError('Mockup not found', 404);
    }

    // Delete mockup
    const { error } = await supabase
      .from('design_mockups')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting mockup:', toError(error));
      return apiError('Failed to delete mockup', 500);
    }

    return apiSuccess(null, 'Mockup deleted successfully');

  } catch (error) {
    logger.error('Unexpected error deleting mockup:', toError(error));
    return apiError('An unexpected error occurred while deleting mockup');
  }
}

// Explicitly disable other methods
export async function GET() {
  return apiError('Method not allowed', 405);
}

export async function POST() {
  return apiError('Method not allowed', 405);
}

export async function PUT() {
  return apiError('Method not allowed', 405);
}
