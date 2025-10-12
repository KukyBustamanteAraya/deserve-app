'use client';

import { useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

// Chilean regions
const CHILEAN_REGIONS = [
  'Región de Arica y Parinacota',
  'Región de Tarapacá',
  'Región de Antofagasta',
  'Región de Atacama',
  'Región de Coquimbo',
  'Región de Valparaíso',
  'Región Metropolitana de Santiago',
  'Región del Libertador Gral. Bernardo O\'Higgins',
  'Región del Maule',
  'Región de Ñuble',
  'Región del Biobío',
  'Región de La Araucanía',
  'Región de Los Ríos',
  'Región de Los Lagos',
  'Región de Aysén del Gral. Carlos Ibáñez del Campo',
  'Región de Magallanes y de la Antártica Chilena',
];

interface ShippingAddress {
  id?: string;
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

interface ShippingAddressFormProps {
  userId: string;
  teamId?: string;
  existingAddress?: ShippingAddress;
  onSaved?: (address: ShippingAddress) => void;
  onCancel?: () => void;
}

export function ShippingAddressForm({
  userId,
  teamId,
  existingAddress,
  onSaved,
  onCancel,
}: ShippingAddressFormProps) {
  const supabase = getBrowserClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ShippingAddress>(
    existingAddress || {
      recipient_name: '',
      recipient_phone: '',
      street_address: '',
      address_line_2: '',
      commune: '',
      city: '',
      region: '',
      postal_code: '',
      is_default: false,
      delivery_instructions: '',
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const addressData = {
        ...formData,
        user_id: userId,
        team_id: teamId || null,
      };

      let savedAddress;

      if (existingAddress?.id) {
        // Update existing
        const { data, error } = await supabase
          .from('shipping_addresses')
          .update(addressData)
          .eq('id', existingAddress.id)
          .select()
          .single();

        if (error) throw error;
        savedAddress = data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('shipping_addresses')
          .insert(addressData)
          .select()
          .single();

        if (error) throw error;
        savedAddress = data;
      }

      onSaved?.(savedAddress);
    } catch (err: any) {
      logger.error('Error saving address:', err);
      setError(err.message || 'Error al guardar la dirección');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Recipient Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del destinatario <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.recipient_name}
            onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Juan Pérez"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            required
            value={formData.recipient_phone}
            onChange={(e) => setFormData({ ...formData, recipient_phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="+56 9 1234 5678"
          />
        </div>
      </div>

      {/* Street Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dirección <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={formData.street_address}
          onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Av. Libertador Bernardo O'Higgins 1234"
        />
      </div>

      {/* Address Line 2 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Depto / Oficina (opcional)
        </label>
        <input
          type="text"
          value={formData.address_line_2 || ''}
          onChange={(e) => setFormData({ ...formData, address_line_2: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Depto 302"
        />
      </div>

      {/* Location */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comuna <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.commune}
            onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Santiago Centro"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ciudad <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Santiago"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Código Postal (opcional)
          </label>
          <input
            type="text"
            value={formData.postal_code || ''}
            onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="8320000"
          />
        </div>
      </div>

      {/* Region */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Región <span className="text-red-500">*</span>
        </label>
        <select
          required
          value={formData.region}
          onChange={(e) => setFormData({ ...formData, region: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Selecciona una región</option>
          {CHILEAN_REGIONS.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
      </div>

      {/* Delivery Instructions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Instrucciones de entrega (opcional)
        </label>
        <textarea
          value={formData.delivery_instructions || ''}
          onChange={(e) => setFormData({ ...formData, delivery_instructions: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Ej: Timbre portería, entregar en conserjería, etc."
        />
      </div>

      {/* Default Address */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="is_default"
          checked={formData.is_default || false}
          onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="is_default" className="ml-2 text-sm text-gray-700">
          Usar como dirección predeterminada
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {loading ? 'Guardando...' : existingAddress ? 'Actualizar Dirección' : 'Guardar Dirección'}
        </button>
      </div>
    </form>
  );
}
