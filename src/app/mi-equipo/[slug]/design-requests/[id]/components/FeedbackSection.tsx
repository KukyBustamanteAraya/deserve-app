'use client';

import React from 'react';
import { DesignRequest } from './types';

interface FeedbackSectionProps {
  designRequest: DesignRequest;
}

const FeedbackSection = React.memo<FeedbackSectionProps>(({ designRequest }) => {
  if (!designRequest.feedback) {
    return null;
  }

  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

      <div className="relative space-y-4">
        <h2 className="text-xl font-bold text-white mb-4">Comentarios</h2>
        <p className="text-white text-sm leading-relaxed">{designRequest.feedback}</p>
      </div>
    </div>
  );
});

FeedbackSection.displayName = 'FeedbackSection';

export default FeedbackSection;
