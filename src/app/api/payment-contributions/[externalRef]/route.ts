// GET /api/payment-contributions/[externalRef]
// Fetches payment contribution details by external reference
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { externalRef: string } }
) {
  try {
    const externalRef = params.externalRef;

    if (!externalRef) {
      return NextResponse.json(
        { error: 'External reference is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServer();

    // Fetch payment contribution with order and team details
    const { data: contribution, error: contributionError } = await supabase
      .from('payment_contributions')
      .select(`
        id,
        order_id,
        amount_cents,
        payment_status,
        orders (
          id,
          team_id,
          teams (
            id,
            slug,
            name
          )
        )
      `)
      .eq('external_reference', externalRef)
      .single();

    if (contributionError || !contribution) {
      logger.error('[Payment Info] Contribution not found:', contributionError);
      return NextResponse.json(
        { error: 'Payment contribution not found' },
        { status: 404 }
      );
    }

    // Extract team info from nested query
    const order = contribution.orders as any;
    const team = order?.teams as any;

    return NextResponse.json({
      orderId: contribution.order_id,
      amountCents: contribution.amount_cents,
      paymentStatus: contribution.payment_status,
      teamSlug: team?.slug || null,
      teamName: team?.name || null,
    });
  } catch (error: any) {
    logger.error('[Payment Info] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
