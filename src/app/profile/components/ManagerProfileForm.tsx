'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';
import type { ManagerProfile } from '@/hooks/useProfile';

interface ManagerProfileFormProps {
  onComplete: () => void;
}

export default function ManagerProfileForm({ onComplete }: ManagerProfileFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<ManagerProfile>>({
    organization_name: '',
    role: '',
    department: '',
    phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('No user logged in');
      return;
    }

    if (!formData.organization_name) {
      setError('Por favor ingresa el nombre de tu organización');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Update profile with manager_profile data
      const { error: updateError } = await supabaseBrowser
        .from('profiles')
        .update({
          manager_profile: formData,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      onComplete();
    } catch (err: any) {
      console.error('[ManagerProfileForm] Error:', err);
      setError(err.message || 'Error al guardar el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="relative bg-gradient-to-br from-red-900/30 via-red-800/20 to-red-900/30 backdrop-blur-sm border border-red-500/50 rounded-lg p-4">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Organization Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Nombre de la Organización / Equipo *
        </label>
        <input
          type="text"
          value={formData.organization_name || ''}
          onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
          placeholder="Ej: Club Deportivo Universidad"
          required
          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
      </div>

      {/* Role */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Tu Cargo / Rol
        </label>
        <input
          type="text"
          value={formData.role || ''}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          placeholder="Ej: Manager, Director Deportivo, Entrenador"
          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
      </div>

      {/* Department */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Departamento / Área
        </label>
        <input
          type="text"
          value={formData.department || ''}
          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          placeholder="Ej: Deportes, Equipo de Fútbol"
          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Teléfono de Contacto
        </label>
        <input
          type="tel"
          value={formData.phone || ''}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="+56 9 1234 5678"
          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
        <p className="text-xs text-gray-400 mt-1">
          Para coordinar entregas y consultas sobre pedidos
        </p>
      </div>

      {/* Info Box */}
      <div className="relative bg-gradient-to-br from-blue-900/30 via-blue-800/20 to-blue-900/30 backdrop-blur-sm border border-blue-500/50 rounded-lg p-4 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <div className="relative">
          <p className="text-blue-200 text-sm">
            💡 Podrás agregar direcciones de envío y más información detallada después de completar este paso inicial.
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !formData.organization_name}
        className="w-full relative py-3 rounded-lg bg-gradient-to-br from-blue-600/90 via-blue-500/80 to-blue-700/90 text-white font-semibold transition-all shadow-lg hover:shadow-blue-500/50 border border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <span className="relative">
          {loading ? (
            <>
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
              Guardando...
            </>
          ) : (
            'Continuar'
          )}
        </span>
      </button>

      <p className="text-xs text-gray-400 text-center">
        Podrás actualizar esta información en cualquier momento desde tu perfil
      </p>
    </form>
  );
}
