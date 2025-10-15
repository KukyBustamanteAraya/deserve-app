import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { logger } from '@/lib/logger';
import type { ClientDetail, OrderWithDetails, OrderItemWithBreakdown } from '@/types/clients';
import { getProgressStage, calculateTotalUnits } from '@/types/clients';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const supabase = createSupabaseServer();
    const clientId = params.id;

    // Fetch team with memberships
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select(`
        *,
        team_memberships (
          user_id,
          role
        ),
        sports (
          name
        )
      `)
      .eq('id', clientId)
      .single();

    if (teamError || !team) {
      logger.error('Error fetching team:', teamError);
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Fetch member profiles
    const memberUserIds = team.team_memberships?.map((m: any) => m.user_id) || [];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', memberUserIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Build members array
    const members = team.team_memberships?.map((m: any) => ({
      user_id: m.user_id,
      role: m.role,
      email: profileMap.get(m.user_id)?.email,
    })) || [];

    // Get manager
    const managerMembership = team.team_memberships?.find((m: any) => m.role === 'owner' || m.role === 'manager');
    const managerProfile = managerMembership ? profileMap.get(managerMembership.user_id) : null;

    // Fetch orders with all related data
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          order_id,
          product_id,
          product_name,
          unit_price_cents,
          quantity,
          customization,
          line_total_cents,
          opted_out
        )
      `)
      .eq('team_id', clientId)
      .order('created_at', { ascending: false });

    if (ordersError) {
      logger.error('Error fetching orders:', ordersError);
    }

    // Fetch ALL design requests for this team (both linked and unlinked to orders)
    const { data: allDesignRequests } = await supabase
      .from('design_requests')
      .select('id, order_id, status, mockup_urls, created_at, product_name, primary_color, secondary_color, accent_color')
      .eq('team_id', clientId)
      .order('created_at', { ascending: false });

    // Map design requests linked to orders
    const orderIds = orders?.map(o => o.id) || [];
    const designRequestMap = new Map(
      allDesignRequests?.filter(dr => dr.order_id).map(dr => [dr.order_id, dr]) || []
    );

    // Get design requests NOT linked to any order yet
    const unlinkedDesignRequests = allDesignRequests?.filter(dr => !dr.order_id) || [];

    // Fetch payment contributions for all orders
    const { data: paymentContributions } = await supabase
      .from('payment_contributions')
      .select(`
        id,
        order_id,
        user_id,
        amount_cents,
        status,
        created_at
      `)
      .in('order_id', orderIds);

    // Get contributor profiles
    const contributorIds = [...new Set(paymentContributions?.map(pc => pc.user_id) || [])];
    const { data: contributorProfiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', contributorIds);

    const contributorProfileMap = new Map(contributorProfiles?.map(p => [p.id, p]) || []);

    // Build payment contributions with profiles
    const paymentsWithProfiles = paymentContributions?.map(pc => ({
      ...pc,
      profiles: contributorProfileMap.get(pc.user_id) ? { email: contributorProfileMap.get(pc.user_id)!.email } : undefined,
    })) || [];

    // Group payments by order
    const paymentsByOrder = new Map<string, typeof paymentsWithProfiles>();
    paymentsWithProfiles.forEach(p => {
      if (!paymentsByOrder.has(p.order_id)) {
        paymentsByOrder.set(p.order_id, []);
      }
      paymentsByOrder.get(p.order_id)!.push(p);
    });

    // Build orders with details
    const ordersWithDetails: OrderWithDetails[] = (orders || []).map((order: any) => {
      const items: OrderItemWithBreakdown[] = (order.order_items || []).map((item: any) => ({
        id: item.id,
        order_id: item.order_id,
        product_id: item.product_id,
        product_name: item.product_name,
        unit_price_cents: item.unit_price_cents,
        quantity: item.quantity,
        customization: item.customization || {},
        line_total_cents: item.line_total_cents || (item.unit_price_cents * item.quantity),
        opted_out: item.opted_out || false,
      }));

      const orderPayments = paymentsByOrder.get(order.id) || [];
      const paidAmountCents = orderPayments
        .filter(p => p.status === 'approved' || p.status === 'paid')
        .reduce((sum, p) => sum + p.amount_cents, 0);

      const totalUnits = items.reduce((sum, item) => {
        if (item.customization?.size_breakdown) {
          return sum + calculateTotalUnits(item.customization.size_breakdown);
        }
        return sum + item.quantity;
      }, 0);

      const designRequest = designRequestMap.get(order.id);

      return {
        id: order.id,
        team_id: order.team_id,
        user_id: order.user_id,
        status: order.status,
        payment_status: order.payment_status,
        payment_mode: order.payment_mode || 'individual',
        total_amount_cents: order.total_amount_cents || 0,
        currency: order.currency || 'CLP',
        created_at: order.created_at,
        estimated_delivery_date: order.estimated_delivery_date,
        progress_stage: getProgressStage(order.status),
        items,
        design_request: designRequest ? {
          id: String(designRequest.id),
          status: designRequest.status,
          mockup_urls: designRequest.mockup_urls || [],
          created_at: designRequest.created_at,
        } : undefined,
        payments: orderPayments,
        total_units: totalUnits,
        paid_amount_cents: paidAmountCents,
      };
    });

    // Build client detail response
    const clientDetail: ClientDetail = {
      id: team.id,
      name: team.name,
      slug: team.slug,
      sport: team.sport || '',
      sport_name: team.sports?.name || team.sport || '',
      sport_id: team.sport_id,
      colors: team.colors || {},
      logo_url: team.logo_url,
      created_at: team.created_at,
      manager_email: managerProfile?.email,
      member_count: members.length,
      manager: managerProfile ? {
        id: managerMembership.user_id,
        email: managerProfile.email,
      } : undefined,
      members,
      orders: ordersWithDetails,
      design_requests: allDesignRequests || [],

      // Aggregated stats
      total_orders: ordersWithDetails.length,
      total_revenue_cents: ordersWithDetails.reduce((sum, o) => sum + o.total_amount_cents, 0),
      pending_orders: ordersWithDetails.filter(o => o.status === 'pending').length,
      active_orders: ordersWithDetails.filter(o =>
        ['design_review', 'design_approved', 'production', 'quality_check'].includes(o.status)
      ).length,
      completed_orders: ordersWithDetails.filter(o => o.status === 'delivered').length,
      unpaid_amount_cents: ordersWithDetails
        .filter(o => o.payment_status !== 'paid')
        .reduce((sum, o) => sum + o.total_amount_cents, 0),
    };

    return NextResponse.json({ client: clientDetail });
  } catch (error) {
    logger.error('Admin client detail GET error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}
