import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { z } from 'zod';

const createPreferenceSchema = z.object({
  orderId: z.string().uuid()
});

function getBaseURL() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServer();

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const body = await request.json();
    const { orderId } = createPreferenceSchema.parse(body);

    // Fetch order and verify ownership
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        total_cents,
        currency,
        user_id,
        order_items (
          id,
          quantity,
          line_total_cents,
          products (
            id,
            name
          )
        )
      `)
      .eq('id', orderId)
      .eq('user_id', session.user.id)
      .eq('status', 'pending')
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found or not payable' }, { status: 404 });
    }

    // Check if payment already exists
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, preference_id, status')
      .eq('order_id', orderId)
      .eq('provider', 'mercadopago')
      .single();

    if (existingPayment && existingPayment.status === 'approved') {
      return NextResponse.json({ error: 'Order already paid' }, { status: 400 });
    }

    // Calculate total amount
    const amountCents = order.order_items.reduce((sum: number, item: any) =>
      sum + item.line_total_cents, 0
    );

    if (amountCents <= 0) {
      return NextResponse.json({ error: 'Invalid order amount' }, { status: 400 });
    }

    // Generate short order ID for display
    const shortOrderId = order.id.slice(0, 8);

    // Create Mercado Pago preference
    const preferencePayload = {
      items: [{
        title: `Order ${shortOrderId}`,
        quantity: 1,
        unit_price: amountCents / 100,
        currency_id: order.currency || 'CLP'
      }],
      back_urls: {
        success: `${getBaseURL()}/payments/mp/success?orderId=${orderId}`,
        failure: `${getBaseURL()}/payments/mp/failure?orderId=${orderId}`,
        pending: `${getBaseURL()}/payments/mp/pending?orderId=${orderId}`
      },
      auto_return: "approved",
      notification_url: `${getBaseURL()}/api/webhooks/mercadopago?token=${process.env.MP_WEBHOOK_TOKEN}`,
      external_reference: orderId,
      statement_descriptor: "Deserve Store"
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferencePayload)
    });

    if (!mpResponse.ok) {
      const mpError = await mpResponse.text();
      console.error('Mercado Pago error:', mpError);
      return NextResponse.json({ error: 'Payment provider error' }, { status: 500 });
    }

    const preference = await mpResponse.json();

    // Create or update payment record
    let paymentResult;
    if (existingPayment) {
      // Update existing payment
      paymentResult = await supabase
        .from('payments')
        .update({
          preference_id: preference.id,
          amount_cents: amountCents,
          currency: order.currency || 'CLP',
          status: 'pending',
          raw: preference
        })
        .eq('id', existingPayment.id)
        .select()
        .single();
    } else {
      // Create new payment
      paymentResult = await supabase
        .from('payments')
        .insert({
          order_id: orderId,
          provider: 'mercadopago',
          preference_id: preference.id,
          amount_cents: amountCents,
          currency: order.currency || 'CLP',
          status: 'pending',
          raw: preference
        })
        .select()
        .single();
    }

    if (paymentResult.error) {
      console.error('Database error:', paymentResult.error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Log payment event
    await supabase
      .from('payment_events')
      .insert({
        payment_id: paymentResult.data.id,
        event: 'preference.created',
        payload: preference
      });

    return NextResponse.json({
      initPoint: preference.init_point,
      preferenceId: preference.id,
      paymentId: paymentResult.data.id
    });

  } catch (error) {
    console.error('Create preference error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}