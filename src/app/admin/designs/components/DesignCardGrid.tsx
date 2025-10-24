'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Design } from './types';
import { getSportIcon } from './utils';

interface DesignCardGridProps {
  design: Design;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onPreview: (design: Design) => void;
  onDelete: (design: Design) => void;
}

const DesignCardGrid = memo(function DesignCardGrid({
  design,
  isSelected,
  onToggleSelection,
  onPreview,
  onDelete,
}: DesignCardGridProps) {
  return (
    <div
      className={`relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-xl shadow-2xl border overflow-hidden transition-all hover:shadow-2xl cursor-pointer group/card ${
        isSelected
          ? 'border-[#e21c21] ring-2 ring-[#e21c21]/50'
          : 'border-gray-700 hover:border-[#e21c21]/50'
      }`}
      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
      onClick={() => onPreview(design)}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none"></div>
      {/* Design Image */}
      <div className="relative aspect-square bg-gray-900 overflow-hidden">
        {/* Selection Checkbox */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
          <label className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelection(design.id)}
              className="w-4 h-4 sm:w-5 sm:h-5 rounded border-gray-600 text-[#e21c21] focus:ring-2 focus:ring-[#e21c21]/50 focus:ring-offset-0 bg-gray-700 cursor-pointer shadow-lg"
            />
          </label>
        </div>
        {design.primary_mockup_url ? (
          <img
            src={design.primary_mockup_url}
            alt={design.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            <svg className="w-12 h-12 sm:w-16 sm:h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex flex-col gap-1 sm:gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full backdrop-blur-sm ${
              design.active
                ? 'bg-green-500/90 text-white'
                : 'bg-gray-500/90 text-white'
            }`}
          >
            {design.active ? 'Active' : 'Inactive'}
          </span>
          {design.featured && (
            <span className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full backdrop-blur-sm bg-yellow-500/90 text-white">
              ★ Featured
            </span>
          )}
        </div>
      </div>

      {/* Design Info */}
      <div className="p-3 sm:p-4 md:p-5">
        <div className="mb-2 sm:mb-3">
          <h3 className="font-bold text-sm sm:text-base md:text-lg text-white mb-1 line-clamp-1">{design.name}</h3>
          <p className="text-xs sm:text-sm text-gray-400 line-clamp-1">/{design.slug}</p>
        </div>

        {/* Sport Icons */}
        {design.available_sports && design.available_sports.length > 0 && (
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm mb-2 sm:mb-3">
            {design.available_sports.map((sport) => (
              <span key={sport} className="text-base sm:text-lg" title={sport}>
                {getSportIcon(sport)}
              </span>
            ))}
            <span className="text-gray-500">·</span>
            <span className="text-gray-400">{design.mockup_count || 0} mockups</span>
          </div>
        )}

        {/* Color Scheme */}
        {design.color_scheme && design.color_scheme.length > 0 && (
          <div className="flex items-center gap-1 mb-2 sm:mb-3">
            {design.color_scheme.slice(0, 5).map((color, idx) => (
              <div
                key={idx}
                className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full border border-gray-600"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 pt-2 sm:pt-3 border-t border-gray-700 relative">
          <Link
            href={`/admin/designs/${design.id}/edit`}
            className="relative flex-1 p-1.5 sm:p-2 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg transition-all text-center text-xs sm:text-sm font-semibold shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group/btn"
            onClick={(e) => e.stopPropagation()}
            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
            <span className="relative">Edit</span>
          </Link>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(design);
            }}
            className="relative p-1.5 sm:p-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-md text-red-400 hover:text-red-300 rounded-lg border border-gray-700/50 hover:border-red-500/50 transition-all overflow-hidden group/btn"
            title="Delete"
            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});

export default DesignCardGrid;
