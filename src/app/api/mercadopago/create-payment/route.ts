/**
 * Simple Mercado Pago Payment API
 * Creates a basic payment preference for an order
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPaymentPreference } from '@/lib/mercadopago';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, userId } = body;

    if (!orderId || !userId) {
      return NextResponse.json(
        { error: 'Missing orderId or userId' },
        { status: 400 }
      );
    }

    // Get order details
    console.log('[Payment] Looking for order:', orderId);
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total_amount_cents, team_id')
      .eq('id', orderId)
      .single();

    console.log('[Payment] Order query result:', { order, orderError });

    if (orderError || !order) {
      console.error('[Payment] Order not found:', orderId, orderError);
      return NextResponse.json(
        { error: 'Order not found', orderId, details: orderError },
        { status: 404 }
      );
    }

    // Get user details
    const { data: authData } = await supabase.auth.admin.getUserById(userId);

    if (!authData?.user?.email) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Create simple payment preference
    const preference = await createPaymentPreference({
      items: [
        {
          title: 'Orden de Diseño',
          quantity: 1,
          unit_price: order.total_amount_cents / 100, // Convert cents to CLP
          currency_id: 'CLP',
          description: `Orden #${orderId.slice(0, 8)}`,
        },
      ],
      payer: {
        email: authData.user.email,
        name: authData.user.user_metadata?.full_name,
      },
      external_reference: `order_${orderId}_${Date.now()}`,
      back_urls: {
        success: `${siteUrl}/payment/success`,
        failure: `${siteUrl}/payment/failure`,
        pending: `${siteUrl}/payment/pending`,
      },
      notification_url: `${siteUrl}/api/mercadopago/webhook`,
      metadata: {
        order_id: orderId,
        user_id: userId,
      },
    });

    return NextResponse.json({
      success: true,
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
    });
  } catch (error: any) {
    console.error('[Payment] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
