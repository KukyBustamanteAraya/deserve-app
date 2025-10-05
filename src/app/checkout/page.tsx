import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { redirect } from 'next/navigation';
import CheckoutClient from './CheckoutClient';

export default async function CheckoutPage() {
  try {
    const supabase = createSupabaseServer();
    const user = await requireAuth(supabase);

    // Get active cart
    const { data: cartId, error: cartError } = await supabase
      .rpc('get_or_create_active_cart');

    if (cartError) {
      console.error('Error getting cart:', cartError);
      redirect('/cart?error=cart_not_found');
    }

    // Get cart with items
    const { data: cart, error: fetchError } = await supabase
      .from('carts_with_items')
      .select('*')
      .eq('id', cartId)
      .single();

    if (fetchError) {
      console.error('Error fetching cart details:', fetchError);
      redirect('/cart?error=cart_fetch_failed');
    }

    // Redirect if cart is empty
    if (!cart.items || cart.items.length === 0) {
      redirect('/cart?error=empty_cart');
    }

    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
            <p className="text-gray-600 mt-2">
              Revisa tu orden y completa la compra
            </p>
          </div>

          <CheckoutClient cart={cart} />
        </div>
      </main>
    );

  } catch (error) {
    console.error('Checkout page error:', error);
    redirect('/login?redirect=/checkout');
  }
}

export const metadata = {
  title: 'Checkout | Deserve',
  description: 'Completa tu compra en Deserve.',
};