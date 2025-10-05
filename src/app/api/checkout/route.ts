// POST /api/checkout - Create order from cart
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { checkoutSchema } from '@/types/orders';
import type { CheckoutRequest, CheckoutResponse } from '@/types/orders';
import type { ApiResponse } from '@/types/api';
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();

    // Require authentication
    const user = await requireAuth(supabase);

    // Parse and validate request body
    const body: CheckoutRequest = await request.json();
    const validation = checkoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', message: validation.error.issues[0].message } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const { cartId, notes } = validation.data;

    // Verify cart belongs to user and is active
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('id, user_id, status')
      .eq('id', cartId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (cartError || !cart) {
      return NextResponse.json(
        { error: 'Cart not found or not active' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // Check if cart has items
    const { data: cartItems, error: itemsError } = await supabase
      .from('cart_items')
      .select('id')
      .eq('cart_id', cartId)
      .limit(1);

    if (itemsError || !cartItems || cartItems.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Create order using RPC
    const { data: orderId, error: checkoutError } = await supabase
      .rpc('checkout_create_order', {
        p_cart_id: cartId,
        p_notes: notes || null
      });

    if (checkoutError) {
      console.error('Error during checkout:', checkoutError);

      // Handle specific error cases
      if (checkoutError.code === '22023') {
        return NextResponse.json(
          { error: checkoutError.message } as ApiResponse<null>,
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create order', message: checkoutError.message } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { orderId },
      message: 'Order created successfully'
    } as ApiResponse<CheckoutResponse>);

  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    console.error('Unexpected error in checkout:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}