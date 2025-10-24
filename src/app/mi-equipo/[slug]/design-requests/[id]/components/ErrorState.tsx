'use client';

import React from 'react';

interface ErrorStateProps {
  error: string | null;
  onBack: () => void;
}

const ErrorState = React.memo<ErrorStateProps>(({ error, onBack }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Solicitud no encontrada</h1>
        <p className="text-gray-400 mb-6">{error}</p>
        <button
          onClick={onBack}
          className="text-[#e21c21] hover:text-[#c11a1e] font-medium"
        >
          ← Volver
        </button>
      </div>
    </div>
  );
});

ErrorState.displayName = 'ErrorState';

export default ErrorState;
