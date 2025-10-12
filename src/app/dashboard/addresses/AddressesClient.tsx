'use client';

import { useState } from 'react';
import { ShippingAddressForm } from '@/components/shipping/ShippingAddressForm';
import { getBrowserClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

interface ShippingAddress {
  id: string;
  recipient_name: string;
  recipient_phone: string;
  street_address: string;
  address_line_2?: string;
  commune: string;
  city: string;
  region: string;
  postal_code?: string;
  is_default?: boolean;
  delivery_instructions?: string;
}

interface AddressesClientProps {
  userId: string;
  initialAddresses: ShippingAddress[];
}

export default function AddressesClient({ userId, initialAddresses }: AddressesClientProps) {
  const supabase = getBrowserClient();
  const [addresses, setAddresses] = useState<ShippingAddress[]>(initialAddresses);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAddNew = () => {
    setEditingAddress(null);
    setShowForm(true);
  };

  const handleEdit = (address: ShippingAddress) => {
    setEditingAddress(address);
    setShowForm(true);
  };

  const handleSaved = (savedAddress: ShippingAddress) => {
    if (editingAddress) {
      // Update existing
      setAddresses(addresses.map(a => a.id === savedAddress.id ? savedAddress : a));
    } else {
      // Add new
      setAddresses([savedAddress, ...addresses]);
    }
    setShowForm(false);
    setEditingAddress(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta dirección?')) return;

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('shipping_addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAddresses(addresses.filter(a => a.id !== id));
    } catch (error) {
      logger.error('Error deleting address:', error);
      alert('Error al eliminar la dirección');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const { error } = await supabase
        .from('shipping_addresses')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setAddresses(addresses.map(a => ({
        ...a,
        is_default: a.id === id
      })));
    } catch (error) {
      logger.error('Error setting default address:', error);
      alert('Error al establecer dirección predeterminada');
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New Button */}
      {!showForm && (
        <div className="flex justify-end">
          <button
            onClick={handleAddNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva dirección
          </button>
        </div>
      )}

      {/* Address Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingAddress ? 'Editar dirección' : 'Nueva dirección'}
          </h2>
          <ShippingAddressForm
            userId={userId}
            existingAddress={editingAddress || undefined}
            onSaved={handleSaved}
            onCancel={() => {
              setShowForm(false);
              setEditingAddress(null);
            }}
          />
        </div>
      )}

      {/* Address List */}
      {addresses.length === 0 && !showForm ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tienes direcciones guardadas
            </h3>
            <p className="text-gray-500 mb-6">
              Agrega una dirección de envío para facilitar tus compras
            </p>
            <button
              onClick={handleAddNew}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Agregar primera dirección
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">
                    {address.recipient_name}
                  </h3>
                  {address.is_default && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                      Predeterminada
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(address.id)}
                  disabled={deletingId === address.id}
                  className="text-red-600 hover:text-red-700 disabled:opacity-50"
                  title="Eliminar"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div className="space-y-1 text-sm text-gray-600 mb-4">
                <p>{address.street_address}</p>
                {address.address_line_2 && <p>{address.address_line_2}</p>}
                <p>{address.commune}, {address.city}</p>
                <p>{address.region}</p>
                {address.postal_code && <p>CP: {address.postal_code}</p>}
                <p className="text-gray-500">Tel: {address.recipient_phone}</p>
                {address.delivery_instructions && (
                  <p className="text-gray-500 italic mt-2">
                    Nota: {address.delivery_instructions}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={() => handleEdit(address)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm"
                >
                  Editar
                </button>
                {!address.is_default && (
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                  >
                    Marcar predeterminada
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
