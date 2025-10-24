import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import type { ClientDetail, OrderWithDetails, OrderItemWithBreakdown } from '@/types/clients';
import { getProgressStage, calculateTotalUnits } from '@/types/clients';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireAdmin();
    const supabase = await createSupabaseServer();
    const clientId = id;

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
      logger.error('Error fetching team:', toError(teamError));
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Fetch emails from auth.users using admin API with service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();

    // Create a map of user emails
    const emailMap = new Map<string, string>();
    authUsers?.users?.forEach(user => {
      if (user.id && user.email) {
        emailMap.set(user.id, user.email);
      }
    });

    // Build members array
    const members = team.team_memberships?.map((m: any) => ({
      user_id: m.user_id,
      role: m.role,
      email: emailMap.get(m.user_id),
    })) || [];

    // Get manager
    const managerMembership = team.team_memberships?.find((m: any) => m.role === 'owner' || m.role === 'manager');
    const managerEmail = managerMembership ? emailMap.get(managerMembership.user_id) || undefined : undefined;

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
          unit_price_clp,
          quantity,
          customization,
          line_total_clp,
          opted_out
        )
      `)
      .eq('team_id', clientId)
      .order('created_at', { ascending: false });

    if (ordersError) {
      logger.error('Error fetching orders:', ordersError);
    }

    // Fetch ALL design requests for this team (both linked and unlinked to orders)
    // Join with institution_sub_teams to get team name, gender, sport info
    const { data: allDesignRequests } = await supabase
      .from('design_requests')
      .select(`
        id,
        order_id,
        status,
        mockup_urls,
        mockup_preference,
        mockups,
        created_at,
        product_name,
        primary_color,
        secondary_color,
        accent_color,
        sub_team_id,
        institution_sub_teams (
          name,
          coach_name,
          gender_category,
          sport_id,
          division_group,
          sports (
            name
          )
        )
      `)
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

    // Build payment contributions with emails
    const paymentsWithProfiles = paymentContributions?.map(pc => ({
      ...pc,
      profiles: emailMap.has(pc.user_id) ? { email: emailMap.get(pc.user_id)! } : undefined,
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
        unit_price_clp: item.unit_price_clp,
        quantity: item.quantity,
        customization: item.customization || {},
        line_total_clp: item.line_total_clp || (item.unit_price_clp * item.quantity),
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
        total_amount_cents: order.total_clp || 0,
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
      manager_email: managerEmail,
      member_count: members.length,
      manager: managerEmail ? {
        id: managerMembership.user_id,
        email: managerEmail,
      } : undefined,
      members,
      orders: ordersWithDetails,
      design_requests: (allDesignRequests || []).map((dr: any) => ({
        ...dr,
        institution_sub_teams: Array.isArray(dr.institution_sub_teams)
          ? dr.institution_sub_teams[0]
          : dr.institution_sub_teams
      })) as any,

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
      pending_design_requests: (allDesignRequests || []).filter(dr =>
        dr.status === 'pending' || dr.status === 'in_review'
      ).length,
      missing_player_info_count: 0, // TODO: Calculate from order_items
    };

    return NextResponse.json({ client: clientDetail });
  } catch (error) {
    logger.error('Admin client detail GET error:', toError(error));
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}
