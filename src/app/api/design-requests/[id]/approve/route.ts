import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServer();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { order_id, team_id } = body;

    if (!team_id) {
      return NextResponse.json(
        { error: 'Missing required field: team_id' },
        { status: 400 }
      );
    }

    // Default payment mode is 'individual' for new orders
    const payment_mode = 'individual';

    const designRequestId = parseInt(params.id);

    logger.info('[Approve Design] Starting approval process:', {
      designRequestId,
      teamId: team_id,
      userId: user.id,
      orderId: order_id,
      paymentMode: payment_mode,
      action: order_id ? 'add_to_existing_order' : 'create_new_order',
    });

    // 1. Get design request
    const { data: designRequest, error: designError } = await supabase
      .from('design_requests')
      .select('*')
      .eq('id', designRequestId)
      .eq('team_id', team_id)
      .single();

    if (designError || !designRequest) {
      logger.error('[Approve Design] Design request not found:', designError);
      return NextResponse.json(
        { error: 'Design request not found' },
        { status: 404 }
      );
    }

    // 1b. Get product separately
    // Product ID is stored in selected_apparel JSON
    const productId = designRequest.selected_apparel?.product_id;

    if (!productId) {
      logger.error('[Approve Design] No product_id in selected_apparel:', designRequest.selected_apparel);
      return NextResponse.json(
        { error: 'Design request has no product selected' },
        { status: 400 }
      );
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, price_cents, name')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      logger.error('[Approve Design] Product not found:', productError);
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // 2. Verify user is manager
    const { data: membership } = await supabase
      .from('team_memberships')
      .select('role')
      .eq('team_id', team_id)
      .eq('user_id', user.id)
      .single();

    const isManager = membership?.role === 'owner' || membership?.role === 'manager';

    if (!isManager) {
      logger.error('[Approve Design] User is not manager:', {
        userId: user.id,
        teamId: team_id,
        role: membership?.role,
      });
      return NextResponse.json(
        { error: 'Only managers can approve designs' },
        { status: 403 }
      );
    }

    // 3. Get all team members
    const { data: teamMembers, error: membersError } = await supabase
      .from('team_memberships')
      .select('user_id')
      .eq('team_id', team_id);

    if (membersError || !teamMembers) {
      logger.error('[Approve Design] Error fetching team members:', membersError);
      return NextResponse.json(
        { error: 'Error fetching team members' },
        { status: 500 }
      );
    }

    logger.info('[Approve Design] Found team members:', teamMembers.length);

    // 4. Calculate order total
    const productPrice = product.price_cents || 0;
    const totalAmount = productPrice * teamMembers.length;

    logger.info('[Approve Design] Order details:', {
      productPrice,
      memberCount: teamMembers.length,
      totalAmount,
    });

    // 5. Get or create order
    let order;

    if (order_id) {
      // Adding to existing order
      logger.info('[Approve Design] Adding to existing order:', order_id);

      const { data: existingOrder, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', order_id)
        .eq('team_id', team_id)
        .single();

      if (orderError || !existingOrder) {
        logger.error('[Approve Design] Existing order not found:', orderError);
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      // Check if order can be modified (not shipped or cancelled)
      if (!['pending', 'paid', 'processing'].includes(existingOrder.status)) {
        logger.error('[Approve Design] Order cannot be modified:', existingOrder.status);
        return NextResponse.json(
          { error: 'Order cannot be modified (already shipped or cancelled)' },
          { status: 400 }
        );
      }

      order = existingOrder;
      logger.info('[Approve Design] Using existing order:', order.id);
    } else {
      // Creating new order
      logger.info('[Approve Design] Creating new order');

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          team_id: team_id,
          user_id: user.id,
          status: 'pending',
          payment_status: 'unpaid',
          payment_mode: payment_mode,
          currency: 'CLP',
          subtotal_cents: totalAmount,
          discount_cents: 0,
          tax_cents: 0,
          shipping_cents: 0,
          total_amount_cents: totalAmount,
          current_stage: 'pending',
          notes: `Order from design request #${designRequestId}: ${product.name}`,
        })
        .select()
        .single();

      if (orderError || !newOrder) {
        logger.error('[Approve Design] Error creating order:', orderError);
        return NextResponse.json(
          { error: 'Error creating order' },
          { status: 500 }
        );
      }

      order = newOrder;
      logger.info('[Approve Design] Order created:', order.id);
    }

    // 6. Create order_items for ALL team members
    const designId = designRequest.selected_apparel?.design_id || designRequest.design_id || null;

    const orderItems = teamMembers.map((member) => ({
      order_id: order.id,
      product_id: productId,
      product_name: product.name,
      collection: null,
      images: designRequest.mockup_urls || [],
      quantity: 1,
      unit_price_cents: productPrice,
      // line_total_cents is GENERATED ALWAYS as (unit_price_cents * quantity) - do not insert
      player_id: member.user_id, // Use user_id as player_id for now
      player_name: null,
      jersey_number: null,
      customization: {
        size: null,
        position: null,
        additional_notes: null,
      },
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      logger.error('[Approve Design] Error creating order items:', itemsError);
      // Rollback: delete order
      await supabase.from('orders').delete().eq('id', order.id);
      return NextResponse.json(
        { error: 'Error creating order items' },
        { status: 500 }
      );
    }

    logger.info('[Approve Design] Order items created:', orderItems.length);

    // 6b. If adding to existing order, update the order total
    if (order_id) {
      const newTotal = (order.total_amount_cents || 0) + totalAmount;

      const { error: updateOrderError } = await supabase
        .from('orders')
        .update({
          total_amount_cents: newTotal,
          subtotal_cents: newTotal,
          notes: `${order.notes || ''}\nAdded design request #${designRequestId}: ${product.name}`,
        })
        .eq('id', order.id);

      if (updateOrderError) {
        logger.error('[Approve Design] Error updating order total:', updateOrderError);
        // Don't fail - items are created, just log error
      } else {
        logger.info('[Approve Design] Updated order total:', { oldTotal: order.total_amount_cents, newTotal });
      }
    }

    // 7. Update design request status and link to order
    const { error: updateError } = await supabase
      .from('design_requests')
      .update({
        status: 'approved',
        approval_status: 'approved',
        order_id: order.id,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .eq('id', designRequestId);

    if (updateError) {
      logger.error('[Approve Design] Error updating design request:', updateError);
      // Don't rollback - order is created, just log error
    }

    // 8. TODO: Send notifications to team members
    // This will be implemented later

    logger.info(`[Approve Design] Success! Design approved and ${order_id ? 'added to existing order' : 'new order created'}:`, {
      designRequestId,
      orderId: order.id,
      orderItemsCount: orderItems.length,
      action: order_id ? 'added_to_existing' : 'created_new',
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        total_amount_cents: order.total_amount_cents,
        payment_mode: order.payment_mode,
        status: order.status,
      },
      design_request: {
        id: designRequestId,
        status: 'approved',
        order_id: order.id,
      },
    });
  } catch (error: any) {
    logger.error('[Approve Design] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
