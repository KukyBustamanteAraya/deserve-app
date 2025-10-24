import { createSupabaseServer } from './supabase/server-client';

/**
 * Assign a manufacturer to an order
 *
 * @param orderId - UUID of the order
 * @param manufacturerId - BIGINT ID of the manufacturer
 * @returns Assignment record
 * @throws Error if order or manufacturer not found, or if already assigned
 */
export async function assignManufacturerToOrder(
  orderId: string, // UUID
  manufacturerId: number // BIGINT
) {
  const supabase = await createSupabaseServer();

  // Verify order exists
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    throw new Error(`Order ${orderId} not found`);
  }

  // Verify manufacturer exists
  const { data: manufacturer, error: mfgError } = await supabase
    .from('manufacturer_users')
    .select('id, email, company_name')
    .eq('id', manufacturerId)
    .single();

  if (mfgError || !manufacturer) {
    throw new Error(`Manufacturer ${manufacturerId} not found`);
  }

  // Create assignment
  const { data, error } = await supabase
    .from('manufacturer_order_assignments')
    .insert({
      manufacturer_id: manufacturerId,
      order_id: orderId
    })
    .select(`
      id,
      manufacturer_id,
      order_id,
      assigned_at,
      manufacturer_users(id, email, company_name),
      orders(id, status, total_cents)
    `)
    .single();

  if (error) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      throw new Error(`Order ${orderId} is already assigned to manufacturer ${manufacturerId}`);
    }
    throw error;
  }

  return data;
}

/**
 * Get manufacturer assignment for an order
 *
 * @param orderId - UUID of the order
 * @returns Assignment record or null if not assigned
 */
export async function getManufacturerForOrder(orderId: string) {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from('manufacturer_order_assignments')
    .select(`
      id,
      manufacturer_id,
      order_id,
      assigned_at,
      manufacturer_users(id, email, company_name)
    `)
    .eq('order_id', orderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No assignment found
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Get all orders assigned to a manufacturer
 *
 * @param manufacturerId - BIGINT ID of the manufacturer
 * @returns Array of order assignments
 */
export async function getOrdersForManufacturer(manufacturerId: number) {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from('manufacturer_order_assignments')
    .select(`
      id,
      manufacturer_id,
      order_id,
      assigned_at,
      orders(
        id,
        status,
        total_cents,
        currency,
        current_stage,
        production_start_date,
        estimated_delivery_date
      )
    `)
    .eq('manufacturer_id', manufacturerId)
    .order('assigned_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Unassign a manufacturer from an order
 *
 * @param orderId - UUID of the order
 * @returns True if unassigned, false if no assignment existed
 */
export async function unassignManufacturerFromOrder(orderId: string) {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from('manufacturer_order_assignments')
    .delete()
    .eq('order_id', orderId)
    .select();

  if (error) {
    throw error;
  }

  return data && data.length > 0;
}
