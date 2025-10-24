import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServer();

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
      logger.error('[Approve Design] Design request not found', toSupabaseError(designError));
      return NextResponse.json(
        { error: 'Design request not found' },
        { status: 404 }
      );
    }

    // Check if already approved
    if (designRequest.approval_status === 'approved' && designRequest.order_id) {
      logger.warn('[Approve Design] Design request already approved:', {
        designRequestId,
        orderId: designRequest.order_id,
      });
      return NextResponse.json(
        {
          error: 'Design request already approved',
          order: { id: designRequest.order_id }
        },
        { status: 400 }
      );
    }

    // Log full design request for debugging
    logger.info('[Approve Design] Design request data:', {
      id: designRequest.id,
      design_id: designRequest.design_id,
      product_slug: designRequest.product_slug,
      product_name: designRequest.product_name,
      selected_apparel: designRequest.selected_apparel,
      sport_slug: designRequest.sport_slug,
    });

    // 1b. Get product - try multiple sources
    // Priority: selected_apparel.product_id > product_slug > design_products lookup
    let productId = designRequest.selected_apparel?.product_id;
    let product;

    // Try 1: Product ID from selected_apparel
    if (productId) {
      logger.info('[Approve Design] Trying lookup by product_id from selected_apparel:', productId);
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, price_clp, name')
        .eq('id', productId)
        .single();

      if (productError) {
        logger.warn('[Approve Design] Product lookup by ID failed:', productError);
      } else if (productData) {
        product = productData;
        logger.info('[Approve Design] Product found by ID:', product);
      }
    } else {
      logger.info('[Approve Design] No product_id in selected_apparel, skipping Try 1');
    }

    // Try 2: Look up by product_slug
    if (!product && designRequest.product_slug) {
      logger.info('[Approve Design] Trying lookup by product_slug:', designRequest.product_slug);
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, price_clp, name, slug')
        .eq('slug', designRequest.product_slug)
        .single();

      if (productError) {
        logger.warn('[Approve Design] Product lookup by slug failed:', productError);
      } else if (productData) {
        product = productData;
        productId = productData.id;
        logger.info('[Approve Design] Product found by slug:', product);
      }
    } else if (!product) {
      logger.info('[Approve Design] No product_slug in design request, skipping Try 2');
    }

    // Try 3: Get product from design_products table using design_id
    if (!product && designRequest.design_id) {
      logger.info('[Approve Design] Trying lookup via design_products for design_id:', designRequest.design_id);

      const { data: designProducts, error: dpError } = await supabase
        .from('design_products')
        .select('product_id, is_recommended, products!inner(id, price_clp, name)')
        .eq('design_id', designRequest.design_id)
        .order('is_recommended', { ascending: false }); // Get recommended products first

      if (dpError) {
        logger.warn('[Approve Design] design_products lookup failed:', dpError);
      } else if (!designProducts || designProducts.length === 0) {
        logger.warn('[Approve Design] No products found in design_products table for this design_id');
      } else {
        // Use the first product (which will be recommended if one exists)
        const designProduct = designProducts[0];
        const productData = (designProduct.products as any);
        product = {
          id: productData.id,
          price_clp: productData.price_clp,
          name: productData.name,
        };
        productId = productData.id;
        logger.info('[Approve Design] Product found via design_products:', { productId, productName: product.name, productsCount: designProducts.length });
      }
    } else if (!product) {
      logger.info('[Approve Design] No design_id in design request, skipping Try 3');
    }

    // Try 4: Fallback - Get ANY product for the sport (when design_products table is empty)
    if (!product && designRequest.sport_slug) {
      logger.info('[Approve Design] Trying fallback lookup by sport_slug:', designRequest.sport_slug);

      // First get the sport_id from sport_slug
      const { data: sport, error: sportError } = await supabase
        .from('sports')
        .select('id')
        .eq('slug', designRequest.sport_slug)
        .single();

      if (sportError) {
        logger.warn('[Approve Design] Sport lookup failed:', sportError);
      } else if (sport) {
        // Get products for this sport
        // Note: sport_ids might be stored as strings in the array, so we try both integer and string
        const sportIdStr = String(sport.id);

        const { data: sportProducts, error: productsError } = await supabase
          .from('products')
          .select('id, price_clp, name, sport_ids')
          .contains('sport_ids', [sportIdStr]) // Try as string first
          .limit(1);

        if (productsError) {
          logger.warn('[Approve Design] Products by sport lookup failed:', productsError);
        } else if (sportProducts && sportProducts.length > 0) {
          product = sportProducts[0];
          productId = sportProducts[0].id;
          logger.info('[Approve Design] Product found by sport fallback:', { productId, productName: product.name, sportId: sport.id });
        } else {
          logger.warn('[Approve Design] No products found for sport_id:', { sportId: sport.id, sportIdStr });
        }
      }
    } else if (!product) {
      logger.info('[Approve Design] No sport_slug in design request, skipping Try 4');
    }

    // Try 5: Ultimate fallback - Get ANY available product
    if (!product) {
      logger.info('[Approve Design] Trying ultimate fallback - getting any available product');

      const { data: anyProducts, error: anyProductError } = await supabase
        .from('products')
        .select('id, price_clp, name')
        .limit(1);

      if (anyProductError) {
        logger.warn('[Approve Design] Ultimate fallback failed:', anyProductError);
      } else if (anyProducts && anyProducts.length > 0) {
        product = anyProducts[0];
        productId = anyProducts[0].id;
        logger.info('[Approve Design] Product found by ultimate fallback:', { productId, productName: product.name });
      }
    }

    if (!product) {
      logger.error('[Approve Design] No product found after all lookup attempts (including ultimate fallback):', {
        selected_apparel: designRequest.selected_apparel,
        product_slug: designRequest.product_slug,
        design_id: designRequest.design_id,
        sport_slug: designRequest.sport_slug,
      });
      return NextResponse.json(
        { error: 'No products available in the system. Please add products before approving designs.' },
        { status: 400 }
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

    logger.info('[Approve Design] Found team members:', { count: teamMembers.length });

    if (teamMembers.length === 0) {
      logger.error('[Approve Design] Team has no members');
      return NextResponse.json(
        { error: 'Cannot create order for team with no members' },
        { status: 400 }
      );
    }

    // 4. Calculate order total
    const productPrice = product.price_clp || 0;
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
        logger.error('[Approve Design] Existing order not found', toSupabaseError(orderError));
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

      // Use a database function to bypass any Supabase client transformations
      const { data: orderId, error: orderError } = await supabase
        .rpc('create_order_for_approval', {
          p_user_id: user.id,
          p_team_id: team_id,
          p_subtotal_clp: totalAmount,
          p_total_amount_clp: totalAmount,
        });

      if (orderError) {
        logger.error('[Approve Design] Error calling create_order_for_approval:', orderError);
      }

      const newOrder = orderId ? { id: orderId } : null;

      if (orderError || !newOrder) {
        logger.error('[Approve Design] Error creating order:', {
          error: orderError,
          message: orderError?.message,
          details: orderError?.details,
          hint: orderError?.hint,
          code: orderError?.code,
        });
        return NextResponse.json(
          {
            error: 'Error creating order',
            details: orderError?.message || 'Unknown error',
            code: orderError?.code,
            hint: orderError?.hint
          },
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
      unit_price_clp: productPrice,
      // line_total_clp is GENERATED ALWAYS as (unit_price_clp * quantity) - do not insert
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

    logger.info('[Approve Design] Order items created:', { count: orderItems.length });

    // 6b. If adding to existing order, update the order total
    if (order_id) {
      const newTotal = (order.total_amount_clp || 0) + totalAmount;

      const { error: updateOrderError } = await supabase
        .from('orders')
        .update({
          total_amount_clp: newTotal,
          subtotal_clp: newTotal,
          notes: `${order.notes || ''}\nAdded design request #${designRequestId}: ${product.name}`,
        })
        .eq('id', order.id);

      if (updateOrderError) {
        logger.error('[Approve Design] Error updating order total:', updateOrderError);
        // Don't fail - items are created, just log error
      } else {
        logger.info('[Approve Design] Updated order total:', { oldTotal: order.total_amount_clp, newTotal });
      }
    }

    // 7. Update design request status and link to order
    const { error: updateError } = await supabase
      .from('design_requests')
      .update({
        status: 'ready', // Valid statuses: pending, rendering, ready, cancelled
        approval_status: 'approved',
        order_id: order.id,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .eq('id', designRequestId);

    if (updateError) {
      logger.error('[Approve Design] Error updating design request:', toSupabaseError(updateError));
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
        // Only id is selected, other fields not available
      },
      design_request: {
        id: designRequestId,
        status: 'ready',
        approval_status: 'approved',
        order_id: order.id,
      },
    });
  } catch (error: any) {
    logger.error('[Approve Design] Unexpected error:', toError(error));
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
