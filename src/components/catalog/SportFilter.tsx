'use client';

import React from 'react';
import type { Sport } from '@/types/catalog';

interface SportFilterProps {
  sports: Sport[];
  activeSlug: string | null;
  onChange: (slug: string | null) => void;
  className?: string;
}

export function SportFilter({ sports, activeSlug, onChange, className = '' }: SportFilterProps) {
  const allSports = [
    { id: 'all', slug: 'all', name: 'Todos', created_at: '' },
    ...sports,
  ];

  return (
    <div className={`w-full ${className}`}>
      {/* Desktop: Tabs */}
      <div className="hidden sm:block">
        <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg" aria-label="Sport filters">
          {allSports.map((sport) => (
            <button
              key={sport.slug}
              onClick={() => onChange(sport.slug === 'all' ? null : sport.slug)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                (activeSlug === null && sport.slug === 'all') || activeSlug === sport.slug
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-white'
              }`}
              type="button"
              aria-pressed={(activeSlug === null && sport.slug === 'all') || activeSlug === sport.slug}
            >
              {sport.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Mobile: Select dropdown */}
      <div className="block sm:hidden">
        <label htmlFor="sport-select" className="sr-only">
          Seleccionar deporte
        </label>
        <select
          id="sport-select"
          value={activeSlug || 'all'}
          onChange={(e) => onChange(e.target.value === 'all' ? null : e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 bg-white text-gray-900"
        >
          {allSports.map((sport) => (
            <option key={sport.slug} value={sport.slug}>
              {sport.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// Sport icons mapping for visual enhancement
export function getSportIcon(slug: string): string {
  const iconMap: Record<string, string> = {
    'all': '🏆',
    'soccer': '⚽',
    'basketball': '🏀',
    'volleyball': '🏐',
    'rugby': '🏉',
    'golf': '⛳',
  };
  return iconMap[slug] || '🏃';
}

// Enhanced version with icons
interface SportFilterWithIconsProps extends SportFilterProps {
  showIcons?: boolean;
}

export function SportFilterWithIcons({
  sports,
  activeSlug,
  onChange,
  className = '',
  showIcons = true
}: SportFilterWithIconsProps) {
  const allSports = [
    { id: 'all', slug: 'all', name: 'Todos', created_at: '' },
    ...sports,
  ];

  return (
    <div className={`w-full ${className}`}>
      {/* Desktop: Tabs with icons */}
      <div className="hidden sm:block">
        <nav className="flex flex-wrap gap-2 bg-gray-50 p-3 rounded-xl" aria-label="Sport filters">
          {allSports.map((sport) => (
            <button
              key={sport.slug}
              onClick={() => onChange(sport.slug === 'all' ? null : sport.slug)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                (activeSlug === null && sport.slug === 'all') || activeSlug === sport.slug
                  ? 'bg-red-600 text-white shadow-md transform scale-105'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-white hover:shadow-sm'
              }`}
              type="button"
              aria-pressed={(activeSlug === null && sport.slug === 'all') || activeSlug === sport.slug}
            >
              {showIcons && (
                <span className="text-lg" role="img" aria-hidden="true">
                  {getSportIcon(sport.slug)}
                </span>
              )}
              <span>{sport.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Mobile: Select dropdown with icons */}
      <div className="block sm:hidden">
        <label htmlFor="sport-select-icons" className="sr-only">
          Seleccionar deporte
        </label>
        <select
          id="sport-select-icons"
          value={activeSlug || 'all'}
          onChange={(e) => onChange(e.target.value === 'all' ? null : e.target.value)}
          className="block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 bg-white text-gray-900"
        >
          {allSports.map((sport) => (
            <option key={sport.slug} value={sport.slug}>
              {showIcons ? `${getSportIcon(sport.slug)} ${sport.name}` : sport.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}