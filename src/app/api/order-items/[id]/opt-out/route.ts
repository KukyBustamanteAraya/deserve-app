// POST /api/order-items/[id]/opt-out
// Allows a player to opt-out of an order item
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServer();
    const user = await requireAuth(supabase);
    const orderItemId = params.id;

    logger.info(`[Opt-Out] User ${user.id} requesting opt-out for order item ${orderItemId}`);

    // 1. Get the order item
    const { data: orderItem, error: itemError } = await supabase
      .from('order_items')
      .select('id, order_id, player_id, unit_price_clp, quantity, opted_out')
      .eq('id', orderItemId)
      .single();

    if (itemError || !orderItem) {
      logger.error('[Opt-Out] Order item not found:', itemError);
      return NextResponse.json(
        { error: 'Order item not found' },
        { status: 404 }
      );
    }

    // Check if already opted out
    if (orderItem.opted_out) {
      return NextResponse.json(
        { error: 'Already opted out of this order' },
        { status: 400 }
      );
    }

    // 2. Get the order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, team_id, total_amount_clp, payment_status, status')
      .eq('id', orderItem.order_id)
      .single();

    if (orderError || !order) {
      logger.error('[Opt-Out] Order not found:', orderError);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // 3. Verify user is authorized (must be the player OR a team manager)
    const isPlayer = orderItem.player_id === user.id;

    const { data: membership } = await supabase
      .from('team_memberships')
      .select('role')
      .eq('team_id', order.team_id)
      .eq('user_id', user.id)
      .single();

    const isManager = membership?.role === 'owner' || membership?.role === 'manager';

    if (!isPlayer && !isManager) {
      logger.error('[Opt-Out] User not authorized:', { userId: user.id, playerId: orderItem.player_id });
      return NextResponse.json(
        { error: 'You are not authorized to opt out of this order item' },
        { status: 403 }
      );
    }

    // 4. Check if order is in a state that allows opt-out
    if (order.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'Cannot opt out of a paid order' },
        { status: 400 }
      );
    }

    if (order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered') {
      return NextResponse.json(
        { error: 'Cannot opt out - order is already being processed' },
        { status: 400 }
      );
    }

    // 5. Mark order item as opted out
    const { error: updateError } = await supabase
      .from('order_items')
      .update({
        opted_out: true,
        opted_out_at: new Date().toISOString()
      })
      .eq('id', orderItemId);

    if (updateError) {
      logger.error('[Opt-Out] Error updating order item:', toSupabaseError(updateError));
      return NextResponse.json(
        { error: 'Failed to opt out' },
        { status: 500 }
      );
    }

    // 6. Recalculate order total
    // Get all non-opted-out items for this order
    const { data: activeItems, error: itemsError } = await supabase
      .from('order_items')
      .select('unit_price_clp, quantity')
      .eq('order_id', orderItem.order_id)
      .eq('opted_out', false);

    if (itemsError) {
      logger.error('[Opt-Out] Error fetching active items:', itemsError);
      // Don't fail - item is already marked as opted out
    }

    // Calculate new total
    const newTotalClp = (activeItems || []).reduce((sum, item) => {
      return sum + (item.unit_price_clp * item.quantity);
    }, 0);

    // Update order total
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        total_amount_clp: newTotalClp,
        subtotal_clp: newTotalClp,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderItem.order_id);

    if (orderUpdateError) {
      logger.error('[Opt-Out] Error updating order total:', orderUpdateError);
      // Don't fail - item is opted out, just log the issue
    }

    // 7. Check if we need to update payment_status
    // Get total paid from contributions
    const { data: contributions } = await supabase
      .from('payment_contributions')
      .select('amount_clp, payment_status')
      .eq('order_id', orderItem.order_id);

    const totalPaid = (contributions || [])
      .filter(c => c.payment_status === 'approved')
      .reduce((sum, c) => sum + c.amount_clp, 0);

    let newPaymentStatus: string;
    if (totalPaid >= newTotalClp && newTotalClp > 0) {
      newPaymentStatus = 'paid';
    } else if (totalPaid > 0) {
      newPaymentStatus = 'partial';
    } else {
      newPaymentStatus = 'unpaid';
    }

    if (newPaymentStatus !== order.payment_status) {
      await supabase
        .from('orders')
        .update({ payment_status: newPaymentStatus })
        .eq('id', orderItem.order_id);
    }

    logger.info(`[Opt-Out] Success! Order item ${orderItemId} opted out. New total: ${newTotalClp}`);

    return NextResponse.json({
      success: true,
      message: 'Successfully opted out',
      newTotalClp,
      itemCount: activeItems?.length || 0
    });

  } catch (error: any) {
    logger.error('[Opt-Out] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
