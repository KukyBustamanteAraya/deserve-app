import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { redirect } from 'next/navigation';
import CheckoutClient from './CheckoutClient';
import { logger } from '@/lib/logger';

export default async function CheckoutPage() {
  try {
    const supabase = createSupabaseServer();
    const user = await requireAuth(supabase);

    // Get active cart
    const { data: cartId, error: cartError} = await supabase
      .rpc('get_or_create_active_cart');

    if (cartError) {
      logger.error('Error getting cart:', cartError);
      redirect('/cart?error=cart_not_found');
    }

    // Get cart with items
    const { data: cart, error: fetchError } = await supabase
      .from('carts_with_items')
      .select('*')
      .eq('id', cartId)
      .single();

    if (fetchError) {
      logger.error('Error fetching cart details:', fetchError);
      redirect('/cart?error=cart_fetch_failed');
    }

    // Redirect if cart is empty
    if (!cart.items || cart.items.length === 0) {
      redirect('/cart?error=empty_cart');
    }

    // Get user's shipping addresses
    const { data: shippingAddresses } = await supabase
      .from('shipping_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
            <p className="text-gray-600 mt-2">
              Revisa tu orden y completa la compra
            </p>
          </div>

          <CheckoutClient
            cart={cart}
            userId={user.id}
            shippingAddresses={shippingAddresses || []}
          />
        </div>
      </main>
    );

  } catch (error) {
    logger.error('Checkout page error:', error);
    redirect('/login?redirect=/checkout');
  }
}

export const metadata = {
  title: 'Checkout | Deserve',
  description: 'Completa tu compra en Deserve.',
};