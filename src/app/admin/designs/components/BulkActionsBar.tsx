'use client';

import { memo } from 'react';

interface BulkActionsBarProps {
  selectedCount: number;
  isLoading: boolean;
  onClearSelection: () => void;
  onSetActive: () => void;
  onSetInactive: () => void;
  onDelete: () => void;
}

const BulkActionsBar = memo(function BulkActionsBar({
  selectedCount,
  isLoading,
  onClearSelection,
  onSetActive,
  onSetInactive,
  onDelete,
}: BulkActionsBarProps) {
  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-[#e21c21]/50 rounded-xl shadow-2xl p-3 sm:p-4 mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      <div className="flex items-center gap-3 sm:gap-4 relative">
        <span className="text-white font-medium text-sm sm:text-base">{selectedCount} selected</span>
        <button
          onClick={onClearSelection}
          className="text-gray-300 hover:text-white text-xs sm:text-sm transition-colors"
        >
          Clear selection
        </button>
      </div>
      <div className="flex items-center gap-2 relative flex-wrap">
        <button
          onClick={onSetActive}
          disabled={isLoading}
          className="relative px-4 py-2 bg-gradient-to-br from-green-500/90 via-green-600/80 to-green-700/90 backdrop-blur-md text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-green-500/30 hover:shadow-green-500/50 border border-green-500/50 overflow-hidden group/btn flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
          <svg className="w-4 h-4 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="relative">Set Active</span>
        </button>
        <button
          onClick={onSetInactive}
          disabled={isLoading}
          className="relative px-4 py-2 bg-gradient-to-br from-gray-600/90 via-gray-700/80 to-gray-800/90 backdrop-blur-md text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-gray-600/30 hover:shadow-gray-600/50 border border-gray-600/50 overflow-hidden group/btn flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
          <svg className="w-4 h-4 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <span className="relative">Set Inactive</span>
        </button>
        <button
          onClick={onDelete}
          disabled={isLoading}
          className="relative px-4 py-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-md text-red-400 hover:text-red-300 rounded-lg border border-gray-700/50 hover:border-red-500/50 transition-all text-sm font-semibold overflow-hidden group/btn flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
          <svg className="w-4 h-4 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="relative">Delete</span>
        </button>
      </div>
    </div>
  );
});

export default BulkActionsBar;
