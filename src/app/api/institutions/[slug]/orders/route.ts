// Institution orders API - fetches orders and design requests
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    logger.info(`[Orders API] Fetching orders for slug: "${slug}"`);
    const supabase = await createSupabaseServer();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.error('[Orders API] Authentication failed:', toError(authError));
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info(`[Orders API] User authenticated: ${user.id}`);

    // Fetch institution team
    const { data: institution, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('slug', slug)
      .eq('team_type', 'institution')
      .single();

    if (teamError || !institution) {
      logger.error(`[Orders API] Institution not found for slug "${slug}":`, toError(teamError));
      logger.error('[Orders API] Error details:', { code: (teamError as any)?.code, message: (teamError as any)?.message });
      return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
    }

    logger.info(`[Orders API] Institution found: ID ${institution.id}`);

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

    // Determine user's role and managed teams
    let institutionRole: 'athletic_director' | 'coach' | 'assistant' | 'player' = 'player';
    let managedSubTeamIds: string[] = [];

    if (membership.institution_role === 'athletic_director') {
      institutionRole = 'athletic_director';
      // AD can see all teams - fetch all sub-team IDs
      const { data: allSubTeams } = await supabase
        .from('institution_sub_teams')
        .select('id')
        .eq('institution_team_id', institution.id)
        .eq('active', true);
      managedSubTeamIds = allSubTeams?.map(st => st.id) || [];
    } else {
      // Check if user is a coach (head_coach_user_id matches)
      const { data: coachedTeams } = await supabase
        .from('institution_sub_teams')
        .select('id')
        .eq('institution_team_id', institution.id)
        .eq('head_coach_user_id', user.id)
        .eq('active', true);

      if (coachedTeams && coachedTeams.length > 0) {
        institutionRole = 'coach';
        managedSubTeamIds = coachedTeams.map(st => st.id);
      } else if (membership.institution_role === 'assistant') {
        institutionRole = 'assistant';
        // Assistants can see all teams
        const { data: allSubTeams } = await supabase
          .from('institution_sub_teams')
          .select('id')
          .eq('institution_team_id', institution.id)
          .eq('active', true);
        managedSubTeamIds = allSubTeams?.map(st => st.id) || [];
      }
    }

    logger.info('[Orders API] User role:', { institutionRole, managedTeamsCount: managedSubTeamIds.length });

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
        sub_team:sub_team_id(id, name, slug, sport_id, gender_category, division_group),
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

    // Apply role-based filtering - Coaches only see their teams
    if (institutionRole === 'coach' && managedSubTeamIds.length > 0) {
      query = query.in('sub_team_id', managedSubTeamIds);
      logger.info('[Orders API] Filtering orders for coach to sub-teams:', managedSubTeamIds);
    }

    // Apply filters
    if (status) {
      const statuses = status.split(',');
      query = query.in('status', statuses);
    }

    if (subTeamId) {
      // Verify coach has access to this sub-team if they're filtering by it
      if (institutionRole === 'coach' && !managedSubTeamIds.includes(subTeamId)) {
        return NextResponse.json({ error: 'Access denied to this team' }, { status: 403 });
      }
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
    let designRequestQuery = supabase
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
        selected_apparel,
        mockup_urls,
        sub_team:sub_team_id(id, name, slug, sport_id),
        designs (
          id,
          name,
          slug,
          description,
          designer_name,
          design_mockups (
            id,
            mockup_url,
            is_primary,
            view_angle,
            product_type_slug
          )
        )
      `)
      .eq('team_id', institution.id)
      .in('status', ['pending', 'in_review', 'changes_requested', 'approved', 'ready', 'design_ready'])
      .order('created_at', { ascending: false });

    // Apply role-based filtering - Coaches only see their teams' design requests
    if (institutionRole === 'coach' && managedSubTeamIds.length > 0) {
      designRequestQuery = designRequestQuery.in('sub_team_id', managedSubTeamIds);
      logger.info('[Orders API] Filtering design requests for coach');
    }

    const { data: designRequests, error: designRequestsError } = await designRequestQuery;

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

    // Fetch roster member counts for each design request's sub-team
    const subTeamIds = (designRequests || []).map(dr => dr.sub_team_id).filter(Boolean);
    let rosterCounts: Record<string, number> = {};

    if (subTeamIds.length > 0) {
      const { data: rosterData } = await supabase
        .from('institution_sub_team_members')
        .select('sub_team_id')
        .in('sub_team_id', subTeamIds);

      // Count members per sub-team
      if (rosterData) {
        rosterCounts = rosterData.reduce((acc, member) => {
          acc[member.sub_team_id] = (acc[member.sub_team_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    }

    // Map design requests to order-like format
    const designRequestsAsOrders = (designRequests || []).map(dr => {
      // Use roster member count as items count
      const itemsCount = dr.sub_team_id ? (rosterCounts[dr.sub_team_id] || 0) : 0;

      return {
        id: `design-request-${dr.id}`,
        orderNumber: `DR-${dr.id}`,
        teamName: (dr.sub_team as any)?.name || 'Sin equipo',
        teamSlug: (dr.sub_team as any)?.slug || '',
        sport: sportMap[dr.sport_slug] || dr.sport_slug || 'Desconocido',
        items: itemsCount, // ✅ Calculate from selected products
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
        mockup_urls: dr.mockup_urls, // ✅ Include admin-uploaded mockups
        design_request_data: {
          design_id: dr.design_id,
          primary_color: dr.primary_color,
          secondary_color: dr.secondary_color,
          accent_color: dr.accent_color,
          feedback: dr.feedback,
          sport_slug: dr.sport_slug,
          designs: dr.designs, // Include full design data with mockups
        }
      };
    });

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

    // Add items count to regular orders (sum of order_items quantities)
    const ordersWithItems = (orders || []).map(order => ({
      ...order,
      items: (order.order_items || []).reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
    }));

    // Combine orders and design requests
    const allOrders = [...ordersWithItems, ...designRequestsAsOrders];

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
    logger.error('Error in institution orders GET:', toError(error));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
