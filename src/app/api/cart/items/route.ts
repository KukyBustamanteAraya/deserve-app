// POST /api/cart/items - Add or update item in cart
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { addToCartSchema } from '@/types/orders';
import type { AddToCartRequest, CartResponse } from '@/types/orders';
import type { ApiResponse } from '@/types/api';
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();

    // Require authentication
    const user = await requireAuth(supabase);

    // Parse and validate request body
    const body: AddToCartRequest = await request.json();
    const validation = addToCartSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', message: validation.error.issues[0].message } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const { productId, quantity } = validation.data;

    // Verify product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, price_cents')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // Get or create active cart
    const { data: cartId, error: cartError } = await supabase
      .rpc('get_or_create_active_cart');

    if (cartError) {
      console.error('Error getting/creating cart:', cartError);
      return NextResponse.json(
        { error: 'Failed to get cart', message: cartError.message } as ApiResponse<null>,
        { status: 500 }
      );
    }

    // Upsert cart item
    const { error: upsertError } = await supabase
      .from('cart_items')
      .upsert({
        cart_id: cartId,
        product_id: productId,
        quantity: quantity
      }, {
        onConflict: 'cart_id,product_id'
      });

    if (upsertError) {
      console.error('Error adding item to cart:', upsertError);
      return NextResponse.json(
        { error: 'Failed to add item to cart', message: upsertError.message } as ApiResponse<null>,
        { status: 500 }
      );
    }

    // Get updated cart with items
    const { data: cart, error: fetchError } = await supabase
      .from('carts_with_items')
      .select('*')
      .eq('id', cartId)
      .single();

    if (fetchError) {
      console.error('Error fetching updated cart:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch updated cart', message: fetchError.message } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { cart },
      message: 'Item added to cart successfully'
    } as ApiResponse<CartResponse>);

  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    console.error('Unexpected error in add to cart:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}