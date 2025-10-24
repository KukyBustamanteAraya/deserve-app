'use client';

import React from 'react';
import { DesignRequest } from './types';

interface DesignInfoProps {
  designRequest: DesignRequest;
}

const DesignInfo = React.memo<DesignInfoProps>(({ designRequest }) => {
  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

      <div className="relative space-y-4">
        <h2 className="text-xl font-bold text-white mb-4">Detalles del Diseño</h2>

        <div>
          <p className="text-sm text-gray-400 mb-1">Nombre del Diseño</p>
          <p className="text-white font-semibold">
            {designRequest.designs?.name || 'Diseño Personalizado'}
          </p>
        </div>

        {designRequest.designs?.designer_name && (
          <div>
            <p className="text-sm text-gray-400 mb-1">Diseñador</p>
            <p className="text-white">{designRequest.designs.designer_name}</p>
          </div>
        )}

        {designRequest.designs?.description && (
          <div>
            <p className="text-sm text-gray-400 mb-1">Descripción</p>
            <p className="text-white text-sm">{designRequest.designs.description}</p>
          </div>
        )}
      </div>
    </div>
  );
});

DesignInfo.displayName = 'DesignInfo';

export default DesignInfo;
