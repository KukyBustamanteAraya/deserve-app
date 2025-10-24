'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Design } from './types';
import { getSportIcon } from './utils';

interface DesignCardListProps {
  design: Design;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onPreview: (design: Design) => void;
  onDelete: (design: Design) => void;
}

const DesignCardList = memo(function DesignCardList({
  design,
  isSelected,
  onToggleSelection,
  onPreview,
  onDelete,
}: DesignCardListProps) {
  return (
    <div
      className={`relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-xl shadow-2xl border overflow-hidden transition-all hover:shadow-2xl cursor-pointer flex group/card ${
        isSelected
          ? 'border-[#e21c21] ring-2 ring-[#e21c21]/50'
          : 'border-gray-700 hover:border-[#e21c21]/50'
      }`}
      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
      onClick={() => onPreview(design)}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none"></div>
      {/* Checkbox */}
      <div className="flex items-center p-2 sm:p-3 md:p-4 relative">
        <label className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelection(design.id)}
            className="w-4 h-4 sm:w-5 sm:h-5 rounded border-gray-600 text-[#e21c21] focus:ring-2 focus:ring-[#e21c21]/50 focus:ring-offset-0 bg-gray-700 cursor-pointer"
          />
        </label>
      </div>

      {/* Image */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gray-900 flex-shrink-0">
        {design.primary_mockup_url ? (
          <img src={design.primary_mockup_url} alt={design.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 p-2 sm:p-3 md:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
        <div className="flex-1 w-full sm:w-auto">
          <h3 className="font-bold text-sm sm:text-base md:text-lg text-white mb-1">{design.name}</h3>
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm text-gray-400 flex-wrap">
            <span>/{design.slug}</span>
            {design.available_sports && design.available_sports.length > 0 && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  {design.available_sports.map((sport) => (
                    <span key={sport} title={sport}>
                      {getSportIcon(sport)}
                    </span>
                  ))}
                </div>
              </>
            )}
            <span>•</span>
            <span>{design.mockup_count || 0} mockups</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 md:gap-4 w-full sm:w-auto">
          {/* Status & Featured Badges */}
          <div className="flex flex-row sm:flex-col gap-2 flex-wrap">
            <span
              className={`px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full ${
                design.active
                  ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                  : 'bg-gray-500/20 text-gray-300 border border-gray-500/50'
              }`}
            >
              {design.active ? 'Active' : 'Inactive'}
            </span>
            {design.featured && (
              <span className="px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/50">
                ★ Featured
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 relative">
            <Link
              href={`/admin/designs/${design.id}/edit`}
              className="relative p-1.5 sm:p-2 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group/btn"
              title="Edit"
              onClick={(e) => e.stopPropagation()}
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
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
    </div>
  );
});

export default DesignCardList;
