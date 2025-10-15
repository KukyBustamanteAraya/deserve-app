import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';

interface ActivityEvent {
  id: string;
  type: 'design_request' | 'order' | 'sub_team' | 'member';
  action: string;
  description: string;
  timestamp: string;
  metadata: Record<string, any>;
}

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
      .select('id, name')
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
    const limit = parseInt(searchParams.get('limit') || '20');

    const activities: ActivityEvent[] = [];

    // Fetch recent design requests
    const { data: designRequests, error: drError } = await supabase
      .from('design_requests')
      .select(`
        id,
        status,
        created_at,
        sub_team:sub_team_id(name, slug),
        team:team_id(name)
      `)
      .eq('team_id', institution.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!drError && designRequests) {
      designRequests.forEach(dr => {
        activities.push({
          id: `dr-${dr.id}`,
          type: 'design_request',
          action: dr.status === 'pending' ? 'created' : dr.status,
          description: `Design request ${dr.status} for ${dr.sub_team?.name || 'team'}`,
          timestamp: dr.created_at,
          metadata: {
            design_request_id: dr.id,
            sub_team: dr.sub_team,
            status: dr.status,
          },
        });
      });
    }

    // Fetch recent orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        created_at,
        total_clp,
        sub_team:sub_team_id(name, slug)
      `)
      .eq('team_id', institution.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!ordersError && orders) {
      orders.forEach(order => {
        activities.push({
          id: `order-${order.id}`,
          type: 'order',
          action: order.status,
          description: `Order ${order.order_number} ${order.status} - ${order.sub_team?.name || 'institution'}`,
          timestamp: order.created_at,
          metadata: {
            order_id: order.id,
            order_number: order.order_number,
            status: order.status,
            total_clp: order.total_clp,
            sub_team: order.sub_team,
          },
        });
      });
    }

    // Fetch recently created sub-teams
    const { data: subTeams, error: stError } = await supabase
      .from('institution_sub_teams')
      .select(`
        id,
        name,
        slug,
        created_at,
        sports:sport_id(name)
      `)
      .eq('institution_team_id', institution.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!stError && subTeams) {
      subTeams.forEach(st => {
        activities.push({
          id: `subteam-${st.id}`,
          type: 'sub_team',
          action: 'created',
          description: `Program created: ${st.name} (${st.sports?.name})`,
          timestamp: st.created_at,
          metadata: {
            sub_team_id: st.id,
            name: st.name,
            slug: st.slug,
            sport: st.sports,
          },
        });
      });
    }

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Return limited results
    const limitedActivities = activities.slice(0, limit);

    return NextResponse.json({
      activities: limitedActivities,
      total: activities.length,
    });

  } catch (error) {
    logger.error('Error in institution activity GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
