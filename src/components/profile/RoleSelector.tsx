'use client';

import { useState } from 'react';
import { UserType } from '@/types/profile';

interface RoleSelectorProps {
  currentRole: UserType | null;
  onRoleSelect: (role: UserType) => Promise<void>;
  disabled?: boolean;
}

const roles = [
  {
    value: 'player' as UserType,
    title: 'Jugador',
    description: 'Atleta que usa uniformes y equipamiento deportivo',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    value: 'manager' as UserType,
    title: 'Manager',
    description: 'Encargado de gestionar pedidos para un equipo',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    value: 'athletic_director' as UserType,
    title: 'Director Atlético',
    description: 'Administrador de múltiples equipos o institución',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    value: 'hybrid' as UserType,
    title: 'Híbrido',
    description: 'Combino roles de jugador y gestor/director',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
];

export default function RoleSelector({ currentRole, onRoleSelect, disabled = false }: RoleSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserType | null>(currentRole);

  const handleRoleSelect = async (role: UserType) => {
    if (disabled || loading) return;

    setLoading(true);
    setSelectedRole(role);

    try {
      await onRoleSelect(role);
    } catch (error) {
      console.error('Error selecting role:', error);
      setSelectedRole(currentRole); // Revert on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Tipo de Usuario
        </h3>
        <p className="text-sm text-gray-300">
          Selecciona el tipo de usuario que mejor describe tu rol
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {roles.map((role) => {
          const isSelected = selectedRole === role.value;
          const isCurrentRole = currentRole === role.value;

          return (
            <button
              key={role.value}
              onClick={() => handleRoleSelect(role.value)}
              disabled={disabled || loading}
              className={`
                relative p-6 rounded-lg border-2 transition-all duration-200 overflow-hidden group/card
                ${isSelected
                  ? 'border-[#e21c21] bg-gradient-to-br from-[#e21c21]/20 via-[#c11a1e]/10 to-[#a01519]/20 ring-2 ring-[#e21c21]/30'
                  : 'border-gray-700 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 hover:border-[#e21c21]/50 hover:shadow-lg hover:shadow-[#e21c21]/20'
                }
                ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:ring-offset-2 focus:ring-offset-gray-900
              `}
              aria-pressed={isSelected}
              aria-label={`Seleccionar rol: ${role.title}`}
            >
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none"></div>

              {isCurrentRole && (
                <div className="absolute top-2 right-2 z-10">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/50">
                    Actual
                  </span>
                </div>
              )}

              <div className={`
                relative flex flex-col items-center text-center space-y-3
                ${isSelected ? 'text-[#e21c21]' : 'text-gray-300'}
              `}>
                <div className={`
                  p-3 rounded-full transition-colors
                  ${isSelected ? 'bg-[#e21c21]/20' : 'bg-gray-700/50'}
                `}>
                  {role.icon}
                </div>

                <div>
                  <h4 className="font-semibold text-base mb-1 text-white">
                    {role.title}
                  </h4>
                  <p className="text-sm text-gray-400">
                    {role.description}
                  </p>
                </div>

                {isSelected && (
                  <div className="absolute bottom-2 right-2">
                    <svg className="w-5 h-5 text-[#e21c21]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              {loading && isSelected && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e21c21]"></div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedRole && (
        <div className="relative mt-4 p-4 bg-gradient-to-br from-[#e21c21]/10 via-[#c11a1e]/5 to-[#a01519]/10 rounded-lg border border-[#e21c21]/30 overflow-hidden group/note">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/note:opacity-100 transition-opacity pointer-events-none"></div>
          <p className="text-sm text-gray-300 relative">
            <strong className="text-[#e21c21]">Nota:</strong> Tu selección determina qué información de perfil deberás completar.
            {selectedRole === 'player' && ' Como jugador, podrás guardar tus tallas y preferencias.'}
            {selectedRole === 'manager' && ' Como manager, podrás gestionar información de tu equipo y direcciones de envío.'}
            {selectedRole === 'athletic_director' && ' Como director atlético, tendrás acceso a funciones avanzadas de administración.'}
            {selectedRole === 'hybrid' && ' Como usuario híbrido, tendrás acceso a funciones de jugador y gestor.'}
          </p>
        </div>
      )}
    </div>
  );
}
