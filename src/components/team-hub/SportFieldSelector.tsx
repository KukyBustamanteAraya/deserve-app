'use client';

import { useState } from 'react';
import { getFieldLayout, type SportSlug } from '@/lib/sports/fieldLayouts';

interface SportFieldSelectorProps {
  sport: SportSlug;
  selectedPosition: string;
  onPositionChange: (position: string) => void;
}

export function SportFieldSelector({ sport, selectedPosition, onPositionChange }: SportFieldSelectorProps) {
  const [hoveredPosition, setHoveredPosition] = useState<string | null>(null);
  const layout = getFieldLayout(sport);

  // Render sport-specific field background
  const renderFieldSVG = () => {
    if (sport === 'soccer' || sport === 'futbol') {
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 150" preserveAspectRatio="none">
          <rect x="2" y="2" width="96" height="146" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <line x1="2" y1="75" x2="98" y2="75" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <circle cx="50" cy="75" r="10" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <circle cx="50" cy="75" r="0.8" fill="white" opacity="0.6" />
          <rect x="20" y="2" width="60" height="16" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <rect x="20" y="132" width="60" height="16" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <rect x="35" y="2" width="30" height="6" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <rect x="35" y="142" width="30" height="6" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <circle cx="50" cy="12" r="0.8" fill="white" opacity="0.6" />
          <circle cx="50" cy="138" r="0.8" fill="white" opacity="0.6" />
        </svg>
      );
    }

    if (sport === 'basketball' || sport === 'basquetbol') {
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 90" preserveAspectRatio="none">
          <rect x="2" y="2" width="156" height="86" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <line x1="80" y1="2" x2="80" y2="88" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <circle cx="80" cy="45" r="12" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <path d="M 2 10 Q 25 45 2 80" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <path d="M 158 10 Q 135 45 158 80" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <rect x="2" y="30" width="19" height="30" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <rect x="139" y="30" width="19" height="30" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
        </svg>
      );
    }

    if (sport === 'volleyball' || sport === 'voleibol') {
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 150 100" preserveAspectRatio="none">
          <rect x="2" y="2" width="146" height="96" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <line x1="2" y1="50" x2="148" y2="50" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <line x1="2" y1="33" x2="148" y2="33" stroke="white" strokeWidth="0.3" opacity="0.4" strokeDasharray="2" />
          <line x1="2" y1="67" x2="148" y2="67" stroke="white" strokeWidth="0.3" opacity="0.4" strokeDasharray="2" />
          <line x1="75" y1="35" x2="75" y2="65" stroke="white" strokeWidth="1" opacity="0.8" />
        </svg>
      );
    }

    if (sport === 'baseball') {
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M 50 90 L 70 70 L 50 40 L 30 70 Z" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <rect x="48" y="88" width="4" height="4" fill="white" opacity="0.6" />
          <rect x="68" y="68" width="4" height="4" fill="white" opacity="0.6" />
          <rect x="48" y="38" width="4" height="4" fill="white" opacity="0.6" />
          <rect x="28" y="68" width="4" height="4" fill="white" opacity="0.6" />
          <circle cx="50" cy="60" r="3" fill="white" opacity="0.6" />
          <path d="M 10 95 Q 50 10 90 95" fill="none" stroke="white" strokeWidth="0.5" opacity="0.4" />
        </svg>
      );
    }

    if (sport === 'rugby') {
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 150" preserveAspectRatio="none">
          <rect x="2" y="2" width="96" height="146" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <line x1="2" y1="22" x2="98" y2="22" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <line x1="2" y1="128" x2="98" y2="128" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <line x1="2" y1="65" x2="98" y2="65" stroke="white" strokeWidth="0.3" opacity="0.4" strokeDasharray="2" />
          <line x1="2" y1="85" x2="98" y2="85" stroke="white" strokeWidth="0.3" opacity="0.4" strokeDasharray="2" />
          <line x1="2" y1="75" x2="98" y2="75" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <line x1="2" y1="5" x2="98" y2="5" stroke="white" strokeWidth="0.8" opacity="0.8" />
          <line x1="2" y1="145" x2="98" y2="145" stroke="white" strokeWidth="0.8" opacity="0.8" />
        </svg>
      );
    }

    if (sport === 'padel') {
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 150 100" preserveAspectRatio="none">
          <rect x="2" y="2" width="146" height="96" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <line x1="75" y1="2" x2="75" y2="98" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <line x1="2" y1="33" x2="148" y2="33" stroke="white" strokeWidth="0.3" opacity="0.4" strokeDasharray="2" />
          <line x1="2" y1="67" x2="148" y2="67" stroke="white" strokeWidth="0.3" opacity="0.4" strokeDasharray="2" />
        </svg>
      );
    }

    // Simple field for other sports
    return (
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 90" preserveAspectRatio="none">
        <rect x="2" y="2" width="156" height="86" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" />
      </svg>
    );
  };

  // Get background color based on sport
  const getBgColor = () => {
    if (sport === 'basketball' || sport === 'basquetbol') return 'bg-orange-800';
    if (sport === 'volleyball' || sport === 'voleibol') return 'bg-blue-700';
    if (sport === 'baseball') return 'bg-amber-700';
    if (sport === 'padel') return 'bg-cyan-700';
    if (sport === 'golf') return 'bg-emerald-700';
    if (sport === 'crossfit') return 'bg-red-700';
    if (sport === 'training') return 'bg-purple-700';
    if (sport === 'yoga-pilates') return 'bg-pink-700';
    return 'bg-green-600'; // Default for soccer/futbol/rugby
  };

  return (
    <div className="space-y-4">
      {/* Sport Field */}
      <div
        className={`relative w-full ${getBgColor()} rounded-lg shadow-lg overflow-hidden`}
        style={{ aspectRatio: layout.aspectRatio, maxHeight: '500px' }}
      >
        {/* Field Lines */}
        {renderFieldSVG()}

        {/* Position Markers */}
        {layout.positions.map((pos) => {
          const isSelected = selectedPosition === pos.name;
          const isHovered = hoveredPosition === pos.name;

          return (
            <button
              key={pos.name}
              type="button"
              onClick={() => onPositionChange(pos.name)}
              onMouseEnter={() => setHoveredPosition(pos.name)}
              onMouseLeave={() => setHoveredPosition(null)}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${
                isSelected
                  ? 'w-10 h-10 bg-yellow-400 border-4 border-white shadow-lg scale-110 z-10'
                  : isHovered
                  ? 'w-9 h-9 bg-blue-400 border-3 border-white shadow-md scale-105 z-10'
                  : 'w-8 h-8 bg-white border-2 border-green-700 hover:border-blue-500'
              } rounded-full flex items-center justify-center font-bold text-xs`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
              }}
              title={pos.name}
            >
              <span className={isSelected ? 'text-green-900' : 'text-green-700'}>
                {pos.abbr}
              </span>
            </button>
          );
        })}
      </div>

      {/* Position Label */}
      <div className="text-center">
        {selectedPosition ? (
          <div className="inline-block px-4 py-2 bg-blue-100 text-blue-900 rounded-lg font-medium">
            Selected: {selectedPosition}
          </div>
        ) : (
          <div className="inline-block px-4 py-2 bg-gray-100 text-gray-600 rounded-lg">
            Click a position on the field to select
          </div>
        )}
      </div>

      {/* Position List (for accessibility and mobile) */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 font-medium">
          Or select from list
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {layout.positions.map((pos) => (
            <button
              key={pos.name}
              type="button"
              onClick={() => onPositionChange(pos.name)}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                selectedPosition === pos.name
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {pos.name}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
