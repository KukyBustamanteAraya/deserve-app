// POST /api/payments/create-payment
// Unified payment endpoint - handles both split and bulk payments
import { NextRequest } from 'next/server';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import { apiSuccess, apiError, apiUnauthorized, apiValidationError } from '@/lib/api-response';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { z } from 'zod';

const createPaymentSchema = z.object({
  orderId: z.string().uuid(),
  userId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  description: z.string().min(1).max(255)
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();

    // Require authentication
    const user = await requireAuth(supabase);

    // Parse and validate request body
    const body = await request.json();
    const validation = createPaymentSchema.safeParse(body);

    if (!validation.success) {
      return apiValidationError(validation.error.issues[0].message);
    }

    const { orderId, userId, amountCents, description } = validation.data;

    // Verify user matches authenticated user
    if (userId !== user.id) {
      return apiError('User ID mismatch', 403);
    }

    // ========================================================================
    // STEP 1: Verify order exists and user has access
    // ========================================================================

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, team_id, total_amount_clp, payment_status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      logger.error('Order not found:', orderError);
      return apiError('Order not found', 404);
    }

    // Verify user is team member
    const { data: membership } = await supabase
      .from('team_memberships')
      .select('role')
      .eq('team_id', order.team_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return apiError('You are not a member of this team', 403);
    }

    // Check if order is already paid
    if (order.payment_status === 'paid') {
      return apiError('Order is already fully paid', 400);
    }

    // ========================================================================
    // STEP 2: Create payment contribution record
    // ========================================================================

    const { data: contribution, error: contributionError } = await supabase
      .from('payment_contributions')
      .insert({
        order_id: orderId,
        user_id: userId,
        team_id: order.team_id,
        amount_clp: amountCents, // amountCents param is actually CLP pesos (naming is legacy)
        currency: 'CLP',
        status: 'pending',
        payment_status: 'pending'
      })
      .select('id')
      .single();

    if (contributionError || !contribution) {
      logger.error('Error creating payment contribution:', contributionError);
      return apiError('Failed to create payment record', 500);
    }

    logger.info(`Created payment contribution ${contribution.id} for user ${userId}, amount ${amountCents}`);

    // ========================================================================
    // STEP 3: Create Mercado Pago preference
    // ========================================================================

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    if (!accessToken) {
      logger.error('MERCADOPAGO_ACCESS_TOKEN not configured');
      return apiError('Payment system not configured', 500);
    }

    const client = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 5000 }
    });

    const preference = new Preference(client);

    try {
      const response = await preference.create({
        body: {
          items: [{
            id: orderId,
            title: description,
            quantity: 1,
            unit_price: amountCents, // CLP has no cents subdivision - value is already in pesos
            currency_id: 'CLP'
          }],
          external_reference: contribution.id, // Link back to our payment_contribution
          back_urls: {
            success: `${baseUrl}/payments/success?contribution_id=${contribution.id}`,
            failure: `${baseUrl}/payments/failure?contribution_id=${contribution.id}`,
            pending: `${baseUrl}/payments/pending?contribution_id=${contribution.id}`
          },
          auto_return: 'approved',
          notification_url: `${baseUrl}/api/mercadopago/webhook`,
          statement_descriptor: 'DESERVE',
          payment_methods: {
            installments: 1 // No installments for now
          }
        }
      });

      // Store Mercado Pago preference ID
      const { error: updateError } = await supabase
        .from('payment_contributions')
        .update({
          mp_preference_id: response.id,
          external_reference: contribution.id
        })
        .eq('id', contribution.id);

      if (updateError) {
        logger.error('Error updating contribution with preference ID:', toSupabaseError(updateError));
      }

      logger.info(`Created Mercado Pago preference ${response.id} for contribution ${contribution.id}`);

      return apiSuccess({
        contributionId: contribution.id,
        paymentUrl: response.init_point, // Mercado Pago checkout URL
        preferenceId: response.id,
        amountCents
      }, 'Payment link created successfully');

    } catch (mpError: any) {
      logger.error('Mercado Pago API error:', mpError);

      // Delete the contribution since MP preference creation failed
      await supabase
        .from('payment_contributions')
        .delete()
        .eq('id', contribution.id);

      return apiError(`Payment gateway error: ${mpError.message}`, 500);
    }

  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return apiUnauthorized();
    }

    logger.error('Unexpected error in create payment:', toError(error));
    return apiError('Internal server error');
  }
}
