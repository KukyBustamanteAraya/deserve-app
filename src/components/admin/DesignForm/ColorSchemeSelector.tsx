'use client';

import { memo, useState } from 'react';

interface ColorSchemeSelectorProps {
  colorScheme: string[];
  onAddColor: (color: string) => void;
  onRemoveColor: (color: string) => void;
}

const ColorSchemeSelector = memo(function ColorSchemeSelector({
  colorScheme,
  onAddColor,
  onRemoveColor,
}: ColorSchemeSelectorProps) {
  const [colorInput, setColorInput] = useState('');

  const handleAddColor = () => {
    if (!colorInput.trim()) return;

    const color = colorInput.trim();
    if (!colorScheme.includes(color)) {
      onAddColor(color);
    }
    setColorInput('');
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Color Scheme</label>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={colorInput}
          onChange={(e) => setColorInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddColor();
            }
          }}
          className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-transparent"
          placeholder="Enter color name or hex code (e.g., #FF0000 or red)"
        />
        <button
          type="button"
          onClick={handleAddColor}
          className="px-4 py-2 bg-[#e21c21] text-white rounded-md hover:bg-[#c11a1e] transition-colors"
        >
          Add
        </button>
      </div>
      {colorScheme.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {colorScheme.map((color, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 rounded-md group"
            >
              <div
                className="w-4 h-4 rounded border border-gray-600"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-gray-300">{color}</span>
              <button
                type="button"
                onClick={() => onRemoveColor(color)}
                className="text-gray-500 hover:text-red-400 transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default ColorSchemeSelector;
