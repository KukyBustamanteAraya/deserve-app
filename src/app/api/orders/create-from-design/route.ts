// POST /api/orders/create-from-design
// Creates an order from an approved design request
import { NextRequest } from 'next/server';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import { apiSuccess, apiError, apiUnauthorized, apiValidationError } from '@/lib/api-response';
import {
  createOrderFromDesignSchema,
  type CreateOrderFromDesignResponse
} from '@/types/payments';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();

    // Require authentication
    const user = await requireAuth(supabase);

    // Parse and validate request body
    const body = await request.json();
    const validation = createOrderFromDesignSchema.safeParse(body);

    if (!validation.success) {
      return apiValidationError(validation.error.issues[0].message);
    }

    const { designRequestId, teamId } = validation.data;

    // ========================================================================
    // STEP 1: Verify design request and team membership
    // ========================================================================

    const { data: designRequest, error: designError } = await supabase
      .from('design_requests')
      .select('id, team_id, status, selected_candidate_id, sub_team_id, order_id')
      .eq('id', designRequestId)
      .single();

    if (designError || !designRequest) {
      logger.error('Design request not found:', designError);
      return apiError('Design request not found', 404);
    }

    if (designRequest.team_id !== teamId) {
      return apiError('Design request does not belong to this team', 403);
    }

    // Fetch sub_team data for gender hierarchy fields (if this is an institution order)
    let subTeamData: { gender_category: string | null; division_group: string | null } | null = null;
    if (designRequest.sub_team_id) {
      const { data: subTeam } = await supabase
        .from('institution_sub_teams')
        .select('gender_category, division_group')
        .eq('id', designRequest.sub_team_id)
        .single();

      if (subTeam) {
        subTeamData = {
          gender_category: subTeam.gender_category || null,
          division_group: subTeam.division_group || null,
        };
        logger.info(`[Order Creation] Sub-team data fetched - gender: ${subTeamData.gender_category}, division_group: ${subTeamData.division_group}`);
      }
    }

    // Verify user is a team member or owner
    const { data: membership } = await supabase
      .from('team_memberships')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return apiError('You are not a member of this team', 403);
    }

    // Check if order already exists
    if (designRequest.order_id) {
      logger.info(`Order already exists for design request ${designRequestId}`);
      return apiSuccess({
        orderId: designRequest.order_id,
        orderItemsCount: 0
      } as CreateOrderFromDesignResponse, 'Order already exists');
    }

    // ========================================================================
    // STEP 2: Get product details from selected design candidate
    // ========================================================================

    if (!designRequest.selected_candidate_id) {
      return apiError('No design candidate selected', 400);
    }

    const { data: designCandidate, error: candidateError } = await supabase
      .from('design_candidates')
      .select('product_id, mockup_urls')
      .eq('id', designRequest.selected_candidate_id)
      .single();

    if (candidateError || !designCandidate) {
      logger.error('Design candidate not found:', candidateError);
      return apiError('Design candidate not found', 404);
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, collection, base_price_clp, images')
      .eq('id', designCandidate.product_id)
      .single();

    if (productError || !product) {
      logger.error('Product not found:', productError);
      return apiError('Product not found', 404);
    }

    // ========================================================================
    // STEP 3: Get player info submissions
    // ========================================================================

    const { data: playerSubmissions, error: playersError } = await supabase
      .from('player_info_submissions')
      .select('*')
      .eq('team_id', teamId)
      .eq('design_request_id', designRequestId);

    if (playersError) {
      logger.error('Error fetching player submissions:', playersError);
      return apiError('Failed to fetch player info', 500);
    }

    if (!playerSubmissions || playerSubmissions.length === 0) {
      return apiError('No player info submissions found. Please collect player information first.', 400);
    }

    // Count confirmed vs unconfirmed players (soft enforcement)
    const unconfirmedPlayers = playerSubmissions.filter(p => !p.confirmed_by_player);
    const confirmedPlayers = playerSubmissions.filter(p => p.confirmed_by_player);

    if (unconfirmedPlayers.length > 0) {
      logger.warn(`Order being created with ${unconfirmedPlayers.length} unconfirmed players out of ${playerSubmissions.length} total`);
      logger.warn('Unconfirmed players:', { players: unconfirmedPlayers.map(p => p.player_name).join(', ') });
    }

    // ========================================================================
    // STEP 4: Calculate order totals
    // ========================================================================

    const quantity = playerSubmissions.length;
    const unitPriceClp = product.base_price_clp;
    const subtotalClp = unitPriceClp * quantity;
    const totalClp = subtotalClp; // No tax/shipping for now

    // ========================================================================
    // STEP 5: Create order
    // ========================================================================

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        team_id: teamId,
        status: 'pending',
        payment_status: 'unpaid',
        currency: 'CLP',
        subtotal_clp: subtotalClp,
        discount_clp: 0,
        tax_clp: 0,
        shipping_clp: 0,
        // total_clp is GENERATED ALWAYS - database calculates it
        total_amount_clp: totalClp,
        current_stage: 'pending',
        has_unconfirmed_players: unconfirmedPlayers.length > 0,
        unconfirmed_player_count: unconfirmedPlayers.length,
        // Gender hierarchy fields (for institution orders with gender-divided teams)
        division_group: subTeamData?.division_group || null,
        team_gender_category: subTeamData?.gender_category || null,
      })
      .select('id')
      .single();

    if (orderError || !order) {
      logger.error('Error creating order:', orderError);
      return apiError('Failed to create order', 500);
    }

    // ========================================================================
    // STEP 6: Create order items (one per player)
    // ========================================================================

    const orderItems = playerSubmissions.map((player) => ({
      order_id: order.id,
      product_id: product.id,
      product_name: product.name,
      collection: product.collection || null,
      images: designCandidate.mockup_urls || product.images || [],
      unit_price_clp: unitPriceClp,
      quantity: 1,
      // line_total_clp is GENERATED ALWAYS as (unit_price_clp * quantity)
      player_id: player.id,
      player_name: player.player_name,
      jersey_number: player.jersey_number,
      customization: {
        size: player.size,
        position: player.position,
        additional_notes: player.additional_notes,
      },
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      logger.error('Error creating order items:', itemsError);
      // Rollback: delete the order
      await supabase.from('orders').delete().eq('id', order.id);
      return apiError('Failed to create order items', 500);
    }

    // ========================================================================
    // STEP 7: Link order back to design request
    // ========================================================================

    const { error: linkError } = await supabase
      .from('design_requests')
      .update({ order_id: order.id })
      .eq('id', designRequestId);

    if (linkError) {
      logger.error('Error linking order to design request:', toError(linkError));
      // Don't fail the request, but log it
    }

    logger.info(`Order ${order.id} created for design request ${designRequestId} with ${orderItems.length} items`);

    return apiSuccess({
      orderId: order.id,
      orderItemsCount: orderItems.length
    } as CreateOrderFromDesignResponse, 'Order created successfully');

  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return apiUnauthorized();
    }

    logger.error('Unexpected error in create order from design:', toError(error));
    return apiError('Internal server error');
  }
}
