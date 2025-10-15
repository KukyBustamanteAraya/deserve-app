'use client';

import { useRouter } from 'next/navigation';

interface QuickActionsBarProps {
  institutionSlug: string;
}

export function QuickActionsBar({ institutionSlug }: QuickActionsBarProps) {
  const router = useRouter();

  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

      <div className="relative">
        <h2 className="text-lg font-bold text-white mb-4">Acciones Rápidas</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Create Team Button */}
          <button
            onClick={() => {
              // TODO: Navigate to create team page
              alert('Función: Crear Nuevo Equipo (próximamente)');
            }}
            className="relative px-6 py-4 bg-gradient-to-br from-blue-600/90 via-blue-700/80 to-blue-800/90 text-white rounded-lg font-medium overflow-hidden group/btn border border-blue-600/50 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 transition-all"
            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="relative flex items-center justify-center gap-2">
              <span className="text-xl">+</span>
              <span>Crear Equipo</span>
            </div>
          </button>

          {/* View All Orders Button */}
          <button
            onClick={() => {
              router.push(`/mi-equipo/${institutionSlug}/orders`);
            }}
            className="relative px-6 py-4 bg-gradient-to-br from-purple-600/90 via-purple-700/80 to-purple-800/90 text-white rounded-lg font-medium overflow-hidden group/btn border border-purple-600/50 shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 transition-all"
            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="relative flex items-center justify-center gap-2">
              <span className="text-xl">📋</span>
              <span>Ver Todas las Órdenes</span>
            </div>
          </button>

          {/* Finance Report Button */}
          <button
            onClick={() => {
              router.push(`/mi-equipo/${institutionSlug}/finance`);
            }}
            className="relative px-6 py-4 bg-gradient-to-br from-green-600/90 via-green-700/80 to-green-800/90 text-white rounded-lg font-medium overflow-hidden group/btn border border-green-600/50 shadow-lg shadow-green-600/30 hover:shadow-green-600/50 transition-all"
            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="relative flex items-center justify-center gap-2">
              <span className="text-xl">💰</span>
              <span>Reporte Financiero</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
