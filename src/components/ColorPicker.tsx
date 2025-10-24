'use client';

import { useCallback } from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  id: string;
}

export function ColorPicker({ label, value, onChange, id }: ColorPickerProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Label */}
      <label htmlFor={id} className="text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">
        {label}
      </label>

      {/* Color Button */}
      <div className="relative">
        <input
          type="color"
          id={id}
          value={value}
          onChange={handleChange}
          className="h-12 w-12 rounded-lg cursor-pointer border-2 border-gray-300 hover:border-gray-400 transition-all duration-300"
          style={{
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            appearance: 'none',
            background: value,
            padding: 0
          }}
          aria-label={`Selector de color ${label.toLowerCase()}`}
        />
      </div>

      {/* Hex Code Display - abbreviated */}
      <div className="text-[10px] font-mono font-bold text-gray-600 text-center">
        {value.toUpperCase()}
      </div>
    </div>
  );
}
