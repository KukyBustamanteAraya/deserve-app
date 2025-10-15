'use client';

import type { InstitutionStats } from '@/lib/mockData/institutionData';

interface InstitutionStatsCardsProps {
  stats: InstitutionStats;
}

export function InstitutionStatsCards({ stats }: InstitutionStatsCardsProps) {
  const paymentPercentage = (stats.paymentCollected / stats.paymentTotal) * 100;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {/* Active Orders Card */}
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-3 md:p-4 border border-gray-700 overflow-hidden group hover:border-blue-500/50 transition-all">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <div className="relative">
          <div className="text-[10px] md:text-xs text-gray-400 mb-1">Órdenes Activas</div>
          <div className="text-xl md:text-2xl font-bold text-blue-400">{stats.activeOrders}</div>
          <div className="text-[10px] md:text-xs text-gray-500 mt-0.5">en progreso</div>
        </div>
      </div>

      {/* Pending Approvals Card */}
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-3 md:p-4 border border-gray-700 overflow-hidden group hover:border-yellow-500/50 transition-all">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <div className="relative">
          <div className="text-[10px] md:text-xs text-gray-400 mb-1">Falta Aprobar</div>
          <div className="text-xl md:text-2xl font-bold text-yellow-400">{stats.pendingApprovals}</div>
          <div className="text-[10px] md:text-xs text-gray-500 mt-0.5">diseños</div>
        </div>
      </div>

      {/* Incomplete Orders Card */}
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-3 md:p-4 border border-gray-700 overflow-hidden group hover:border-orange-500/50 transition-all">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <div className="relative">
          <div className="text-[10px] md:text-xs text-gray-400 mb-1 whitespace-nowrap">Falta Información</div>
          <div className="text-xl md:text-2xl font-bold text-orange-400">{stats.incompleteOrders}</div>
          <div className="text-[10px] md:text-xs text-gray-500 mt-0.5">órdenes</div>
        </div>
      </div>

      {/* Payment Status Card */}
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-3 md:p-4 border border-gray-700 overflow-hidden group hover:border-green-500/50 transition-all">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <div className="relative">
          <div className="text-[10px] md:text-xs text-gray-400 mb-1">Pagos</div>
          <div className="text-base md:text-xl font-bold text-white truncate">
            ${(stats.paymentCollected / 100).toLocaleString('es-CL')}
          </div>
          <div className="text-[10px] md:text-xs text-gray-400 mt-0.5 truncate">
            de ${(stats.paymentTotal / 100).toLocaleString('es-CL')} • <span className="text-green-400">{paymentPercentage.toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
