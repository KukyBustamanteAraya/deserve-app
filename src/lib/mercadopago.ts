/**
 * Mercado Pago Integration Utilities
 * Handles payment preference creation, webhooks, and signature validation
 */

import { createHmac } from 'crypto';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { logger } from '@/lib/logger';

// Configure Mercado Pago SDK
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

// =====================================================
// TYPES
// =====================================================

export interface PaymentItem {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id: string;
  description?: string;
}

export interface PreferencePayload {
  items: PaymentItem[];
  payer: {
    email: string;
    name?: string;
    surname?: string;
  };
  external_reference: string;
  back_urls: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return?: 'approved' | 'all';
  notification_url?: string;
  metadata?: Record<string, any>;
}

export interface MercadoPagoPayment {
  id: number;
  status: 'approved' | 'pending' | 'rejected' | 'cancelled' | 'refunded';
  status_detail: string;
  transaction_amount: number;
  currency_id: string;
  external_reference: string;
  payer: {
    email: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  date_created: string;
  date_approved?: string;
  [key: string]: any;
}

// =====================================================
// PAYMENT PREFERENCE CREATION
// =====================================================

/**
 * Creates a Mercado Pago payment preference
 * Returns the preference ID and init_point URL for redirecting the user
 */
export async function createPaymentPreference(
  payload: PreferencePayload
): Promise<{ id: string; init_point: string; sandbox_init_point: string }> {
  try {
    logger.debug('[MercadoPago] Creating preference with payload:', JSON.stringify(payload, null, 2));

    const preference = new Preference(client);
    const response = await preference.create({ body: payload });

    logger.debug('[MercadoPago] Preference response:', JSON.stringify(response, null, 2));

    return {
      id: response.id!,
      init_point: response.init_point!,
      sandbox_init_point: response.sandbox_init_point || response.init_point!,
    };
  } catch (error: any) {
    logger.error('[MercadoPago] Error creating preference:', error);
    logger.error('[MercadoPago] Error details:', JSON.stringify(error, null, 2));
    logger.error('[MercadoPago] Error response:', error.response?.data || error.response);
    throw new Error(
      error.message || 'Failed to create Mercado Pago preference'
    );
  }
}

/**
 * Helper: Create a split-pay preference for a single player's contribution
 * @param amountClp - Amount in Chilean Pesos (full pesos, not cents)
 */
export async function createSplitPayPreference({
  orderId,
  userId,
  userEmail,
  userName,
  amountClp,
  orderDescription,
  externalReference,
}: {
  orderId: string;
  userId: string;
  userEmail: string;
  userName?: string;
  amountClp: number;
  orderDescription: string;
  externalReference: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const payload: PreferencePayload = {
    items: [
      {
        title: `${orderDescription} - Tu Parte`,
        quantity: 1,
        unit_price: amountClp, // CLP stored as full pesos - sent directly to MercadoPago
        currency_id: 'CLP',
        description: `Contribución individual para orden #${orderId}`,
      },
    ],
    payer: {
      email: userEmail,
      name: userName,
    },
    external_reference: externalReference,
    back_urls: {
      success: `${siteUrl}/payment/success?external_reference=${externalReference}`,
      failure: `${siteUrl}/payment/failure?external_reference=${externalReference}`,
      pending: `${siteUrl}/payment/pending?external_reference=${externalReference}`,
    },
    auto_return: 'approved',
    notification_url: `${siteUrl}/api/mercadopago/webhook`,
    metadata: {
      order_id: orderId,
      user_id: userId,
      payment_type: 'split',
    },
  };

  return createPaymentPreference(payload);
}

/**
 * Helper: Create a bulk payment preference for a manager paying multiple orders
 * @param orders - Array of orders with amountClp in Chilean Pesos (full pesos, not cents)
 */
export async function createBulkPayPreference({
  bulkPaymentId,
  userId,
  userEmail,
  userName,
  orders,
  externalReference,
}: {
  bulkPaymentId: string;
  userId: string;
  userEmail: string;
  userName?: string;
  orders: Array<{ id: string; description: string; amountClp: number }>;
  externalReference: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const items: PaymentItem[] = orders.map((order) => ({
    title: order.description,
    quantity: 1,
    unit_price: order.amountClp, // CLP stored as full pesos - sent directly to MercadoPago
    currency_id: 'CLP',
    description: `Orden completa #${order.id}`,
  }));

  const payload: PreferencePayload = {
    items,
    payer: {
      email: userEmail,
      name: userName,
    },
    external_reference: externalReference,
    back_urls: {
      success: `${siteUrl}/payment/success?external_reference=${externalReference}`,
      failure: `${siteUrl}/payment/failure?external_reference=${externalReference}`,
      pending: `${siteUrl}/payment/pending?external_reference=${externalReference}`,
    },
    auto_return: 'approved',
    notification_url: `${siteUrl}/api/mercadopago/webhook`,
    metadata: {
      bulk_payment_id: bulkPaymentId,
      user_id: userId,
      payment_type: 'bulk',
      order_ids: orders.map((o) => o.id),
    },
  };

  return createPaymentPreference(payload);
}

// =====================================================
// PAYMENT VERIFICATION
// =====================================================

/**
 * Fetches payment details from Mercado Pago by payment ID
 */
export async function getPaymentDetails(
  paymentId: string | number
): Promise<MercadoPagoPayment> {
  try {
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch payment: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    logger.error('[MercadoPago] Error fetching payment:', error);
    throw new Error(error.message || 'Failed to fetch payment details');
  }
}

// =====================================================
// WEBHOOK SIGNATURE VALIDATION
// =====================================================

/**
 * Validates the x-signature header from a Mercado Pago webhook
 * Returns true if the signature is valid, false otherwise
 */
export function validateWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string
): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;

  if (!secret || !xSignature || !xRequestId) {
    logger.warn('[MercadoPago] Missing signature validation params');
    return false;
  }

  try {
    // Parse x-signature header: "ts=<timestamp>,v1=<hmac>"
    const parts = xSignature.split(',');
    const tsPart = parts.find((p) => p.startsWith('ts='));
    const v1Part = parts.find((p) => p.startsWith('v1='));

    if (!tsPart || !v1Part) {
      logger.warn('[MercadoPago] Invalid signature format');
      return false;
    }

    const timestamp = tsPart.replace('ts=', '');
    const providedSignature = v1Part.replace('v1=', '');

    // Construct the message: id:<data_id>;request-id:<x_request_id>;ts:<timestamp>;
    const message = `id:${dataId};request-id:${xRequestId};ts:${timestamp};`;

    // Calculate expected signature
    const expectedSignature = createHmac('sha256', secret)
      .update(message)
      .digest('hex');

    // Compare
    const isValid = expectedSignature === providedSignature;

    if (!isValid) {
      logger.warn('[MercadoPago] Signature mismatch');
      logger.warn('Expected:', expectedSignature);
      logger.warn('Provided:', providedSignature);
    }

    return isValid;
  } catch (error) {
    logger.error('[MercadoPago] Error validating signature:', error);
    return false;
  }
}

// =====================================================
// HELPER UTILITIES
// =====================================================

/**
 * @deprecated CLP does not have cents! Amounts are already stored as full pesos.
 * This function is no longer needed and should not be used for CLP.
 * For USD/EUR with cents subdivision, use appropriate conversion.
 */
export function centsToMajorUnit(cents: number): number {
  console.warn('[MercadoPago] DEPRECATED: centsToMajorUnit() should not be used for CLP. CLP amounts are already full pesos.');
  return cents / 100;
}

/**
 * @deprecated CLP does not have cents! Amounts should be stored directly as full pesos.
 * This function is no longer needed and should not be used for CLP.
 * For USD/EUR with cents subdivision, use appropriate conversion.
 */
export function majorUnitToCents(pesos: number): number {
  console.warn('[MercadoPago] DEPRECATED: majorUnitToCents() should not be used for CLP. Store CLP amounts directly as full pesos.');
  return Math.round(pesos * 100);
}

/**
 * Generates a unique external reference for a payment
 */
export function generateExternalReference(
  type: 'split' | 'bulk',
  orderId: string,
  userId?: string
): string {
  const timestamp = Date.now();
  if (type === 'split' && userId) {
    return `split_${orderId}_${userId}_${timestamp}`;
  }
  return `bulk_${orderId}_${timestamp}`;
}
