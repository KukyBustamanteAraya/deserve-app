import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { redirect } from 'next/navigation';
import CartClient from './CartClient';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

export default async function CartPage() {
  try {
    const supabase = await createSupabaseServer();
    const user = await requireAuth(supabase);

    // Get or create active cart
    const { data: cartId, error: cartError } = await supabase
      .rpc('get_or_create_active_cart');

    if (cartError) {
      logger.error('Error getting cart:', cartError);
      redirect('/catalog?error=cart_not_found');
    }

    // Get cart with items
    const { data: cart, error: fetchError } = await supabase
      .from('carts_with_items')
      .select('*')
      .eq('id', cartId)
      .single();

    if (fetchError) {
      logger.error('Error fetching cart details:', toError(fetchError));
      redirect('/catalog?error=cart_fetch_failed');
    }

    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Carrito de compras</h1>
            <p className="text-gray-600 mt-2">
              Revisa tus productos y procede al checkout
            </p>
          </div>

          <CartClient initialCart={cart} />
        </div>
      </main>
    );

  } catch (error) {
    logger.error('Cart page error:', toError(error));
    redirect('/login?redirect=/cart');
  }
}

export const metadata = {
  title: 'Carrito de compras | Deserve',
  description: 'Revisa y gestiona los productos en tu carrito de compras.',
};