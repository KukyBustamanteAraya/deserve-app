import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { redirect } from 'next/navigation';
import AddressesClient from './AddressesClient';
import { logger } from '@/lib/logger';

export default async function AddressesPage() {
  try {
    const supabase = createSupabaseServer();
    const user = await requireAuth(supabase);

    // Get user's shipping addresses
    const { data: addresses, error } = await supabase
      .from('shipping_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching addresses:', error);
    }

    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Direcciones de envío</h1>
            <p className="text-gray-600 mt-2">
              Administra tus direcciones de entrega
            </p>
          </div>

          <AddressesClient
            userId={user.id}
            initialAddresses={addresses || []}
          />
        </div>
      </main>
    );

  } catch (error) {
    logger.error('Addresses page error:', error);
    redirect('/login?redirect=/dashboard/addresses');
  }
}

export const metadata = {
  title: 'Direcciones de Envío | Deserve',
  description: 'Administra tus direcciones de entrega.',
};
