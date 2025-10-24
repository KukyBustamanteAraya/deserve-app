import { Suspense } from 'react';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import ClientsGrid from './ClientsGrid';
import type { ClientSummary, OrderItemCustomization } from '@/types/clients';
import { createClient } from '@supabase/supabase-js';

interface TeamMembershipData {
  user_id: string;
  role: string;
}

interface SportData {
  name: string;
}

interface TeamData {
  id: string;
  name: string;
  slug: string;
  sport: string | null;
  sport_id: number | null;
  colors: {
    primary?: string;
    secondary?: string;
    tertiary?: string;
  } | null;
  logo_url: string | null;
  created_at: string;
  team_memberships: TeamMembershipData[] | null;
  sports: SportData[] | null;
}

async function getClients(): Promise<ClientSummary[]> {
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
      return [];
    }

    if (!teams || teams.length === 0) {
      return [];
    }

    // Fetch all orders for all teams in a single query
    const teamIds = teams.map(t => t.id);
    const { data: allOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, team_id, status, payment_status, total_clp')
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

    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

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

    // Build client summaries
    const clients: ClientSummary[] = teams.map((team: TeamData) => {
      // Get orders for this team
      const teamOrders = allOrders?.filter(o => o.team_id === team.id) || [];

      // Calculate stats
      const totalOrders = teamOrders.length;
      const totalRevenueCents = teamOrders.reduce((sum, o) => sum + (o.total_clp || 0), 0);
      const pendingOrders = teamOrders.filter(o => o.status === 'pending').length;
      const activeOrders = teamOrders.filter(o =>
        ['design_review', 'design_approved', 'production', 'quality_check'].includes(o.status)
      ).length;
      const completedOrders = teamOrders.filter(o =>
        ['delivered'].includes(o.status)
      ).length;
      const unpaidAmountCents = teamOrders
        .filter(o => o.payment_status !== 'paid')
        .reduce((sum, o) => sum + (o.total_clp || 0), 0);

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
        const customization = item.customization as OrderItemCustomization;
        // If item has size_breakdown (bulk order) but no player_name or jersey_number, it's missing info
        if (customization?.size_breakdown) {
          return !customization.player_name && !customization.jersey_number;
        }
        return false;
      }).length;

      // Get manager email
      const manager = team.team_memberships?.find((m) => m.role === 'owner' || m.role === 'manager');
      const managerEmail = manager ? emailMap.get(manager.user_id) ?? undefined : undefined;

      // Get member count
      const memberCount = team.team_memberships?.length || 0;

      return {
        id: team.id,
        name: team.name,
        slug: team.slug,
        sport: team.sport || '',
        sport_name: team.sports?.[0]?.name || team.sport || '',
        sport_id: team.sport_id || undefined,
        colors: team.colors || {},
        logo_url: team.logo_url || undefined,
        created_at: team.created_at,
        manager_email: managerEmail,
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
    logger.error('Error fetching clients:', toError(error));
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
