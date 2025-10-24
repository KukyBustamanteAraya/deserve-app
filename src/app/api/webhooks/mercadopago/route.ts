import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

interface MercadoPagoWebhook {
  action?: string;
  api_version?: string;
  data?: {
    id?: string;
  };
  date_created?: string;
  id?: number;
  live_mode?: boolean;
  type?: string;
  user_id?: string;
}

export async function POST(request: Request) {
  try {
    // Verify webhook token
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token || token !== process.env.MP_WEBHOOK_TOKEN) {
      logger.debug('Mercado Pago webhook: Invalid token');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const webhook: MercadoPagoWebhook = await request.json();

    logger.debug('Mercado Pago webhook received:', {
      type: webhook.type,
      action: webhook.action,
      dataId: webhook.data?.id,
      liveMode: webhook.live_mode
    });

    // We're only interested in payment notifications
    if (webhook.type !== 'payment' || !webhook.data?.id) {
      logger.debug('Mercado Pago webhook: Not a payment notification or missing data.id');
      return NextResponse.json({ status: 'ignored' });
    }

    const supabase = await createSupabaseServer();

    // Record the webhook event first
    const webhookEventResult = await supabase
      .from('payment_events')
      .insert({
        payment_id: null, // We'll update this once we find the payment
        event: 'webhook.received',
        payload: webhook
      })
      .select()
      .single();

    // Fetch payment details from Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${webhook.data.id}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
      }
    });

    if (!mpResponse.ok) {
      logger.error('Failed to fetch payment from Mercado Pago', { status: mpResponse.status });
      return NextResponse.json({ error: 'Failed to fetch payment details' }, { status: 500 });
    }

    const paymentData = await mpResponse.json();

    logger.debug('Mercado Pago payment data:', {
      id: paymentData.id,
      status: paymentData.status,
      externalReference: paymentData.external_reference,
      transactionAmount: paymentData.transaction_amount
    });

    // Find the payment record by external_reference (order_id) or preference_id
    let payment = null;

    if (paymentData.external_reference) {
      // Try to find by order_id from external_reference
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', paymentData.external_reference)
        .eq('provider', 'mercadopago');

      payment = payments?.[0];
    }

    // If not found by external_reference, try by preference_id
    if (!payment && paymentData.order?.id) {
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('preference_id', paymentData.order.id)
        .eq('provider', 'mercadopago');

      payment = payments?.[0];
    }

    if (!payment) {
      logger.debug('Mercado Pago webhook: Payment record not found');
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    // Update the webhook event with the payment_id
    if (webhookEventResult.data) {
      await supabase
        .from('payment_events')
        .update({ payment_id: payment.id })
        .eq('id', webhookEventResult.data.id);
    }

    // Map Mercado Pago status to our status
    let newStatus = 'pending';
    switch (paymentData.status) {
      case 'approved':
        newStatus = 'approved';
        break;
      case 'rejected':
        newStatus = 'rejected';
        break;
      case 'cancelled':
        newStatus = 'cancelled';
        break;
      case 'refunded':
        newStatus = 'refunded';
        break;
      default:
        newStatus = 'pending';
    }

    // Update payment record
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        external_id: paymentData.id?.toString(),
        status: newStatus,
        raw: paymentData
      })
      .eq('id', payment.id);

    if (updateError) {
      logger.error('Failed to update payment:', toSupabaseError(updateError));
      return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
    }

    // Log payment status change
    await supabase
      .from('payment_events')
      .insert({
        payment_id: payment.id,
        event: `payment.${newStatus}`,
        payload: paymentData
      });

    // If payment is approved, update order status
    if (newStatus === 'approved') {
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', payment.order_id);

      if (orderError) {
        logger.error('Failed to update order status:', orderError);
      } else {
        logger.debug(`Order ${payment.order_id} marked as paid`);
      }
    }

    logger.debug(`Payment ${payment.id} updated to status: ${newStatus}`);

    return NextResponse.json({
      status: 'processed',
      paymentId: payment.id,
      newStatus
    });

  } catch (error) {
    logger.error('Mercado Pago webhook error:', toError(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}