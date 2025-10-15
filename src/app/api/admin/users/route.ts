import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createSupabaseServer();

    // Fetch all profiles with user data
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      logger.error('Error fetching profiles:', profilesError);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Get user IDs
    const userIds = profiles?.map(p => p.id) || [];

    // Fetch emails from auth.users using admin API
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      logger.error('Error fetching auth users:', authError);
    }

    // Create a map of user emails
    const emailMap = new Map<string, string>();
    authUsers?.users?.forEach(user => {
      if (user.id && user.email) {
        emailMap.set(user.id, user.email);
      }
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
      .select('user_id, total_amount_cents, status, created_at')
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

    // Build user summaries
    const users = profiles?.map(profile => {
      const userMemberships = membershipsByUser.get(profile.id) || [];
      const userOrders = ordersByUser.get(profile.id) || [];

      const totalSpent = userOrders.reduce((sum, order) => sum + (order.total_amount_cents || 0), 0);
      const completedOrders = userOrders.filter(o => o.status === 'delivered').length;

      return {
        id: profile.id,
        email: emailMap.get(profile.id) || 'No email',
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        is_admin: profile.is_admin || false,
        created_at: profile.created_at,
        updated_at: profile.updated_at,

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
    logger.error('Admin users GET error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}
