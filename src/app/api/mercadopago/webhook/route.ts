// POST /api/mercadopago/webhook
// Receives payment notifications from Mercado Pago
import { NextRequest } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import crypto from 'crypto';

/**
 * Verify Mercado Pago webhook signature
 */
function verifySignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string
): boolean {
  if (!xSignature || !xRequestId) {
    logger.warn('[Webhook] Missing signature or request-id headers');
    return false;
  }

  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    logger.error('[Webhook] MP_WEBHOOK_SECRET not configured');
    return false;
  }

  const parts = xSignature.split(',');
  const ts = parts.find(p => p.startsWith('ts='))?.split('=')[1];
  const hash = parts.find(p => p.startsWith('v1='))?.split('=')[1];

  if (!ts || !hash) {
    logger.warn('[Webhook] Invalid signature format:', xSignature);
    return false;
  }

  const template = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(template);
  const calculatedHash = hmac.digest('hex');

  const isValid = calculatedHash === hash;
  if (!isValid) {
    logger.warn('[Webhook] Signature mismatch:', {
      template,
      expected: hash,
      calculated: calculatedHash
    });
  }

  return isValid;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    logger.info('MP webhook:', JSON.stringify(body));

    const { data, type } = body;
    if (type !== 'payment' || !data?.id) {
      return new Response('OK', { status: 200 });
    }

    const xSignature = request.headers.get('x-signature');
    const xRequestId = request.headers.get('x-request-id');

    // Verify webhook signature in production for security
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.MP_WEBHOOK_SECRET) {
        logger.error('[Webhook] MP_WEBHOOK_SECRET not configured');
        return new Response('Unauthorized', { status: 401 });
      }

      if (!verifySignature(xSignature, xRequestId, data.id)) {
        logger.error('[Webhook] Signature verification failed for payment:', data.id);
        return new Response('Unauthorized', { status: 401 });
      }

      logger.info('[Webhook] Signature verified successfully');
    } else {
      logger.info('[Webhook] Skipping signature verification in development');
    }

    const accessToken = process.env.MP_ACCESS_TOKEN!;
    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);
    const paymentData = await payment.get({ id: data.id });

    const externalReference = paymentData.external_reference;
    logger.info('[Webhook] External reference from MP:', externalReference);

    if (!externalReference) {
      logger.warn('[Webhook] No external reference in payment data');
      return new Response('OK', { status: 200 });
    }

    // Use service client to bypass RLS - webhooks are unauthenticated server-to-server calls
    logger.info('[Webhook] Creating service client to query database');
    const supabase = createSupabaseServiceClient();

    logger.info('[Webhook] Querying payment_contributions for external_reference:', externalReference);
    const { data: contribution, error: queryError } = await supabase
      .from('payment_contributions')
      .select('id, order_id, payment_status')
      .eq('external_reference', externalReference)
      .single();

    if (queryError) {
      logger.error('[Webhook] Database query error:', queryError);
    }

    if (!contribution) {
      logger.warn('[Webhook] Payment contribution not found for external_reference:', externalReference);
      return new Response('OK', { status: 200 });
    }

    logger.info('[Webhook] Found contribution:', { id: contribution.id, current_status: contribution.payment_status });

    const statusMap: Record<string, string> = {
      'approved': 'approved',
      'rejected': 'rejected',
      'pending': 'pending',
      'in_process': 'pending',
      'cancelled': 'cancelled',
      'refunded': 'refunded'
    };

    const newStatus = statusMap[paymentData.status || 'pending'] || 'pending';
    logger.info('[Webhook] MP payment status:', paymentData.status, '-> mapped to:', newStatus);

    if (contribution.payment_status !== newStatus) {
      logger.info('[Webhook] Status changed, updating contribution:', contribution.id);

      const updateData: any = {
        payment_status: newStatus,
        status: newStatus,
        mp_payment_id: paymentData.id.toString(),
        payment_method: paymentData.payment_method_id || null,
        raw_payment_data: paymentData
      };

      if (newStatus === 'approved') {
        updateData.paid_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('payment_contributions')
        .update(updateData)
        .eq('id', contribution.id);

      if (updateError) {
        logger.error('[Webhook] Failed to update contribution:', updateError);
      } else {
        logger.info(`[Webhook] ✅ Successfully updated contribution ${contribution.id} to ${newStatus}`);
      }
    } else {
      logger.info('[Webhook] Status unchanged, skipping update');
    }

    if (newStatus === 'approved') {
      const { data: allContributions } = await supabase
        .from('payment_contributions')
        .select('amount_cents, payment_status')
        .eq('order_id', contribution.order_id);

      const totalPaid = allContributions
        ?.filter(c => c.payment_status === 'approved')
        .reduce((sum, c) => sum + c.amount_cents, 0) || 0;

      const { data: order } = await supabase
        .from('orders')
        .select('total_amount_cents, payment_status')
        .eq('id', contribution.order_id)
        .single();

      if (order) {
        const newOrderStatus = totalPaid >= order.total_amount_cents ? 'paid'
          : totalPaid > 0 ? 'partial' : 'unpaid';

        if (order.payment_status !== newOrderStatus) {
          await supabase
            .from('orders')
            .update({ payment_status: newOrderStatus })
            .eq('id', contribution.order_id);
        }
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error: any) {
    logger.error('Webhook error:', error);
    return new Response('Error', { status: 500 });
  }
}
