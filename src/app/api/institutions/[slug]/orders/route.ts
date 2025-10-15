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
          size,
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

    // Group orders by order_number
    const groupedOrders = (orders || []).reduce((groups, order) => {
      const key = order.order_number || order.id;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(order);
      return groups;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      orders: orders || [],
      grouped_orders: groupedOrders,
      total: count || 0,
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
