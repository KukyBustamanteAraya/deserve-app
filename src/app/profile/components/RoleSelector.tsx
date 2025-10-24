'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';

interface RoleSelectorProps {
  onSelect: (userType: string) => void;
}

const USER_TYPES = [
  {
    value: 'player',
    label: 'Jugador/a',
    description: 'Atleta que participa en equipos deportivos',
    icon: '⚽',
  },
  {
    value: 'manager',
    label: 'Manager de Equipo',
    description: 'Encargado de gestionar uniformes para un equipo',
    icon: '👔',
  },
  {
    value: 'athletic_director',
    label: 'Director Deportivo',
    description: 'Administra múltiples equipos en una institución',
    icon: '🏛️',
  },
  {
    value: 'hybrid',
    label: 'Jugador y Manager',
    description: 'Juegas y también gestionas uniformes para tu equipo',
    icon: '⚽👔',
  },
];

export default function RoleSelector({ onSelect }: RoleSelectorProps) {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (userType: string) => {
    if (!user) {
      setError('No user logged in');
      return;
    }

    setSelectedType(userType);
    setLoading(true);
    setError(null);

    try {
      // Update the user's profile with selected user_type
      const { error: updateError } = await supabaseBrowser
        .from('profiles')
        .update({ user_type: userType })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Call the onSelect callback to move to next step
      onSelect(userType);
    } catch (err: any) {
      console.error('[RoleSelector] Error updating user type:', err);
      setError(err.message || 'Failed to update user type');
      setSelectedType(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="relative bg-gradient-to-br from-red-900/30 via-red-800/20 to-red-900/30 backdrop-blur-sm border border-red-500/50 rounded-lg p-4 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <p className="relative text-red-200 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {USER_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => handleSelect(type.value)}
            disabled={loading}
            className={`relative group p-6 rounded-lg border-2 transition-all text-left overflow-hidden ${
              selectedType === type.value
                ? 'border-blue-500 bg-blue-500/20'
                : 'border-gray-700 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md hover:border-blue-500/50'
            } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {/* Glass shine effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

            <div className="relative">
              <div className="text-4xl mb-3">{type.icon}</div>
              <h3 className="text-xl font-bold text-white mb-2">{type.label}</h3>
              <p className="text-sm text-gray-300">{type.description}</p>
            </div>

            {loading && selectedType === type.value && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-400 text-center mt-4">
        Selecciona el tipo que mejor describe tu rol. Podrás modificarlo después en configuración.
      </p>
    </div>
  );
}
