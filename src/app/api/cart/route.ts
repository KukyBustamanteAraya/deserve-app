// GET /api/cart - Get or create active cart with items
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import type { CartResponse } from '@/types/orders';
import { logger } from '@/lib/logger';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-response';

export async function GET() {
  try {
    const supabase = createSupabaseServer();

    // Require authentication
    const user = await requireAuth(supabase);

    // Get or create active cart using RPC
    const { data: cartId, error: cartError } = await supabase
      .rpc('get_or_create_active_cart');

    if (cartError) {
      logger.error('Error getting/creating cart:', cartError);
      return apiError('Failed to get cart', 500);
    }

    // Get cart with items
    const { data: cart, error: fetchError } = await supabase
      .from('carts_with_items')
      .select('*')
      .eq('id', cartId)
      .single();

    if (fetchError) {
      logger.error('Error fetching cart details:', fetchError);
      return apiError('Failed to fetch cart details', 500);
    }

    return apiSuccess({ cart } as CartResponse, 'Cart retrieved successfully');

  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return apiUnauthorized();
    }

    logger.error('Unexpected error in cart retrieval:', error);
    return apiError('Internal server error');
  }
}