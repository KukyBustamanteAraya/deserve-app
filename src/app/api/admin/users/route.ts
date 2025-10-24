import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

export async function GET() {
  try {
    await requireAdmin();
    const supabase = await createSupabaseServer();
    const supabaseAdmin = createSupabaseServiceClient();

    // Fetch ALL auth users first (this is the source of truth)
    // Use service role client for admin API access
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      logger.error('Error fetching auth users:', toError(authError));
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Get all user IDs from auth
    const userIds = authUsers?.users?.map(u => u.id) || [];

    // Fetch profiles for these users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);

    if (profilesError) {
      logger.error('Error fetching profiles:', profilesError);
    }

    // Create a map of profiles by user ID
    const profileMap = new Map<string, any>();
    profiles?.forEach(profile => {
      profileMap.set(profile.id, profile);
    });

    // Fetch team memberships for all users
    const { data: teamMemberships } = await supabase
      .from('team_memberships')
      .select(`
        user_id,
        role,
        teams (
          id,
          name,
          slug
        )
      `)
      .in('user_id', userIds);

    // Fetch orders for all users
    const { data: orders } = await supabase
      .from('orders')
      .select('user_id, total_amount_clp, status, created_at')
      .in('user_id', userIds);

    // Group memberships and orders by user
    const membershipsByUser = new Map<string, any[]>();
    const ordersByUser = new Map<string, any[]>();

    teamMemberships?.forEach(membership => {
      if (!membershipsByUser.has(membership.user_id)) {
        membershipsByUser.set(membership.user_id, []);
      }
      membershipsByUser.get(membership.user_id)!.push(membership);
    });

    orders?.forEach(order => {
      if (!ordersByUser.has(order.user_id)) {
        ordersByUser.set(order.user_id, []);
      }
      ordersByUser.get(order.user_id)!.push(order);
    });

    // Build user summaries - iterate through ALL auth users
    const users = authUsers?.users?.map(authUser => {
      const profile = profileMap.get(authUser.id);
      const userMemberships = membershipsByUser.get(authUser.id) || [];
      const userOrders = ordersByUser.get(authUser.id) || [];

      const totalSpent = userOrders.reduce((sum, order) => sum + (order.total_amount_clp || 0), 0);
      const completedOrders = userOrders.filter(o => o.status === 'delivered').length;

      return {
        id: authUser.id,
        email: authUser.email || 'No email',
        full_name: profile?.full_name || null,
        avatar_url: profile?.avatar_url || null,
        is_admin: profile?.is_admin || false,
        user_type: profile?.user_type || null,
        created_at: authUser.created_at || profile?.created_at,
        updated_at: authUser.updated_at || profile?.updated_at,

        // Aggregated data
        team_count: userMemberships.length,
        teams: userMemberships.map(m => ({
          id: m.teams?.id,
          name: m.teams?.name,
          slug: m.teams?.slug,
          role: m.role,
        })),
        order_count: userOrders.length,
        completed_order_count: completedOrders,
        total_spent_cents: totalSpent,
      };
    }) || [];

    return NextResponse.json({
      users,
      stats: {
        total_users: users.length,
        admin_users: users.filter(u => u.is_admin).length,
        users_with_teams: users.filter(u => u.team_count > 0).length,
        users_with_orders: users.filter(u => u.order_count > 0).length,
      }
    });

  } catch (error) {
    logger.error('Admin users GET error:', toError(error));
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}
