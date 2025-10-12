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
    const { payment_mode, save_as_default, team_id } = body;

    if (!payment_mode || !team_id) {
      return NextResponse.json(
        { error: 'Missing required fields: payment_mode, team_id' },
        { status: 400 }
      );
    }

    const designRequestId = parseInt(params.id);

    logger.info('[Approve Design] Starting approval process:', {
      designRequestId,
      teamId: team_id,
      userId: user.id,
      paymentMode: payment_mode,
      saveAsDefault: save_as_default,
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

    // 5. Create order
    const { data: order, error: orderError } = await supabase
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
        // total_cents is a GENERATED column - do not insert
        total_amount_cents: totalAmount,
        current_stage: 'pending',
        notes: `Order from design request #${designRequestId}: ${product.name}`,
      })
      .select()
      .single();

    if (orderError || !order) {
      logger.error('[Approve Design] Error creating order:', orderError);
      return NextResponse.json(
        { error: 'Error creating order' },
        { status: 500 }
      );
    }

    logger.info('[Approve Design] Order created:', order.id);

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

    // 8. Optionally update team payment mode
    if (save_as_default) {
      const { error: settingsError } = await supabase
        .from('team_settings')
        .update({ payment_mode: payment_mode })
        .eq('team_id', team_id);

      if (settingsError) {
        logger.warn('[Approve Design] Error updating team settings:', settingsError);
        // Don't fail - this is optional
      } else {
        logger.info('[Approve Design] Updated team payment mode to:', payment_mode);
      }
    }

    // 9. TODO: Send notifications to team members
    // This will be implemented later

    logger.info('[Approve Design] Success! Design approved and order created:', {
      designRequestId,
      orderId: order.id,
      orderItemsCount: orderItems.length,
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
