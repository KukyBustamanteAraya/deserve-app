// Institution orders API - fetches orders and design requests
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createSupabaseServer();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch institution team
    const { data: institution, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('slug', params.slug)
      .eq('team_type', 'institution')
      .single();

    if (teamError || !institution) {
      return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
    }

    // Verify user has access
    const { data: membership } = await supabase
      .from('team_memberships')
      .select('role, institution_role')
      .eq('team_id', institution.id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const subTeamId = searchParams.get('sub_team_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('orders')
      .select(`
        *,
        sub_team:sub_team_id(id, name, slug, sport_id),
        order_items(
          id,
          product_id,
          quantity,
          unit_price_clp,
          line_total_clp,
          opted_out
        )
      `)
      .eq('team_id', institution.id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      const statuses = status.split(',');
      query = query.in('status', statuses);
    }

    if (subTeamId) {
      query = query.eq('sub_team_id', subTeamId);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      logger.error('Error fetching institution orders:', ordersError);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    // Fetch design requests for this institution
    const { data: designRequests, error: designRequestsError } = await supabase
      .from('design_requests')
      .select(`
        id,
        status,
        created_at,
        updated_at,
        sub_team_id,
        design_id,
        primary_color,
        secondary_color,
        accent_color,
        feedback,
        sport_slug,
        sub_team:sub_team_id(id, name, slug, sport_id)
      `)
      .eq('team_id', institution.id)
      .in('status', ['pending', 'in_review', 'changes_requested', 'approved'])
      .order('created_at', { ascending: false });

    if (designRequestsError) {
      logger.error('Error fetching design requests:', designRequestsError);
    }

    // Fetch sport names for design requests
    const sportSlugs = [...new Set((designRequests || []).map(dr => dr.sport_slug).filter(Boolean))];
    let sportsData: any[] = [];

    if (sportSlugs.length > 0) {
      const { data } = await supabase
        .from('sports')
        .select('slug, name')
        .in('slug', sportSlugs);
      sportsData = data || [];
    }

    const sportMap = (sportsData || []).reduce((acc, sport) => {
      acc[sport.slug] = sport.name;
      return acc;
    }, {} as Record<string, string>);

    // Map design requests to order-like format
    const designRequestsAsOrders = (designRequests || []).map(dr => ({
      id: `design-request-${dr.id}`,
      orderNumber: `DR-${dr.id}`,
      teamName: dr.sub_team?.name || 'Sin equipo',
      teamSlug: dr.sub_team?.slug || '',
      sport: sportMap[dr.sport_slug] || dr.sport_slug || 'Desconocido',
      items: 0,
      totalCents: 0,
      paidCents: 0,
      status: `design_${dr.status}`, // Prefix to differentiate from order statuses
      date: dr.created_at,
      team_id: institution.id,
      sub_team_id: dr.sub_team_id,
      sub_team: dr.sub_team,
      created_at: dr.created_at,
      updated_at: dr.updated_at,
      total_clp: 0, // No price yet
      order_items: [],
      is_design_request: true,
      design_request_id: dr.id,
      design_request_data: {
        design_id: dr.design_id,
        primary_color: dr.primary_color,
        secondary_color: dr.secondary_color,
        accent_color: dr.accent_color,
        feedback: dr.feedback,
        sport_slug: dr.sport_slug,
      }
    }));

    // Get total count for pagination
    let countQuery = supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', institution.id);

    if (status) {
      const statuses = status.split(',');
      countQuery = countQuery.in('status', statuses);
    }

    if (subTeamId) {
      countQuery = countQuery.eq('sub_team_id', subTeamId);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      logger.error('Error counting orders:', countError);
    }

    // Combine orders and design requests
    const allOrders = [...(orders || []), ...designRequestsAsOrders];

    // Sort by created_at (most recent first)
    allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Group orders by order_number
    const groupedOrders = allOrders.reduce((groups, order) => {
      const key = order.order_number || order.id;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(order);
      return groups;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      orders: allOrders,
      grouped_orders: groupedOrders,
      total: (count || 0) + (designRequests?.length || 0),
      limit,
      offset,
    });

  } catch (error) {
    logger.error('Error in institution orders GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
