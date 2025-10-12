import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { redirect } from 'next/navigation';
import OrdersClient from './OrdersClient';
import { logger } from '@/lib/logger';

export default async function AdminOrdersPage() {
  try {
    await requireAdmin();

    const supabase = createSupabaseServer();

    // Fetch all orders with team info
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        team_id,
        status,
        payment_status,
        currency,
        subtotal_cents,
        total_cents,
        total_amount_cents,
        notes,
        tracking_number,
        carrier,
        estimated_delivery_date,
        created_at,
        teams (
          name
        )
      `)
      .order('created_at', { ascending: false });

    // Get user emails separately
    if (orders && orders.length > 0) {
      const userIds = [...new Set(orders.map(o => o.user_id))];
      const { data: users } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      // Map user emails to orders
      const userMap = new Map(users?.map(u => [u.id, u]) || []);
      orders.forEach((order: any) => {
        order.profiles = userMap.get(order.user_id) || { id: order.user_id, email: 'Unknown' };
      });
    }

    if (error) {
      logger.error('Error fetching orders:', error);
      throw new Error('Failed to fetch orders');
    }

    return (
      <OrdersClient
        initialOrders={orders as any}
      />
    );

  } catch (error) {
    logger.error('Admin orders page error:', error);
    redirect('/dashboard?error=admin_required');
  }
}

export const metadata = {
  title: 'Order Management | Admin',
  description: 'Manage customer orders and status updates.',
};