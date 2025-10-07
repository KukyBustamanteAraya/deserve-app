'use client';

import React, { useState } from 'react';
import { usePricing } from '@/hooks/usePricing';
import { formatCLPInteger } from '@/lib/currency';

interface BundleComponent {
  qty: number;
  type_slug: string;
}

interface Bundle {
  id: number;
  code: string;
  name: string;
  description: string;
  components: BundleComponent[];
  discount_pct: number;
}

interface TeamPricingProps {
  productId: number | string;
  bundles?: Bundle[];
  onBundleSelect?: (bundleCode: string | null) => void;
  selectedBundleCode?: string | null;
}

export function TeamPricing({ productId, bundles = [], onBundleSelect, selectedBundleCode }: TeamPricingProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const typeNameMap: Record<string, string> = {
    jersey: 'Camiseta',
    shorts: 'Short',
    socks: 'Calcetines',
    pants: 'Pantalón',
    jacket: 'Polerón',
    bag: 'Bolso',
  };

  if (bundles.length === 0) {
    return null;
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? bundles.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === bundles.length - 1 ? 0 : prev + 1));
  };

  const currentBundle = bundles[currentIndex];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Paquetes para Equipos</h3>

      {/* Bundle Carousel */}
      <div className="relative">
        {/* Navigation Buttons */}
        {bundles.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 -ml-4"
              aria-label="Previous bundle"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 -mr-4"
              aria-label="Next bundle"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Bundle Card */}
        <div
          className={`
            p-6 rounded-lg border-2 transition-all cursor-pointer
            ${selectedBundleCode === currentBundle.code
              ? 'border-[#E21C21] bg-red-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
            }
          `}
          onClick={() => {
            const newSelection = selectedBundleCode === currentBundle.code ? null : currentBundle.code;
            onBundleSelect?.(newSelection);
          }}
        >
          <div className="flex gap-6">
            {/* Bundle Image Placeholder */}
            <div className="flex-shrink-0 w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-5xl">📦</span>
            </div>

            {/* Bundle Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{currentBundle.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{currentBundle.description}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="inline-block px-3 py-1 bg-[#E21C21] text-white text-sm font-semibold rounded-full">
                    {currentBundle.discount_pct}% OFF
                  </span>
                </div>
              </div>

              {/* Components List */}
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-700 mb-2">Incluye:</p>
                <ul className="space-y-1">
                  {currentBundle.components.map((comp, idx) => (
                    <li key={idx} className="flex items-center text-sm text-gray-700">
                      <svg className="w-4 h-4 text-[#E21C21] mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {comp.qty}x {typeNameMap[comp.type_slug] || comp.type_slug}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Select Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newSelection = selectedBundleCode === currentBundle.code ? null : currentBundle.code;
                  onBundleSelect?.(newSelection);
                }}
                className={`
                  mt-4 px-4 py-2 rounded-lg font-medium transition-colors text-sm
                  ${selectedBundleCode === currentBundle.code
                    ? 'bg-[#E21C21] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {selectedBundleCode === currentBundle.code ? 'Seleccionado ✓' : 'Seleccionar paquete'}
              </button>
            </div>
          </div>
        </div>

        {/* Carousel Dots */}
        {bundles.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {bundles.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentIndex ? 'bg-[#E21C21] w-6' : 'bg-gray-300'
                }`}
                aria-label={`Go to bundle ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
