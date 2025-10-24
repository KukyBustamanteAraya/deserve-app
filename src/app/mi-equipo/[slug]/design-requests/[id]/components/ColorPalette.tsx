'use client';

import React from 'react';
import { DesignRequest } from './types';

interface ColorPaletteProps {
  designRequest: DesignRequest;
}

const ColorPalette = React.memo<ColorPaletteProps>(({ designRequest }) => {
  const hasColors = designRequest.primary_color || designRequest.secondary_color || designRequest.accent_color;

  if (!hasColors) {
    return null;
  }

  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

      <div className="relative space-y-4">
        <h2 className="text-xl font-bold text-white mb-4">Colores Seleccionados</h2>

        <div className="space-y-3">
          {designRequest.primary_color && (
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg border-2 border-gray-600 shadow-lg"
                style={{ backgroundColor: designRequest.primary_color }}
              />
              <div>
                <p className="text-sm text-gray-400">Color Principal</p>
                <p className="text-white font-mono text-sm">{designRequest.primary_color}</p>
              </div>
            </div>
          )}

          {designRequest.secondary_color && (
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg border-2 border-gray-600 shadow-lg"
                style={{ backgroundColor: designRequest.secondary_color }}
              />
              <div>
                <p className="text-sm text-gray-400">Color Secundario</p>
                <p className="text-white font-mono text-sm">{designRequest.secondary_color}</p>
              </div>
            </div>
          )}

          {designRequest.accent_color && (
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg border-2 border-gray-600 shadow-lg"
                style={{ backgroundColor: designRequest.accent_color }}
              />
              <div>
                <p className="text-sm text-gray-400">Color de Acento</p>
                <p className="text-white font-mono text-sm">{designRequest.accent_color}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ColorPalette.displayName = 'ColorPalette';

export default ColorPalette;
