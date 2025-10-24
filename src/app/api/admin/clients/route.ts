import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import type { ClientSummary } from '@/types/clients';

export async function GET() {
  try {
    await requireAdmin();
    const supabase = await createSupabaseServer();

    // Fetch all teams with related data
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        slug,
        sport,
        sport_id,
        colors,
        logo_url,
        created_at,
        team_memberships (
          user_id,
          role
        ),
        sports (
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (teamsError) {
      logger.error('Error fetching teams:', teamsError);
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      );
    }

    if (!teams || teams.length === 0) {
      return NextResponse.json({ clients: [] });
    }

    // Fetch all orders for all teams in a single query
    const teamIds = teams.map(t => t.id);
    const { data: allOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, team_id, status, payment_status, total_amount_clp')
      .in('team_id', teamIds);

    if (ordersError) {
      logger.error('Error fetching orders:', ordersError);
    }

    // Fetch all team memberships with profiles for manager emails
    const membershipUserIds = teams
      .flatMap(t => t.team_memberships?.map((m: any) => m.user_id) || [])
      .filter((id, index, self) => self.indexOf(id) === index); // unique

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', membershipUserIds);

    if (profilesError) {
      logger.error('Error fetching profiles:', profilesError);
    }

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Build client summaries
    const clients: ClientSummary[] = teams.map((team: any) => {
      // Get orders for this team
      const teamOrders = allOrders?.filter(o => o.team_id === team.id) || [];

      // Calculate stats
      const totalOrders = teamOrders.length;
      const totalRevenueCents = teamOrders.reduce((sum, o) => sum + (o.total_amount_clp || 0), 0);
      const pendingOrders = teamOrders.filter(o => o.status === 'pending').length;
      const activeOrders = teamOrders.filter(o =>
        ['design_review', 'design_approved', 'production', 'quality_check'].includes(o.status)
      ).length;
      const completedOrders = teamOrders.filter(o =>
        ['delivered'].includes(o.status)
      ).length;
      const unpaidAmountCents = teamOrders
        .filter(o => o.payment_status !== 'paid')
        .reduce((sum, o) => sum + (o.total_amount_clp || 0), 0);

      // Get manager email
      const manager = team.team_memberships?.find((m: any) => m.role === 'owner' || m.role === 'manager');
      const managerProfile = manager ? profileMap.get(manager.user_id) : null;

      // Get member count
      const memberCount = team.team_memberships?.length || 0;

      return {
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
        member_count: memberCount,
        total_orders: totalOrders,
        total_revenue_cents: totalRevenueCents,
        pending_orders: pendingOrders,
        active_orders: activeOrders,
        completed_orders: completedOrders,
        unpaid_amount_cents: unpaidAmountCents,
        pending_design_requests: 0, // TODO: Calculate from design_requests table
        missing_player_info_count: 0, // TODO: Calculate from order_items
      };
    });

    return NextResponse.json({ clients });
  } catch (error) {
    logger.error('Admin clients GET error:', toError(error));
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}
