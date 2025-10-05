import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export const revalidate = 60; // Cache for 1 minute

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createSupabaseServer();

    // Call all analytics functions in parallel
    const [countsResult, revenueResult, productsResult] = await Promise.all([
      supabase.rpc('admin_order_counts'),
      supabase.rpc('admin_revenue_last_7_days'),
      supabase.rpc('admin_top_products', { p_limit: 5 })
    ]);

    if (countsResult.error) {
      console.error('Error fetching order counts:', countsResult.error);
      throw new Error('Failed to fetch order counts');
    }

    if (revenueResult.error) {
      console.error('Error fetching revenue data:', revenueResult.error);
      throw new Error('Failed to fetch revenue data');
    }

    if (productsResult.error) {
      console.error('Error fetching top products:', productsResult.error);
      throw new Error('Failed to fetch top products');
    }

    // Transform the data to match the expected format
    const counts = countsResult.data[0] || { pending: 0, paid: 0, cancelled: 0, total: 0 };

    const revenue7d = revenueResult.data.map((row: any) => ({
      day: row.day, // Already in YYYY-MM-DD format from the RPC
      totalCents: row.total_cents || 0
    }));

    const topProducts = productsResult.data.map((row: any) => ({
      productId: row.product_id,
      name: row.name,
      units: row.units || 0,
      revenueCents: row.revenue_cents || 0
    }));

    return NextResponse.json({
      counts,
      revenue7d,
      topProducts
    });

  } catch (error) {
    console.error('Admin analytics summary error:', error);

    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}