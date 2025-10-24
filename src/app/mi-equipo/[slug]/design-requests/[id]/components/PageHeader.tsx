'use client';

import React from 'react';
import { DesignRequest } from './types';
import { getStatusColor, getStatusText } from './utils';

interface PageHeaderProps {
  designRequest: DesignRequest;
  onBack: () => void;
  onDelete: () => void;
}

const PageHeader = React.memo<PageHeaderProps>(({ designRequest, onBack, onDelete }) => {
  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

      <div className="relative">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-3xl font-bold text-white">
              Solicitud de Diseño #{designRequest.id}
            </h1>
            {!['approved', 'ready', 'design_ready'].includes(designRequest.status) && (
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(designRequest.status)}`}
              >
                {getStatusText(designRequest.status)}
              </span>
            )}
          </div>
          <button
            onClick={onDelete}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Eliminar solicitud"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        <div className="ml-10 flex items-center gap-6 text-gray-400">
          <span className="text-white font-semibold">
            {designRequest.institution_sub_teams?.name || designRequest.teams?.name || 'Equipo'}
          </span>
          <span>•</span>
          <span>
            {new Date(designRequest.created_at).toLocaleDateString('es-CL', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
      </div>
    </div>
  );
});

PageHeader.displayName = 'PageHeader';

export default PageHeader;
