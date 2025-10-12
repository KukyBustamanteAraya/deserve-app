// POST /api/mercadopago/webhook
// Receives payment notifications from Mercado Pago
import { NextRequest } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
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

    // TODO: Enable signature verification once webhook is properly configured in Mercado Pago
    // For now, we'll log but not enforce it to allow testing
    const shouldVerify = process.env.MP_WEBHOOK_SECRET && process.env.MP_WEBHOOK_SECRET !== 'deserve-webhook-secret-2024';

    if (shouldVerify && process.env.NODE_ENV === 'production') {
      if (!verifySignature(xSignature, xRequestId, data.id)) {
        logger.error('[Webhook] Signature verification failed for payment:', data.id);
        return new Response('Unauthorized', { status: 401 });
      }
      logger.info('[Webhook] Signature verified successfully');
    } else {
      logger.warn('[Webhook] Signature verification DISABLED - configure MP_WEBHOOK_SECRET in Mercado Pago dashboard');
    }

    const accessToken = process.env.MP_ACCESS_TOKEN!;
    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);
    const paymentData = await payment.get({ id: data.id });

    const externalReference = paymentData.external_reference;
    if (!externalReference) return new Response('OK', { status: 200 });

    const supabase = createSupabaseServer();
    const { data: contribution } = await supabase
      .from('payment_contributions')
      .select('id, order_id, payment_status')
      .eq('id', externalReference)
      .single();

    if (!contribution) return new Response('OK', { status: 200 });

    const statusMap: Record<string, string> = {
      'approved': 'approved',
      'rejected': 'rejected',
      'pending': 'pending',
      'in_process': 'pending',
      'cancelled': 'cancelled',
      'refunded': 'refunded'
    };

    const newStatus = statusMap[paymentData.status || 'pending'] || 'pending';

    if (contribution.payment_status !== newStatus) {
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

      await supabase
        .from('payment_contributions')
        .update(updateData)
        .eq('id', contribution.id);

      logger.info(`Updated contribution \${contribution.id} to \${newStatus}`);
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
