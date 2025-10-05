import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const OrderStatusUpdateSchema = z.object({
  status: z.enum(['paid', 'cancelled'])
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await requireAdmin();
    const body = await request.json();

    const validatedData = OrderStatusUpdateSchema.parse(body);
    const supabase = createSupabaseServer();

    // Get current order with user info
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        total_cents,
        created_at,
        user_id,
        profiles!inner (
          id,
          email
        )
      `)
      .eq('id', params.id)
      .single();

    if (fetchError || !currentOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Enforce valid status transitions (from pending only)
    if (currentOrder.status !== 'pending') {
      return NextResponse.json(
        {
          error: `Cannot change order status from "${currentOrder.status}". Only pending orders can be updated.`
        },
        { status: 400 }
      );
    }

    // Update the order status
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ status: validatedData.status })
      .eq('id', params.id)
      .select(`
        id,
        user_id,
        status,
        currency,
        subtotal_cents,
        total_cents,
        notes,
        created_at,
        profiles!inner (
          id,
          email
        )
      `)
      .single();

    if (updateError) {
      console.error('Order update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update order status' },
        { status: 500 }
      );
    }

    // Create audit log
    await supabase.from('admin_audit_logs').insert({
      actor_id: user.id,
      action: 'order.status.update',
      entity: 'orders',
      entity_id: params.id,
      payload: {
        orderId: params.id,
        oldStatus: currentOrder.status,
        newStatus: validatedData.status,
        userId: currentOrder.user_id,
        totalCents: currentOrder.total_cents
      }
    });

    // Invalidate admin orders cache
    revalidatePath('/admin/orders');

    return NextResponse.json({
      order: updatedOrder,
      message: `Order status updated to ${validatedData.status}`
    }, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Admin order status update error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}