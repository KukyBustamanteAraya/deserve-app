'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Design } from './types';
import { getSportIcon } from './utils';

interface DesignPreviewModalProps {
  design: Design;
  onClose: () => void;
  onDelete: (design: Design) => void;
}

const DesignPreviewModal = memo(function DesignPreviewModal({
  design,
  onClose,
  onDelete,
}: DesignPreviewModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-white">{design.name}</h2>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-full ${
                  design.active
                    ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                    : 'bg-gray-500/20 text-gray-300 border border-gray-500/50'
                }`}
              >
                {design.active ? 'Active' : 'Inactive'}
              </span>
              {design.featured && (
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/50">
                  ★ Featured
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image */}
            <div className="aspect-square bg-gray-900 rounded-xl overflow-hidden border border-gray-700">
              {design.primary_mockup_url ? (
                <img
                  src={design.primary_mockup_url}
                  alt={design.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Slug</label>
                <div className="text-gray-300 font-mono text-sm bg-gray-800 px-3 py-2 rounded border border-gray-700">
                  /{design.slug}
                </div>
              </div>

              {design.description && (
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Description</label>
                  <div className="text-white bg-gray-800 px-3 py-2 rounded border border-gray-700">
                    {design.description}
                  </div>
                </div>
              )}

              {design.designer_name && (
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Designer</label>
                  <div className="text-white bg-gray-800 px-3 py-2 rounded border border-gray-700">
                    {design.designer_name}
                  </div>
                </div>
              )}

              {design.available_sports && design.available_sports.length > 0 && (
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Available Sports</label>
                  <div className="flex items-center gap-2">
                    {design.available_sports.map((sport) => (
                      <span
                        key={sport}
                        className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                      >
                        {getSportIcon(sport)} {sport}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {design.style_tags && design.style_tags.length > 0 && (
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Style Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {design.style_tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-[#e21c21]/20 border border-[#e21c21]/50 rounded-full text-[#e21c21] text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {design.color_scheme && design.color_scheme.length > 0 && (
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Color Scheme</label>
                  <div className="flex items-center gap-2">
                    {design.color_scheme.map((color, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-1">
                        <div
                          className="w-10 h-10 rounded-full border-2 border-gray-600"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs text-gray-400">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm text-gray-400 block mb-1">Mockups</label>
                <div className="text-white bg-gray-800 px-3 py-2 rounded border border-gray-700">
                  {design.mockup_count || 0} mockup{design.mockup_count !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-700 relative">
                <Link
                  href={`/admin/designs/${design.id}/edit`}
                  className="relative flex-1 px-4 py-3 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg font-semibold transition-all text-center flex items-center justify-center gap-2 shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group/btn"
                  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                  <svg className="w-5 h-5 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="relative">Edit</span>
                </Link>
                <button
                  onClick={() => {
                    onDelete(design);
                    onClose();
                  }}
                  className="relative px-4 py-3 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-md text-red-400 hover:text-red-300 rounded-lg border border-gray-700/50 hover:border-red-500/50 transition-all font-semibold flex items-center justify-center gap-2 overflow-hidden group/btn"
                  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                  <svg className="w-5 h-5 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="relative">Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default DesignPreviewModal;
