'use client';

import React from 'react';

const TrustStatements = () => {
  const statements = [
    '✅ Más de 1142 uniformes entregados con éxito y cero reclamos de calidad',
    '⏱️ Entrega a tiempo o 30% en tu proxima orden',
    '📏 Fit garantizado: te ayudamos a elegir la talla, y si no calza, lo reemplazamos',
  ];

  // Join statements with separator and duplicate for seamless loop
  const statementString = statements.join(' • ');

  return (
    <div className="w-3/4 max-w-md mx-auto px-2 sm:px-4 mb-4 sm:mb-5 md:mb-6">
      {/* Red glass card container */}
      <div className="relative overflow-hidden rounded-xl bg-[#e21c21]/20 backdrop-blur-md border border-[#e21c21]/40 shadow-lg shadow-[#e21c21]/20">
        {/* Animated scrolling content - FIXED: Now uses Tailwind animate-marquee */}
        <div className="flex animate-marquee py-3">
          <div className="flex-shrink-0 text-white font-medium text-sm whitespace-nowrap pr-4">
            {statementString}
          </div>
          <div className="flex-shrink-0 text-white font-medium text-sm whitespace-nowrap pr-4" aria-hidden="true">
            {statementString}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrustStatements;
