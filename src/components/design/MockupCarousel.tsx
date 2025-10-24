'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import type { MockupPreference } from '@/types/design-request';

interface MockupCarouselProps {
  mockups: string[];
  mockupPreference?: MockupPreference;
  className?: string;
  showLabels?: boolean;
  showControls?: boolean;
}

/**
 * Reusable carousel component for displaying design mockups
 * Supports navigation, keyboard controls, and touch gestures
 */
export function MockupCarousel({
  mockups,
  mockupPreference,
  className = '',
  showLabels = true,
  showControls = true,
}: MockupCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance (in px) to trigger navigation
  const minSwipeDistance = 50;

  /**
   * Generate intelligent labels based on mockup preference and position
   * getAllMockups() returns in order: home.front, home.back, away.front, away.back
   */
  const getLabel = (index: number): string => {
    if (!mockupPreference || mockupPreference === 'both') {
      // Both home and away: expect up to 4 mockups
      const labels = ['🏠 Home - Frente', '🏠 Home - Reverso', '✈️ Away - Frente', '✈️ Away - Reverso'];
      return labels[index] || `Diseño ${index + 1}`;
    } else if (mockupPreference === 'home') {
      // Home only: expect up to 2 mockups
      const labels = ['🏠 Home - Frente', '🏠 Home - Reverso'];
      return labels[index] || `Home ${index + 1}`;
    } else if (mockupPreference === 'away') {
      // Away only: expect up to 2 mockups
      const labels = ['✈️ Away - Frente', '✈️ Away - Reverso'];
      return labels[index] || `Away ${index + 1}`;
    }
    return `Diseño ${index + 1}`;
  };

  // Navigation functions
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % mockups.length);
  }, [mockups.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + mockups.length) % mockups.length);
  }, [mockups.length]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious]);

  // Touch handlers for swipe support
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  // Handle single mockup case
  if (mockups.length === 0) {
    return null;
  }

  const isSingleMockup = mockups.length === 1;

  return (
    <div className={`relative ${className}`}>
      {/* Main Mockup Display */}
      <div
        className="relative bg-gray-900/50 rounded-lg overflow-hidden border border-gray-700"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Mockup Image */}
        <div className="relative w-full h-48 bg-gray-900">
          <Image
            src={mockups[currentIndex]}
            alt={getLabel(currentIndex)}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-contain p-4"
            priority={currentIndex === 0}
          />
        </div>

        {/* Label Badge - Top Center */}
        {showLabels && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold shadow-lg bg-black/80 text-white border border-gray-600">
              {getLabel(currentIndex)}
            </span>
          </div>
        )}

        {/* Navigation Arrows - Only show if multiple mockups */}
        {!isSingleMockup && showControls && (
          <>
            {/* Left Arrow */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white border border-gray-600 transition-all group"
              aria-label="Previous mockup"
            >
              <svg
                className="w-5 h-5 group-hover:scale-110 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Right Arrow */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white border border-gray-600 transition-all group"
              aria-label="Next mockup"
            >
              <svg
                className="w-5 h-5 group-hover:scale-110 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Counter Badge - Bottom Right */}
        {!isSingleMockup && (
          <div className="absolute bottom-2 right-2">
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-black/60 text-gray-300 border border-gray-600">
              {currentIndex + 1} / {mockups.length}
            </span>
          </div>
        )}
      </div>

      {/* Dot Indicators - Only show if multiple mockups */}
      {!isSingleMockup && showControls && (
        <div className="flex items-center justify-center gap-2 mt-3">
          {mockups.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                goToIndex(index);
              }}
              className={`transition-all rounded-full ${
                index === currentIndex
                  ? 'w-8 h-2 bg-[#e21c21]'
                  : 'w-2 h-2 bg-gray-600 hover:bg-gray-500'
              }`}
              aria-label={`Go to mockup ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
