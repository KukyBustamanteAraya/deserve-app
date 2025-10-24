// PATCH /api/cart/items/[id] - Update cart item quantity
// DELETE /api/cart/items/[id] - Remove cart item
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { updateCartItemSchema } from '@/types/orders';
import type { UpdateCartItemRequest, CartResponse } from '@/types/orders';
import type { ApiResponse } from '@/types/api';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServer();

    // Require authentication
    const user = await requireAuth(supabase);

    // Parse and validate request body
    const body: UpdateCartItemRequest = await request.json();
    const validation = updateCartItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', message: validation.error.issues[0].message } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const { quantity } = validation.data;
    const itemId = params.id;

    // If quantity is 0, delete the item
    if (quantity === 0) {
      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) {
        logger.error('Error deleting cart item:', toSupabaseError(deleteError));
        return NextResponse.json(
          { error: 'Failed to remove item from cart', message: deleteError.message } as ApiResponse<null>,
          { status: 500 }
        );
      }
    } else {
      // Update quantity
      const { error: updateError } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId);

      if (updateError) {
        logger.error('Error updating cart item:', toSupabaseError(updateError));
        return NextResponse.json(
          { error: 'Failed to update cart item', message: updateError.message } as ApiResponse<null>,
          { status: 500 }
        );
      }
    }

    // Get user's active cart
    const { data: cartId, error: cartError } = await supabase
      .rpc('get_or_create_active_cart');

    if (cartError) {
      logger.error('Error getting cart:', cartError);
      return NextResponse.json(
        { error: 'Failed to get cart', message: cartError.message } as ApiResponse<null>,
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
      logger.error('Error fetching updated cart:', toSupabaseError(fetchError));
      return NextResponse.json(
        { error: 'Failed to fetch updated cart', message: fetchError.message } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { cart },
      message: quantity === 0 ? 'Item removed from cart' : 'Cart item updated successfully'
    } as ApiResponse<CartResponse>);

  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    logger.error('Unexpected error in cart item update:', toError(error));
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServer();

    // Require authentication
    const user = await requireAuth(supabase);

    const itemId = params.id;

    // Delete the cart item
    const { error: deleteError } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);

    if (deleteError) {
      logger.error('Error deleting cart item:', toSupabaseError(deleteError));
      return NextResponse.json(
        { error: 'Failed to remove item from cart', message: deleteError.message } as ApiResponse<null>,
        { status: 500 }
      );
    }

    // Get user's active cart
    const { data: cartId, error: cartError } = await supabase
      .rpc('get_or_create_active_cart');

    if (cartError) {
      logger.error('Error getting cart:', cartError);
      return NextResponse.json(
        { error: 'Failed to get cart', message: cartError.message } as ApiResponse<null>,
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
      logger.error('Error fetching updated cart:', toSupabaseError(fetchError));
      return NextResponse.json(
        { error: 'Failed to fetch updated cart', message: fetchError.message } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { cart },
      message: 'Item removed from cart successfully'
    } as ApiResponse<CartResponse>);

  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    logger.error('Unexpected error in cart item deletion:', toError(error));
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}