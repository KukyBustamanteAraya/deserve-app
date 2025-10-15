import { Suspense } from 'react';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { logger } from '@/lib/logger';
import ClientsGrid from './ClientsGrid';
import type { ClientSummary } from '@/types/clients';

async function getClients(): Promise<ClientSummary[]> {
  try {
    await requireAdmin();
    const supabase = createSupabaseServer();

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
      return [];
    }

    if (!teams || teams.length === 0) {
      return [];
    }

    // Fetch all orders for all teams in a single query
    const teamIds = teams.map(t => t.id);
    const { data: allOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, team_id, status, payment_status, total_amount_cents')
      .in('team_id', teamIds);

    if (ordersError) {
      logger.error('Error fetching orders:', ordersError);
    }

    // Fetch all design requests for all teams
    const { data: allDesignRequests, error: designRequestsError } = await supabase
      .from('design_requests')
      .select('id, team_id, status')
      .in('team_id', teamIds);

    if (designRequestsError) {
      logger.error('Error fetching design requests:', designRequestsError);
    }

    // Fetch order items to check for missing player info
    const orderIds = allOrders?.map(o => o.id) || [];
    const { data: allOrderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('id, order_id, customization')
      .in('order_id', orderIds);

    if (itemsError) {
      logger.error('Error fetching order items:', itemsError);
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
      const totalRevenueCents = teamOrders.reduce((sum, o) => sum + (o.total_amount_cents || 0), 0);
      const pendingOrders = teamOrders.filter(o => o.status === 'pending').length;
      const activeOrders = teamOrders.filter(o =>
        ['design_review', 'design_approved', 'production', 'quality_check'].includes(o.status)
      ).length;
      const completedOrders = teamOrders.filter(o =>
        ['delivered'].includes(o.status)
      ).length;
      const unpaidAmountCents = teamOrders
        .filter(o => o.payment_status !== 'paid')
        .reduce((sum, o) => sum + (o.total_amount_cents || 0), 0);

      // Get design requests for this team
      const teamDesignRequests = allDesignRequests?.filter(dr => dr.team_id === team.id) || [];
      const pendingDesignRequests = teamDesignRequests.filter(dr =>
        dr.status === 'pending' || dr.status === 'in_review'
      ).length;

      // Calculate missing player info count
      // An order item is missing player info if it has size_breakdown but no player names/numbers filled
      const teamOrderIds = teamOrders.map(o => o.id);
      const teamOrderItems = allOrderItems?.filter(item => teamOrderIds.includes(item.order_id)) || [];

      const missingPlayerInfoCount = teamOrderItems.filter(item => {
        const customization = item.customization as any;
        // If item has size_breakdown (bulk order) but no player_name or jersey_number, it's missing info
        if (customization?.size_breakdown) {
          return !customization.player_name && !customization.jersey_number;
        }
        return false;
      }).length;

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
        pending_design_requests: pendingDesignRequests,
        missing_player_info_count: missingPlayerInfoCount,
      };
    });

    return clients;
  } catch (error) {
    logger.error('Error fetching clients:', error);
    return [];
  }
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-md border border-gray-700 rounded-xl p-6 animate-pulse"
        >
          <div className="space-y-4">
            <div className="h-8 bg-gray-700/50 rounded w-3/4"></div>
            <div className="h-4 bg-gray-700/50 rounded w-1/2"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-700/50 rounded"></div>
              <div className="h-4 bg-gray-700/50 rounded"></div>
              <div className="h-4 bg-gray-700/50 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div>
      <Suspense fallback={<LoadingSkeleton />}>
        <ClientsGrid initialClients={clients} />
      </Suspense>
    </div>
  );
}
