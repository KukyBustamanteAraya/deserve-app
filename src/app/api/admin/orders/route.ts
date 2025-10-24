import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

export async function GET() {
  try {
    await requireAdmin();
    const supabase = await createSupabaseServer();

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
      logger.error('Error fetching orders:', toError(error));
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    return NextResponse.json({ orders });
  } catch (error) {
    logger.error('Admin orders GET error:', toError(error));
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}