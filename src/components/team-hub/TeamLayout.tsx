'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import type { TeamWithDetails, RoleType } from '@/types/team-hub';
import { getRoleDisplayName, getRoleBadgeColor } from '@/lib/permissions';

interface TeamLayoutProps {
  team: TeamWithDetails;
  currentSection: 'dashboard' | 'design' | 'roster' | 'orders' | 'activity';
  currentUserRole: RoleType;
  isAdminMode?: boolean;
  children: ReactNode;
}

export function TeamLayout({
  team,
  currentSection,
  currentUserRole,
  isAdminMode = false,
  children,
}: TeamLayoutProps) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', href: `/teams/${team.slug}/dashboard` },
    { id: 'design', label: 'Design', icon: '🎨', href: `/teams/${team.slug}/design` },
    { id: 'roster', label: 'Roster', icon: '👥', href: `/teams/${team.slug}/roster` },
    { id: 'orders', label: 'Orders', icon: '📦', href: `/teams/${team.slug}/orders` },
    { id: 'activity', label: 'Activity', icon: '📋', href: `/teams/${team.slug}/activity` },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Team Header */}
      <div
        className="relative"
        style={{
          background: `linear-gradient(135deg, ${team.colors.primary} 0%, ${team.colors.secondary} 100%)`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            {/* Team Info */}
            <div className="flex items-center gap-4">
              {team.logo_url && (
                <img
                  src={team.logo_url}
                  alt={team.name}
                  className="w-16 h-16 rounded-lg bg-white p-2 shadow-lg"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold text-white">{team.name}</h1>
                <p className="text-white/80 mt-1">
                  {team.sport.charAt(0).toUpperCase() + team.sport.slice(1)}
                </p>
              </div>
            </div>

            {/* User Role Badge */}
            <div className="flex items-center gap-3">
              {isAdminMode && (
                <span className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded-full">
                  🛡️ Admin Assist Mode
                </span>
              )}
              <span className={`px-3 py-1 ${getRoleBadgeColor(currentUserRole)} text-sm font-medium rounded-full`}>
                {getRoleDisplayName(currentUserRole)}
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-8 flex gap-2 border-b border-white/20">
            {tabs.map((tab) => {
              const isActive = tab.id === currentSection;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`
                    px-4 py-3 font-medium text-sm rounded-t-lg transition-colors
                    ${isActive
                      ? 'bg-white text-gray-900'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                    }
                  `}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  );
}
