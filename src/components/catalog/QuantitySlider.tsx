'use client';

import { useState, useEffect } from 'react';

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
  max = 100,
  defaultValue = 1,
  onQuantityChange,
  className = '',
  showLabel = true
}: QuantitySliderProps) {
  const [quantity, setQuantity] = useState(defaultValue);

  useEffect(() => {
    onQuantityChange(quantity);
  }, [quantity, onQuantityChange]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuantity(parseInt(e.target.value));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= min && value <= max) {
      setQuantity(value);
    }
  };

  const increment = () => {
    if (quantity < max) {
      setQuantity(quantity + 1);
    }
  };

  const decrement = () => {
    if (quantity > min) {
      setQuantity(quantity - 1);
    }
  };

  // Calculate percentage for visual indicator
  const percentage = ((quantity - min) / (max - min)) * 100;

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
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              style={{
                background: `linear-gradient(to right, rgb(var(--color-primary)) 0%, rgb(var(--color-primary)) ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`
              }}
            />
          </div>

          {/* Quantity markers - aligned with pricing tiers */}
          <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
            <span>1</span>
            <span>10</span>
            <span>25</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>

        <button
          onClick={increment}
          disabled={quantity >= max}
          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium"
          aria-label="Aumentar cantidad"
        >
          +
        </button>

        <input
          type="number"
          min={min}
          max={max}
          value={quantity}
          onChange={handleInputChange}
          className="w-20 px-3 py-2 border border-gray-300 rounded-md text-center focus:ring-primary focus:border-primary"
        />
      </div>

      {/* Tier indicators - matching actual pricing tiers */}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className={`px-2 py-1 rounded ${quantity >= 1 && quantity <= 9 ? 'bg-red-100 text-red-700 font-medium' : 'bg-gray-100 text-gray-500'}`}>
          1-9: Base
        </span>
        <span className={`px-2 py-1 rounded ${quantity >= 10 && quantity <= 24 ? 'bg-red-100 text-red-700 font-medium' : 'bg-gray-100 text-gray-500'}`}>
          10-24: 5% desc
        </span>
        <span className={`px-2 py-1 rounded ${quantity >= 25 && quantity <= 49 ? 'bg-red-100 text-red-700 font-medium' : 'bg-gray-100 text-gray-500'}`}>
          25-49: 10% desc
        </span>
        <span className={`px-2 py-1 rounded ${quantity >= 50 && quantity <= 99 ? 'bg-red-100 text-red-700 font-medium' : 'bg-gray-100 text-gray-500'}`}>
          50-99: 15% desc
        </span>
        <span className={`px-2 py-1 rounded ${quantity >= 100 ? 'bg-red-100 text-red-700 font-medium' : 'bg-gray-100 text-gray-500'}`}>
          100+: 20% desc
        </span>
      </div>
    </div>
  );
}
