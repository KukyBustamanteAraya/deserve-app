'use client';

import React from 'react';
import Image from 'next/image';

interface DesignBrowserModalProps {
  isOpen: boolean;
  loading: boolean;
  actionLoading: boolean;
  designs: any[];
  onClose: () => void;
  onDesignSelect: (designId: string) => void;
}

const DesignBrowserModal = React.memo<DesignBrowserModalProps>(({
  isOpen,
  loading,
  actionLoading,
  designs,
  onClose,
  onDesignSelect,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="relative bg-gradient-to-br from-gray-800 via-black to-gray-900 rounded-lg shadow-2xl border border-gray-700 max-w-6xl w-full p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Explorar Diseños</h2>
          <button
            onClick={onClose}
            disabled={actionLoading}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e21c21]"></div>
          </div>
        ) : designs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No hay diseños disponibles para este deporte.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[600px] overflow-y-auto">
            {designs.map((design) => {
              const primaryMockup = design.design_mockups?.find((m: any) => m.is_primary) || design.design_mockups?.[0];

              return (
                <div
                  key={design.id}
                  className="relative bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700 hover:border-[#e21c21] transition-colors group cursor-pointer"
                  onClick={() => {
                    if (window.confirm(`¿Cambiar al diseño "${design.name}"? Esto reemplazará el diseño actual y el admin deberá crear nuevos mockups.`)) {
                      onDesignSelect(design.id);
                    }
                  }}
                >
                  <div className="aspect-square bg-gray-900 relative">
                    {primaryMockup ? (
                      <Image
                        src={primaryMockup.mockup_url}
                        alt={design.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-16 h-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-[#e21c21]/0 group-hover:bg-[#e21c21]/20 transition-colors flex items-center justify-center">
                      <button className="opacity-0 group-hover:opacity-100 bg-[#e21c21] text-white px-6 py-3 rounded-lg font-semibold transition-opacity">
                        Usar Este Diseño
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="text-white font-semibold mb-1">{design.name}</h3>
                    {design.designer_name && (
                      <p className="text-gray-400 text-sm">por {design.designer_name}</p>
                    )}
                    {design.description && (
                      <p className="text-gray-500 text-sm mt-2 line-clamp-2">{design.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

DesignBrowserModal.displayName = 'DesignBrowserModal';

export default DesignBrowserModal;
