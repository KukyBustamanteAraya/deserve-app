import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { redirect } from 'next/navigation';
import OrdersClient from './OrdersClient';

export default async function AdminOrdersPage() {
  try {
    await requireAdmin();

    const supabase = createSupabaseServer();

    // Fetch all orders with user info
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        status,
        currency,
        subtotal_cents,
        total_cents,
        notes,
        created_at,
        profiles!inner (
          id,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      throw new Error('Failed to fetch orders');
    }

    return (
      <OrdersClient
        initialOrders={orders as any}
      />
    );

  } catch (error) {
    console.error('Admin orders page error:', error);
    redirect('/dashboard?error=admin_required');
  }
}

export const metadata = {
  title: 'Order Management | Admin',
  description: 'Manage customer orders and status updates.',
};