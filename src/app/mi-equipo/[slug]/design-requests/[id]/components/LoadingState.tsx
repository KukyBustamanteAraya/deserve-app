'use client';

import React from 'react';

const LoadingState = React.memo(() => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e21c21] mx-auto mb-4"></div>
        <p className="text-gray-300">Cargando solicitud de diseño...</p>
      </div>
    </div>
  );
});

LoadingState.displayName = 'LoadingState';

export default LoadingState;
