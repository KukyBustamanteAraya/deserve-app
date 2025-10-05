'use client';

import { useState } from 'react';

interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function QuantityStepper({
  value,
  min = 1,
  max = 50,
  onChange,
  disabled = false,
  loading = false
}: QuantityStepperProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleDecrease = () => {
    if (value > min && !disabled && !loading) {
      const newValue = value - 1;
      onChange(newValue);
      setIsUpdating(true);
      setTimeout(() => setIsUpdating(false), 300);
    }
  };

  const handleIncrease = () => {
    if (value < max && !disabled && !loading) {
      const newValue = value + 1;
      onChange(newValue);
      setIsUpdating(true);
      setTimeout(() => setIsUpdating(false), 300);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || min;
    if (newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  };

  return (
    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={handleDecrease}
        disabled={value <= min || disabled || loading}
        className="px-3 py-2 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-gray-600 hover:text-gray-800"
      >
        <span className="text-lg font-medium">−</span>
      </button>

      <input
        type="number"
        value={value}
        onChange={handleInputChange}
        min={min}
        max={max}
        disabled={disabled || loading}
        className={`w-16 text-center py-2 border-0 focus:outline-none focus:ring-0 ${
          isUpdating || loading ? 'bg-yellow-50' : 'bg-white'
        } disabled:bg-gray-50 disabled:cursor-not-allowed`}
      />

      <button
        type="button"
        onClick={handleIncrease}
        disabled={value >= max || disabled || loading}
        className="px-3 py-2 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-gray-600 hover:text-gray-800"
      >
        <span className="text-lg font-medium">+</span>
      </button>
    </div>
  );
}