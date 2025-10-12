// GET /api/orders - List user orders with pagination
import { NextRequest } from 'next/server';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { ordersQuerySchema } from '@/types/orders';
import type { OrdersListResponse } from '@/types/orders';
import { logger } from '@/lib/logger';
import { apiSuccess, apiError, apiUnauthorized, apiValidationError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();

    // Require authentication
    const user = await requireAuth(supabase);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = ordersQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit')
    });

    if (!queryValidation.success) {
      return apiValidationError(queryValidation.error.issues[0].message);
    }

    const { page, limit } = queryValidation.data;
    const offset = (page - 1) * limit;

    // Get total count
    const { count, error: countError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      logger.error('Error counting orders:', countError);
      return apiError('Failed to count orders', 500);
    }

    // Get orders with pagination
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, currency, subtotal_cents, total_cents, notes, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (ordersError) {
      logger.error('Error fetching orders:', ordersError);
      return apiError('Failed to fetch orders', 500);
    }

    return apiSuccess({
      orders: orders || [],
      total: count || 0,
      page,
      limit
    } as OrdersListResponse, 'Orders retrieved successfully');

  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return apiUnauthorized();
    }

    logger.error('Unexpected error in orders list:', error);
    return apiError('Internal server error');
  }
}