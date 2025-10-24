'use client';

import React from 'react';
import Image from 'next/image';
import { DesignMockup, DesignRequest, UserRole } from './types';

interface DesignMockupViewerProps {
  selectedMockup: DesignMockup | null;
  designRequest: DesignRequest;
  userRole: UserRole;
  actionLoading: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRevertApproval: () => void;
  onRevertProduction: () => void;
  onConfirmProduction: () => void;
  onRequestChanges: () => void;
  onBrowseDesigns: () => void;
  onMockupSelect: (mockup: DesignMockup) => void;
}

const DesignMockupViewer = React.memo<DesignMockupViewerProps>(({
  selectedMockup,
  designRequest,
  userRole,
  actionLoading,
  onApprove,
  onReject,
  onRevertApproval,
  onRevertProduction,
  onConfirmProduction,
  onRequestChanges,
  onBrowseDesigns,
  onMockupSelect,
}) => {
  // Combine admin-uploaded mockups and catalog mockups
  const adminMockups = (designRequest.mockup_urls || []).map((url, idx) => ({
    id: `admin-mockup-${idx}`,
    mockup_url: url,
    is_primary: idx === 0,
    view_angle: idx === 0 ? 'front' : `view-${idx}`,
    product_type_slug: 'custom'
  }));

  const catalogMockups = designRequest.designs?.design_mockups || [];
  const allMockups = [...adminMockups, ...catalogMockups];

  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
      <div className="aspect-square bg-gray-900 relative">
        {selectedMockup ? (
          <Image
            src={selectedMockup.mockup_url}
            alt={designRequest.designs?.name || 'Design'}
            fill
            sizes="(max-width: 1024px) 100vw, 66vw"
            className="object-contain"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <svg className="w-24 h-24 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500">No hay imagen disponible</p>
            </div>
          </div>
        )}

        {/* Approved Badge */}
        {userRole === 'athletic_director' && designRequest.status === 'approved' && (
          <button
            onClick={onRevertApproval}
            disabled={actionLoading}
            className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-green-600/95 hover:bg-green-700 disabled:bg-gray-600/90 backdrop-blur-sm text-white px-6 py-3 rounded-full shadow-2xl transition-all hover:scale-105 disabled:scale-100 flex items-center gap-2 z-10"
            title="Click para revertir aprobación"
          >
            {actionLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">Aprobado</span>
                <span className="text-xs opacity-75">(click para revertir)</span>
              </>
            )}
          </button>
        )}

        {/* Production Ready Badge */}
        {userRole === 'athletic_director' && designRequest.status === 'design_ready' && (
          <button
            onClick={onRevertProduction}
            disabled={actionLoading}
            className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-blue-600/95 hover:bg-blue-700 disabled:bg-gray-600/90 backdrop-blur-sm text-white px-6 py-3 rounded-full shadow-2xl transition-all hover:scale-105 disabled:scale-100 flex items-center gap-2 z-10"
            title="Click para revertir a Aprobado"
          >
            {actionLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold">Listo para Producción</span>
                <span className="text-xs opacity-75">(click para revertir)</span>
              </>
            )}
          </button>
        )}

        {/* Approve/Reject Buttons */}
        {userRole === 'athletic_director' &&
         (designRequest.status === 'ready' || designRequest.status === 'design_ready') &&
         selectedMockup?.id?.startsWith('admin-mockup-') && (
          <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-between items-end pointer-events-none">
            <button
              onClick={onApprove}
              disabled={actionLoading}
              className="pointer-events-auto group relative bg-green-600/90 hover:bg-green-600 disabled:bg-gray-600/90 backdrop-blur-sm text-white rounded-full p-4 shadow-2xl transition-all transform hover:scale-110 disabled:scale-100"
              title="Aprobar diseño"
            >
              {actionLoading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              ) : (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                Aprobar
              </span>
            </button>

            <button
              onClick={onReject}
              disabled={actionLoading}
              className="pointer-events-auto group relative bg-[#e21c21]/90 hover:bg-[#e21c21] disabled:bg-gray-600/90 backdrop-blur-sm text-white rounded-full p-4 shadow-2xl transition-all transform hover:scale-110 disabled:scale-100"
              title="Rechazar diseño"
            >
              {actionLoading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              ) : (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className="absolute bottom-full right-1/2 transform translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                Rechazar
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Mockup Thumbnails */}
      {allMockups.length > 1 && (
        <div className="p-4 border-t border-gray-700">
          <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
            {allMockups.map((mockup) => (
              <button
                key={mockup.id}
                onClick={() => onMockupSelect(mockup as DesignMockup)}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                  selectedMockup?.id === mockup.id
                    ? 'border-[#e21c21] shadow-lg'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <Image
                  src={mockup.mockup_url}
                  alt={mockup.view_angle}
                  fill
                  sizes="150px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Athletic Director Actions */}
      {userRole === 'athletic_director' && (
        <div className="p-6 border-t border-gray-700 bg-gray-900/30 space-y-3">
          {designRequest.status === 'approved' && (
            <button
              onClick={onConfirmProduction}
              disabled={actionLoading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3 shadow-lg"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Confirmar para Producción</span>
            </button>
          )}

          <button
            onClick={onRequestChanges}
            disabled={actionLoading}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3 shadow-lg"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Solicitar Ajustes</span>
          </button>

          <button
            onClick={onBrowseDesigns}
            disabled={actionLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3 shadow-lg"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <span>Explorar Otros Diseños</span>
          </button>
        </div>
      )}
    </div>
  );
});

DesignMockupViewer.displayName = 'DesignMockupViewer';

export default DesignMockupViewer;
