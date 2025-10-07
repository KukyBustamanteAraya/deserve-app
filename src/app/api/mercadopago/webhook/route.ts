/**
 * Mercado Pago Webhook Handler
 * Receives payment notifications from Mercado Pago and updates our database accordingly
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validateWebhookSignature,
  getPaymentDetails,
} from '@/lib/mercadopago';

// Use service role for DB updates (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    // Parse webhook payload
    const body = await request.json();
    console.log('[MP-Webhook] Received notification:', JSON.stringify(body, null, 2));

    // Get signature headers
    const xSignature = request.headers.get('x-signature');
    const xRequestId = request.headers.get('x-request-id');

    // Validate signature
    const dataId = body?.data?.id?.toString() || '';
    if (!validateWebhookSignature(xSignature, xRequestId, dataId)) {
      console.error('[MP-Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Check if this is a payment notification
    if (body.type !== 'payment') {
      console.log('[MP-Webhook] Not a payment notification, ignoring');
      return NextResponse.json({ received: true });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      console.error('[MP-Webhook] Missing payment ID');
      return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 });
    }

    // Fetch full payment details from Mercado Pago
    const payment = await getPaymentDetails(paymentId);
    console.log('[MP-Webhook] Payment details:', JSON.stringify(payment, null, 2));

    // Extract metadata to determine payment type
    const metadata = payment.metadata || {};
    const paymentType = metadata.payment_type; // 'split' or 'bulk'
    const externalRef = payment.external_reference;

    if (payment.status === 'approved') {
      // Payment approved - update database
      if (paymentType === 'split') {
        await handleSplitPaymentApproved(payment, externalRef, metadata);
      } else if (paymentType === 'bulk') {
        await handleBulkPaymentApproved(payment, externalRef, metadata);
      } else {
        console.warn('[MP-Webhook] Unknown payment type:', paymentType);
      }
    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      // Payment failed - update status
      if (paymentType === 'split') {
        await markSplitPaymentFailed(externalRef, payment.status);
      } else if (paymentType === 'bulk') {
        await markBulkPaymentFailed(externalRef, payment.status);
      }
    } else if (payment.status === 'pending') {
      // Payment pending - optionally update status
      console.log('[MP-Webhook] Payment pending:', paymentId);
    }

    // Respond quickly with 200 OK
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[MP-Webhook] Error processing webhook:', error);
    // Still return 200 to avoid Mercado Pago retrying indefinitely
    return NextResponse.json(
      { error: 'Internal error', message: error.message },
      { status: 500 }
    );
  }
}

// =====================================================
// SPLIT PAYMENT HANDLERS
// =====================================================

async function handleSplitPaymentApproved(
  payment: any,
  externalRef: string,
  metadata: any
) {
  console.log('[MP-Webhook] Processing split payment approval:', externalRef);

  // Find the payment contribution by external reference
  const { data: contribution, error: fetchError } = await supabase
    .from('payment_contributions')
    .select('*')
    .eq('external_reference', externalRef)
    .single();

  if (fetchError || !contribution) {
    console.error('[MP-Webhook] Contribution not found:', externalRef, fetchError);
    return;
  }

  // Check if already processed
  if (contribution.status === 'approved') {
    console.log('[MP-Webhook] Contribution already approved, skipping');
    return;
  }

  // Update contribution status
  const { error: updateError } = await supabase
    .from('payment_contributions')
    .update({
      status: 'approved',
      mp_payment_id: payment.id.toString(),
      paid_at: payment.date_approved || new Date().toISOString(),
      raw_payment_data: payment,
    })
    .eq('id', contribution.id);

  if (updateError) {
    console.error('[MP-Webhook] Error updating contribution:', updateError);
    return;
  }

  console.log('[MP-Webhook] Split payment approved:', contribution.id);

  // Check if order is now fully paid
  await checkAndUpdateOrderStatus(contribution.order_id);
}

async function markSplitPaymentFailed(externalRef: string, status: string) {
  console.log('[MP-Webhook] Marking split payment as failed:', externalRef);

  const { error } = await supabase
    .from('payment_contributions')
    .update({ status: status === 'cancelled' ? 'cancelled' : 'rejected' })
    .eq('external_reference', externalRef);

  if (error) {
    console.error('[MP-Webhook] Error updating failed contribution:', error);
  }
}

// =====================================================
// BULK PAYMENT HANDLERS
// =====================================================

async function handleBulkPaymentApproved(
  payment: any,
  externalRef: string,
  metadata: any
) {
  console.log('[MP-Webhook] Processing bulk payment approval:', externalRef);

  // Find the bulk payment by external reference
  const { data: bulkPayment, error: fetchError } = await supabase
    .from('bulk_payments')
    .select('*')
    .eq('external_reference', externalRef)
    .single();

  if (fetchError || !bulkPayment) {
    console.error('[MP-Webhook] Bulk payment not found:', externalRef, fetchError);
    return;
  }

  // Check if already processed
  if (bulkPayment.status === 'approved') {
    console.log('[MP-Webhook] Bulk payment already approved, skipping');
    return;
  }

  // Update bulk payment status
  const { error: updateError } = await supabase
    .from('bulk_payments')
    .update({
      status: 'approved',
      mp_payment_id: payment.id.toString(),
      paid_at: payment.date_approved || new Date().toISOString(),
      raw_payment_data: payment,
    })
    .eq('id', bulkPayment.id);

  if (updateError) {
    console.error('[MP-Webhook] Error updating bulk payment:', updateError);
    return;
  }

  console.log('[MP-Webhook] Bulk payment approved:', bulkPayment.id);

  // Get all orders covered by this bulk payment
  const { data: orderLinks } = await supabase
    .from('bulk_payment_orders')
    .select('order_id')
    .eq('bulk_payment_id', bulkPayment.id);

  if (!orderLinks) return;

  // Mark all orders as paid
  for (const link of orderLinks) {
    await markOrderAsPaid(link.order_id);
  }
}

async function markBulkPaymentFailed(externalRef: string, status: string) {
  console.log('[MP-Webhook] Marking bulk payment as failed:', externalRef);

  const { error } = await supabase
    .from('bulk_payments')
    .update({ status: status === 'cancelled' ? 'cancelled' : 'rejected' })
    .eq('external_reference', externalRef);

  if (error) {
    console.error('[MP-Webhook] Error updating failed bulk payment:', error);
  }
}

// =====================================================
// ORDER STATUS HELPERS
// =====================================================

/**
 * Checks if an order is fully paid via contributions and updates its status
 */
async function checkAndUpdateOrderStatus(orderId: string) {
  // Get order total
  const { data: order } = await supabase
    .from('orders')
    .select('total_amount_cents, status')
    .eq('id', orderId)
    .single();

  if (!order) return;

  // Get sum of approved contributions
  const { data: contributions } = await supabase
    .from('payment_contributions')
    .select('amount_cents')
    .eq('order_id', orderId)
    .eq('status', 'approved');

  const totalPaid = (contributions || []).reduce(
    (sum, c) => sum + c.amount_cents,
    0
  );

  // If fully paid, update order status
  if (totalPaid >= order.total_amount_cents && order.status !== 'paid') {
    console.log('[MP-Webhook] Order fully paid via contributions:', orderId);
    await markOrderAsPaid(orderId);
  }
}

/**
 * Marks an order as paid
 */
async function markOrderAsPaid(orderId: string) {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', orderId);

  if (error) {
    console.error('[MP-Webhook] Error marking order as paid:', error);
    return;
  }

  console.log('[MP-Webhook] Order marked as paid:', orderId);
}
