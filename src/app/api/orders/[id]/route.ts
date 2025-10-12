// GET /api/orders/[id] - Get order details with items
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import type { OrderDetailResponse } from '@/types/orders';
import type { ApiResponse } from '@/types/api';
import { logger } from '@/lib/logger';
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServer();

    // Require authentication
    const user = await requireAuth(supabase);

    const orderId = params.id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return NextResponse.json(
        { error: 'Invalid order ID format' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Get order with items using the view
    const { data: order, error: orderError } = await supabase
      .from('orders_with_items')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();

    if (orderError) {
      if (orderError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Order not found' } as ApiResponse<null>,
          { status: 404 }
        );
      }

      logger.error('Error fetching order details:', orderError);
      return NextResponse.json(
        { error: 'Failed to fetch order details', message: orderError.message } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { order },
      message: 'Order details retrieved successfully'
    } as ApiResponse<OrderDetailResponse>);

  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    logger.error('Unexpected error in order details:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}