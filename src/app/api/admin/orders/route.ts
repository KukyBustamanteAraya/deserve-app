import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createSupabaseServer();

    // Get all orders with user email info
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
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Admin orders GET error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}