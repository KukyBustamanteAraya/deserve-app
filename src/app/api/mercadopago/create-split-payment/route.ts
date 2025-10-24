/**
 * API Route: Create Split Payment Preference
 * Creates a Mercado Pago preference for a player's individual contribution to an order
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import {
  createSplitPayPreference,
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
    const { orderId, userId, amountClp } = body;

    // Validate inputs
    if (!orderId || !userId || !amountClp) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, userId, amountClp' },
        { status: 400 }
      );
    }

    if (amountClp <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than zero' },
        { status: 400 }
      );
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total_amount_clp, status, team_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if order is already paid
    if (order.status === 'paid') {
      return NextResponse.json(
        { error: 'Order is already paid' },
        { status: 400 }
      );
    }

    // Get user details - try profiles first, fall back to auth.users
    let userData = null;
    const { data: profileData } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (profileData?.email) {
      userData = profileData;
    } else {
      // Fall back to auth.users
      const { data: authData } = await supabase.auth.admin.getUserById(userId);
      if (authData?.user?.email) {
        userData = {
          email: authData.user.email,
          full_name: authData.user.user_metadata?.full_name || null,
        };
      }
    }

    if (!userData?.email) {
      return NextResponse.json(
        { error: 'User not found or missing email' },
        { status: 404 }
      );
    }

    // Generate unique external reference
    const externalReference = generateExternalReference('split', orderId, userId);

    // Check if a contribution already exists for this user+order
    const { data: existing } = await supabase
      .from('payment_contributions')
      .select('id, status')
      .eq('order_id', orderId)
      .eq('user_id', userId)
      .eq('status', 'approved')
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'You have already paid for this order' },
        { status: 400 }
      );
    }

    // Create payment contribution record
    const { data: contribution, error: contributionError } = await supabase
      .from('payment_contributions')
      .insert({
        order_id: orderId,
        user_id: userId,
        team_id: order.team_id,
        amount_clp: amountClp,
        currency: 'CLP',
        status: 'pending',
        external_reference: externalReference,
      })
      .select()
      .single();

    if (contributionError || !contribution) {
      logger.error('[Split-Payment] Error creating contribution', toSupabaseError(contributionError));
      return NextResponse.json(
        { error: 'Failed to create payment record' },
        { status: 500 }
      );
    }

    // Create Mercado Pago preference
    const preference = await createSplitPayPreference({
      orderId,
      userId,
      userEmail: userData.email,
      userName: userData.full_name || undefined,
      amountClp,
      orderDescription: `Orden de Equipo #${orderId.slice(0, 8)}`,
      externalReference,
    });

    // Update contribution with preference ID
    await supabase
      .from('payment_contributions')
      .update({ mp_preference_id: preference.id })
      .eq('id', contribution.id);

    // Return preference details
    return NextResponse.json({
      success: true,
      contributionId: contribution.id,
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
    });
  } catch (error: any) {
    logger.error('[Split-Payment] Error:', toError(error));
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
