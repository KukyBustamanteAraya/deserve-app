'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { ClientSummary } from '@/types/clients';
import ClientDetailModal from './ClientDetailModal';

interface ClientCardProps {
  client: ClientSummary;
}

export default function ClientCard({ client }: ClientCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString()}`;
  };

  const primaryColor = client.colors?.primary || '#e21c21';

  // Determine alert status
  const hasAlerts = client.unpaid_amount_cents > 0 || client.pending_design_requests > 0 || client.missing_player_info_count > 0;
  const isActive = client.active_orders > 0;
  const isInactive = client.total_orders === 0;

  const getAlertBadge = () => {
    if (hasAlerts) {
      return {
        text: 'NEEDS ATTENTION',
        color: 'bg-red-500/20 border-red-500/50 text-red-400',
        icon: (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      };
    }
    if (isActive) {
      return {
        text: 'ACTIVE',
        color: 'bg-green-500/20 border-green-500/50 text-green-400',
        icon: (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      };
    }
    if (isInactive) {
      return {
        text: 'NO ORDERS',
        color: 'bg-gray-500/20 border-gray-500/50 text-gray-400',
        icon: (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        )
      };
    }
    return null;
  };

  const badge = getAlertBadge();

  return (
    <>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setIsModalOpen(true)}
        className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-md border border-gray-700 rounded-xl overflow-hidden group hover:border-gray-600 transition-all cursor-pointer hover:shadow-2xl hover:shadow-[#e21c21]/10"
        style={{
          borderColor: isHovered ? `${primaryColor}40` : undefined,
        }}
      >
        {/* Hover gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

        <div className="relative p-4">
          {/* Compact Header */}
          <div className="flex items-start gap-3 mb-3">
            {/* Team Logo - Smaller */}
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{
                backgroundColor: `${primaryColor}20`,
                borderColor: `${primaryColor}40`,
                borderWidth: '2px',
              }}
            >
              {client.logo_url ? (
                <Image
                  src={client.logo_url}
                  alt={client.name}
                  width={48}
                  height={48}
                  className="object-contain w-full h-full"
                />
              ) : (
                <span
                  className="text-xl font-black"
                  style={{ color: primaryColor }}
                >
                  {client.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Name and Badge */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white truncate mb-1">
                {client.name}
              </h3>
              <p className="text-xs text-gray-400">{client.sport_name}</p>
            </div>

            {/* Alert Badge */}
            {badge && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border ${badge.color} flex-shrink-0`}>
                {badge.icon}
                <span className="hidden sm:inline">{badge.text}</span>
              </div>
            )}
          </div>

          {/* Alert Section - Only show if there are alerts */}
          {hasAlerts && (
            <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-semibold text-red-300">NEEDS ATTENTION</span>
              </div>
              <div className="space-y-1 text-xs">
                {client.unpaid_amount_cents > 0 && (
                  <div className="flex items-center gap-2 text-red-200">
                    <span className="text-red-400">•</span>
                    <span>Pending Payment: <span className="font-bold">{formatCurrency(client.unpaid_amount_cents)}</span></span>
                  </div>
                )}
                {client.pending_design_requests > 0 && (
                  <div className="flex items-center gap-2 text-red-200">
                    <span className="text-red-400">•</span>
                    <span>{client.pending_design_requests} Design{client.pending_design_requests > 1 ? 's' : ''} Awaiting Approval</span>
                  </div>
                )}
                {client.missing_player_info_count > 0 && (
                  <div className="flex items-center gap-2 text-red-200">
                    <span className="text-red-400">•</span>
                    <span>{client.missing_player_info_count} Order{client.missing_player_info_count > 1 ? 's' : ''} Missing Player Info</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active Orders - Always show if > 0 */}
          {client.active_orders > 0 && (
            <div className="mb-3 flex items-center justify-between p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <span className="text-xs text-blue-200 font-medium">Active Orders</span>
              </div>
              <span className="text-sm font-bold text-blue-300">{client.active_orders}</span>
            </div>
          )}

          {/* Quick Stats - Compact */}
          {client.total_orders > 0 && (
            <div className="text-xs text-gray-400">
              <span className="text-white font-semibold">{client.total_orders}</span> total orders
            </div>
          )}

          {/* Click indicator */}
          <div className="mt-3 pt-3 border-t border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
              Click for details
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <ClientDetailModal
        clientId={client.id}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
