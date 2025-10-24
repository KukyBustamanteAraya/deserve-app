'use client';

import { useState } from 'react';
import { ManagerProfile, OrganizationType, ShippingAddress } from '@/types/profile';

interface ManagerProfileFormProps {
  initialData: ManagerProfile;
  onSave: (data: Partial<ManagerProfile>) => Promise<void>;
  disabled?: boolean;
}

export default function ManagerProfileForm({ initialData, onSave, disabled = false }: ManagerProfileFormProps) {
  const [formData, setFormData] = useState<Partial<ManagerProfile>>({
    organization_name: initialData.organization_name || '',
    organization_type: initialData.organization_type,
    shipping_addresses: initialData.shipping_addresses || [],
    billing_info: {
      tax_id: initialData.billing_info?.tax_id || '',
      billing_email: initialData.billing_info?.billing_email || '',
    },
    primary_contact: {
      name: initialData.primary_contact?.name || '',
      phone: initialData.primary_contact?.phone || '',
      email: initialData.primary_contact?.email || '',
    },
  });

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState<Partial<ShippingAddress>>({
    label: '',
    street: '',
    city: '',
    region: '',
    postal_code: '',
    country: 'Chile',
    is_primary: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || loading) return;

    setLoading(true);
    setSaved(false);

    try {
      await onSave(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving manager profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = () => {
    if (!newAddress.label || !newAddress.street || !newAddress.city || !newAddress.region) {
      alert('Por favor completa todos los campos requeridos de la dirección');
      return;
    }

    const addresses = formData.shipping_addresses || [];

    // If this is set as primary, remove primary flag from others
    const updatedAddresses = newAddress.is_primary
      ? addresses.map(addr => ({ ...addr, is_primary: false }))
      : addresses;

    setFormData({
      ...formData,
      shipping_addresses: [...updatedAddresses, newAddress as ShippingAddress],
    });

    // Reset form
    setNewAddress({
      label: '',
      street: '',
      city: '',
      region: '',
      postal_code: '',
      country: 'Chile',
      is_primary: false,
    });
    setShowAddressForm(false);
  };

  const handleRemoveAddress = (index: number) => {
    const addresses = formData.shipping_addresses || [];
    setFormData({
      ...formData,
      shipping_addresses: addresses.filter((_, i) => i !== index),
    });
  };

  const handleSetPrimaryAddress = (index: number) => {
    const addresses = formData.shipping_addresses || [];
    setFormData({
      ...formData,
      shipping_addresses: addresses.map((addr, i) => ({
        ...addr,
        is_primary: i === index,
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          Perfil de Manager
        </h3>
        <p className="text-sm text-gray-300 mb-6">
          Información de tu organización y direcciones de envío
        </p>
      </div>

      {/* Organization Info */}
      <div className="space-y-4">
        <div>
          <label htmlFor="org-name" className="block text-sm font-medium text-white mb-2">
            Nombre de la Organización *
          </label>
          <input
            id="org-name"
            type="text"
            required
            value={formData.organization_name || ''}
            onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
            placeholder="Ej: Club Deportivo Universitario"
            disabled={disabled}
            className="relative w-full px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="org-type" className="block text-sm font-medium text-white mb-2">
            Tipo de Organización
          </label>
          <select
            id="org-type"
            value={formData.organization_type || ''}
            onChange={(e) => setFormData({ ...formData, organization_type: e.target.value as OrganizationType })}
            disabled={disabled}
            className="relative w-full px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 disabled:opacity-50"
          >
            <option value="">Seleccionar...</option>
            <option value="school">Colegio</option>
            <option value="club">Club Deportivo</option>
            <option value="university">Universidad</option>
            <option value="pro">Profesional</option>
            <option value="other">Otro</option>
          </select>
        </div>
      </div>

      {/* Primary Contact */}
      <div>
        <h4 className="text-base font-semibold text-white mb-3">Contacto Principal</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="contact-name" className="block text-sm text-gray-300 mb-1">
              Nombre
            </label>
            <input
              id="contact-name"
              type="text"
              value={formData.primary_contact?.name || ''}
              onChange={(e) => setFormData({
                ...formData,
                primary_contact: { ...formData.primary_contact, name: e.target.value },
              })}
              disabled={disabled}
              className="relative w-full px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="contact-phone" className="block text-sm text-gray-300 mb-1">
              Teléfono
            </label>
            <input
              id="contact-phone"
              type="tel"
              value={formData.primary_contact?.phone || ''}
              onChange={(e) => setFormData({
                ...formData,
                primary_contact: { ...formData.primary_contact, phone: e.target.value },
              })}
              disabled={disabled}
              className="relative w-full px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="contact-email" className="block text-sm text-gray-300 mb-1">
              Email
            </label>
            <input
              id="contact-email"
              type="email"
              value={formData.primary_contact?.email || ''}
              onChange={(e) => setFormData({
                ...formData,
                primary_contact: { ...formData.primary_contact, email: e.target.value },
              })}
              disabled={disabled}
              className="relative w-full px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Billing Info */}
      <div>
        <h4 className="text-base font-semibold text-white mb-3">Información de Facturación</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tax-id" className="block text-sm text-gray-300 mb-1">
              RUT / Tax ID
            </label>
            <input
              id="tax-id"
              type="text"
              value={formData.billing_info?.tax_id || ''}
              onChange={(e) => setFormData({
                ...formData,
                billing_info: { ...formData.billing_info, tax_id: e.target.value },
              })}
              placeholder="12.345.678-9"
              disabled={disabled}
              className="relative w-full px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="billing-email" className="block text-sm text-gray-300 mb-1">
              Email de Facturación
            </label>
            <input
              id="billing-email"
              type="email"
              value={formData.billing_info?.billing_email || ''}
              onChange={(e) => setFormData({
                ...formData,
                billing_info: { ...formData.billing_info, billing_email: e.target.value },
              })}
              disabled={disabled}
              className="relative w-full px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Shipping Addresses */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-base font-semibold text-white">Direcciones de Envío</h4>
          <button
            type="button"
            onClick={() => setShowAddressForm(!showAddressForm)}
            disabled={disabled}
            className="relative px-3 py-1 text-sm bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white rounded-md hover:shadow-lg hover:shadow-[#e21c21]/30 disabled:opacity-50 transition-all"
          >
            {showAddressForm ? 'Cancelar' : 'Agregar Dirección'}
          </button>
        </div>

        {/* Existing addresses */}
        <div className="space-y-3 mb-4">
          {formData.shipping_addresses?.map((address, index) => (
            <div key={index} className="relative p-4 border border-gray-700 rounded-md bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 overflow-hidden group">
              <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <div className="flex items-start justify-between relative">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">{address.label}</span>
                    {address.is_primary && (
                      <span className="px-2 py-0.5 text-xs bg-gradient-to-br from-[#e21c21]/20 to-[#a01519]/20 text-[#e21c21] border border-[#e21c21]/50 rounded-full">
                        Principal
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-300">
                    {address.street}, {address.city}, {address.region}
                    {address.postal_code && `, ${address.postal_code}`}
                  </p>
                  <p className="text-sm text-gray-400">{address.country}</p>
                </div>
                <div className="flex gap-2">
                  {!address.is_primary && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimaryAddress(index)}
                      disabled={disabled}
                      className="text-sm text-[#e21c21] hover:text-[#c11a1e] transition-colors"
                    >
                      Hacer principal
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveAddress(index)}
                    disabled={disabled}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    Eliminar
                    </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add address form */}
        {showAddressForm && (
          <div className="relative p-4 border border-[#e21c21]/30 rounded-md bg-gradient-to-br from-[#e21c21]/10 via-[#c11a1e]/5 to-[#a01519]/10 space-y-3 overflow-hidden group">
            <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <input
              type="text"
              value={newAddress.label || ''}
              onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
              placeholder="Etiqueta (ej: Oficina Principal)"
              className="relative w-full px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50"
            />
            <input
              type="text"
              value={newAddress.street || ''}
              onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
              placeholder="Calle y número"
              className="relative w-full px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={newAddress.city || ''}
                onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                placeholder="Ciudad"
                className="relative w-full px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50"
              />
              <input
                type="text"
                value={newAddress.region || ''}
                onChange={(e) => setNewAddress({ ...newAddress, region: e.target.value })}
                placeholder="Región"
                className="relative w-full px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={newAddress.postal_code || ''}
                onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                placeholder="Código Postal (opcional)"
                className="relative w-full px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50"
              />
              <input
                type="text"
                value={newAddress.country || 'Chile'}
                onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
                placeholder="País"
                className="relative w-full px-3 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50"
              />
            </div>
            <label className="flex items-center gap-2 relative">
              <input
                type="checkbox"
                checked={newAddress.is_primary || false}
                onChange={(e) => setNewAddress({ ...newAddress, is_primary: e.target.checked })}
                className="w-4 h-4 text-[#e21c21] bg-gray-700 border-gray-600 rounded focus:ring-[#e21c21]/50 focus:ring-2"
              />
              <span className="text-sm text-gray-300">Establecer como dirección principal</span>
            </label>
            <button
              type="button"
              onClick={handleAddAddress}
              className="relative w-full px-4 py-2 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white rounded-md font-medium hover:shadow-lg hover:shadow-[#e21c21]/30 transition-all"
            >
              Guardar Dirección
            </button>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
        <div>
          {saved && (
            <span className="text-sm text-green-400 flex items-center">
              <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Guardado correctamente
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={disabled || loading}
          className="relative px-6 py-2 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white rounded-md font-medium hover:shadow-lg hover:shadow-[#e21c21]/30 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Guardando...' : 'Guardar Perfil de Manager'}
        </button>
      </div>
    </form>
  );
}
