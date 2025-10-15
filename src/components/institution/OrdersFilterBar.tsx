'use client';

import { useState } from 'react';
import type { InstitutionOrder } from '@/lib/mockData/institutionData';

interface OrdersFilterBarProps {
  orders: InstitutionOrder[];
  onFilterChange: (filters: {
    status?: string;
    teamSlug?: string;
    sport?: string;
    dateRange?: { start: string; end: string };
    search?: string;
  }) => void;
}

export function OrdersFilterBar({ orders, onFilterChange }: OrdersFilterBarProps) {
  const [status, setStatus] = useState<string>('all');
  const [teamSlug, setTeamSlug] = useState<string>('all');
  const [sport, setSport] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Extract unique teams and sports from orders
  const uniqueTeams = Array.from(new Set(orders.map(o => ({ slug: o.teamSlug, name: o.teamName }))));
  const uniqueSports = Array.from(new Set(orders.map(o => o.sport)));

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    onFilterChange({ status: newStatus, teamSlug, sport, search });
  };

  const handleTeamChange = (newTeam: string) => {
    setTeamSlug(newTeam);
    onFilterChange({ status, teamSlug: newTeam, sport, search });
  };

  const handleSportChange = (newSport: string) => {
    setSport(newSport);
    onFilterChange({ status, teamSlug, sport: newSport, search });
  };

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
    onFilterChange({ status, teamSlug, sport, search: newSearch });
  };

  const handleExport = (format: 'pdf' | 'csv') => {
    alert(`Función: Exportar órdenes en formato ${format.toUpperCase()} (próximamente)`);
    setShowExportMenu(false);
  };

  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

      <div className="relative p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Left side - Filters */}
          <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Estado</label>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#e21c21]/50 transition-colors"
              >
                <option value="all">Todos</option>
                <option value="pending">Pendiente</option>
                <option value="paid">Pagado</option>
                <option value="shipped">Enviado</option>
                <option value="delivered">Entregado</option>
              </select>
            </div>

            {/* Team Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Equipo</label>
              <select
                value={teamSlug}
                onChange={(e) => handleTeamChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#e21c21]/50 transition-colors"
              >
                <option value="all">Todos</option>
                {uniqueTeams.map((team) => (
                  <option key={team.slug} value={team.slug}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sport Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Deporte</label>
              <select
                value={sport}
                onChange={(e) => handleSportChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#e21c21]/50 transition-colors"
              >
                <option value="all">Todos</option>
                {uniqueSports.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Buscar</label>
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Orden, equipo, coach..."
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#e21c21]/50 transition-colors"
              />
            </div>
          </div>

          {/* Right side - Export button */}
          <div className="flex items-end">
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="relative px-4 py-2 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white border border-[#e21c21]/50 rounded-lg font-medium overflow-hidden group/export transition-all hover:shadow-lg hover:shadow-[#e21c21]/30"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/export:opacity-100 transition-opacity pointer-events-none"></div>
                <div className="relative flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Exportar</span>
                </div>
              </button>

              {/* Export Menu Dropdown */}
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 overflow-hidden">
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 transition-colors"
                  >
                    Exportar como PDF
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 transition-colors"
                  >
                    Exportar como CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
