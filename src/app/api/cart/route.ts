// GET /api/cart - Get or create active cart with items
import { NextResponse } from 'next/server';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import type { CartResponse } from '@/types/orders';
import type { ApiResponse } from '@/types/api';
export async function GET() {
  try {
    const supabase = createSupabaseServer();

    // Require authentication
    const user = await requireAuth(supabase);

    // Get or create active cart using RPC
    const { data: cartId, error: cartError } = await supabase
      .rpc('get_or_create_active_cart');

    if (cartError) {
      console.error('Error getting/creating cart:', cartError);
      return NextResponse.json(
        { error: 'Failed to get cart', message: cartError.message } as ApiResponse<null>,
        { status: 500 }
      );
    }

    // Get cart with items
    const { data: cart, error: fetchError } = await supabase
      .from('carts_with_items')
      .select('*')
      .eq('id', cartId)
      .single();

    if (fetchError) {
      console.error('Error fetching cart details:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch cart details', message: fetchError.message } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { cart },
      message: 'Cart retrieved successfully'
    } as ApiResponse<CartResponse>);

  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    console.error('Unexpected error in cart retrieval:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}