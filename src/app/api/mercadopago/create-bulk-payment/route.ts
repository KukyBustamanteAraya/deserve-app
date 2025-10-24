/**
 * API Route: Create Bulk Payment Preference
 * Creates a Mercado Pago preference for a manager to pay for multiple full orders at once
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import {
  createBulkPayPreference,
  generateExternalReference,
} from '@/lib/mercadopago';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderIds, userId } = body;

    // Validate inputs
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid orderIds array' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Get user details
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (userError || !userData?.email) {
      return NextResponse.json(
        { error: 'User not found or missing email' },
        { status: 404 }
      );
    }

    // Get all orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, total_amount_clp, status, team_id')
      .in('id', orderIds);

    if (ordersError || !orders || orders.length === 0) {
      return NextResponse.json(
        { error: 'No valid orders found' },
        { status: 404 }
      );
    }

    // Validate all orders are unpaid
    const paidOrders = orders.filter((o) => o.status === 'paid');
    if (paidOrders.length > 0) {
      return NextResponse.json(
        {
          error: 'Some orders are already paid',
          paidOrderIds: paidOrders.map((o) => o.id),
        },
        { status: 400 }
      );
    }

    // Calculate total amount
    const totalAmountClp = orders.reduce(
      (sum, o) => sum + o.total_amount_clp,
      0
    );

    if (totalAmountClp <= 0) {
      return NextResponse.json(
        { error: 'Total amount must be greater than zero' },
        { status: 400 }
      );
    }

    // Create bulk payment record
    const { data: bulkPayment, error: bulkError } = await supabase
      .from('bulk_payments')
      .insert({
        user_id: userId,
        total_amount_clp: totalAmountClp,
        currency: 'CLP',
        status: 'pending',
      })
      .select()
      .single();

    if (bulkError || !bulkPayment) {
      logger.error('[Bulk-Payment] Error creating bulk payment', toSupabaseError(bulkError));
      return NextResponse.json(
        { error: 'Failed to create bulk payment record' },
        { status: 500 }
      );
    }

    // Generate external reference
    const externalReference = generateExternalReference(
      'bulk',
      bulkPayment.id
    );

    // Update bulk payment with external reference
    await supabase
      .from('bulk_payments')
      .update({ external_reference: externalReference })
      .eq('id', bulkPayment.id);

    // Link orders to bulk payment
    const orderLinks = orders.map((order) => ({
      bulk_payment_id: bulkPayment.id,
      order_id: order.id,
    }));

    const { error: linkError } = await supabase
      .from('bulk_payment_orders')
      .insert(orderLinks);

    if (linkError) {
      logger.error('[Bulk-Payment] Error linking orders:', toError(linkError));
      // Clean up bulk payment if linking fails
      await supabase.from('bulk_payments').delete().eq('id', bulkPayment.id);
      return NextResponse.json(
        { error: 'Failed to link orders to payment' },
        { status: 500 }
      );
    }

    // Prepare order items for Mercado Pago
    const mpOrders = orders.map((order) => ({
      id: order.id,
      description: `Orden de Equipo #${order.id.slice(0, 8)}`,
      amountClp: order.total_amount_clp,
    }));

    // Create Mercado Pago preference
    const preference = await createBulkPayPreference({
      bulkPaymentId: bulkPayment.id,
      userId,
      userEmail: userData.email,
      userName: userData.full_name || undefined,
      orders: mpOrders,
      externalReference,
    });

    // Update bulk payment with preference ID
    await supabase
      .from('bulk_payments')
      .update({ mp_preference_id: preference.id })
      .eq('id', bulkPayment.id);

    // Return preference details
    return NextResponse.json({
      success: true,
      bulkPaymentId: bulkPayment.id,
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
      totalAmountClp,
      orderCount: orders.length,
    });
  } catch (error: any) {
    logger.error('[Bulk-Payment] Error:', toError(error));
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
