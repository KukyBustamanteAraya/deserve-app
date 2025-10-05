// GET /api/orders - List user orders with pagination
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { ordersQuerySchema } from '@/types/orders';
import type { OrdersListResponse } from '@/types/orders';
import type { ApiResponse } from '@/types/api';
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
      return NextResponse.json(
        { error: 'Invalid query parameters', message: queryValidation.error.issues[0].message } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const { page, limit } = queryValidation.data;
    const offset = (page - 1) * limit;

    // Get total count
    const { count, error: countError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      console.error('Error counting orders:', countError);
      return NextResponse.json(
        { error: 'Failed to count orders', message: countError.message } as ApiResponse<null>,
        { status: 500 }
      );
    }

    // Get orders with pagination
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, currency, subtotal_cents, total_cents, notes, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json(
        { error: 'Failed to fetch orders', message: ordersError.message } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        orders: orders || [],
        total: count || 0,
        page,
        limit
      } as OrdersListResponse,
      message: 'Orders retrieved successfully'
    } as ApiResponse<OrdersListResponse>);

  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    console.error('Unexpected error in orders list:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}