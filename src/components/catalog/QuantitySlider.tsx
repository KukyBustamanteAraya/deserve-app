'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// NOTE: Known limitation - Pricing animation has minor visual artifacts during fade
// - Container shrinks slightly when transitioning 9→10
// - Small dark boxes appear during crossfade
// - Acceptable for v1; future: consider CSS-only transitions or Framer Motion

interface QuantitySliderProps {
  min?: number;
  max?: number;
  defaultValue?: number;
  onQuantityChange: (quantity: number) => void;
  className?: string;
  showLabel?: boolean;
}

export default function QuantitySlider({
  min = 1,
  max = 50,
  defaultValue = 1,
  onQuantityChange,
  className = '',
  showLabel = true
}: QuantitySliderProps) {
  const [quantity, setQuantity] = useState(defaultValue);
  const [inputValue, setInputValue] = useState(defaultValue.toString());

  // Sync inputValue when quantity changes from slider or buttons
  useEffect(() => {
    setInputValue(quantity.toString());
  }, [quantity]);

  // Immediately notify parent of quantity changes
  useEffect(() => {
    onQuantityChange(quantity);
  }, [quantity, onQuantityChange]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuantity(parseInt(e.target.value));
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Allow empty input temporarily
    if (value === '') {
      return;
    }

    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= min) {
      setQuantity(numValue);
    }
  }, [min]);

  const handleInputBlur = useCallback(() => {
    // On blur, if input is empty or invalid, reset to min value
    if (inputValue === '' || parseInt(inputValue) < min) {
      setQuantity(min);
      setInputValue(min.toString());
    }
  }, [inputValue, min]);

  const increment = useCallback(() => {
    setQuantity(prev => prev + 1);
  }, []);

  const decrement = useCallback(() => {
    setQuantity(prev => (prev > min ? prev - 1 : prev));
  }, [min]);

  // Calculate percentage for visual indicator (cap at 100% when quantity exceeds max)
  const percentage = useMemo(() =>
    Math.min(((quantity - min) / (max - min)) * 100, 100),
    [quantity, min, max]
  );

  return (
    <div className={className}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cantidad
        </label>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={decrement}
          disabled={quantity <= min}
          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium"
          aria-label="Disminuir cantidad"
        >
          −
        </button>

        <div className="flex-1">
          <div className="relative">
            <input
              type="range"
              min={min}
              max={max}
              value={quantity}
              onChange={handleSliderChange}
              className="deserve-slider w-full"
              style={{
                '--slider-percentage': `${percentage}%`
              } as React.CSSProperties}
            />

            {/* Tick marks for every 5 units - positioned absolutely to align with slider */}
            <div className="absolute top-full mt-1 h-2 pointer-events-none" style={{ left: '10px', right: '10px' }}>
              {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((value) => (
                <div
                  key={value}
                  className="absolute w-px bg-gray-400"
                  style={{
                    left: `${((value - min) / (max - min)) * 100}%`,
                    height: '8px',
                    transform: 'translateX(-0.5px)'
                  }}
                />
              ))}
            </div>

            {/* Quantity labels - every 10 units */}
            <div className="absolute top-full mt-3 text-xs font-medium text-gray-600 pointer-events-none" style={{ left: '10px', right: '10px' }}>
              {[1, 10, 20, 30, 40, 50].map((value) => (
                <span
                  key={value}
                  className={quantity >= value ? 'text-[#E21C21]' : ''}
                  style={{
                    position: 'absolute',
                    left: `${((value - min) / (max - min)) * 100}%`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  {value}
                </span>
              ))}
            </div>
          </div>

          {/* Spacer to account for absolute positioned elements */}
          <div className="h-8"></div>
        </div>

        <button
          onClick={increment}
          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-medium"
          aria-label="Aumentar cantidad"
        >
          +
        </button>

        <input
          type="number"
          min={min}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          className="w-20 px-3 py-2 border border-gray-300 rounded-md text-center focus:ring-primary focus:border-primary"
        />
      </div>
    </div>
  );
}
