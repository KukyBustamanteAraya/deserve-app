'use client';

import { useState } from 'react';

interface SoccerFieldSelectorProps {
  selectedPosition: string;
  onPositionChange: (position: string) => void;
}

// Soccer positions with their approximate field coordinates (percentage)
const POSITIONS = [
  { name: 'Goalkeeper', x: 50, y: 95, abbr: 'GK' },
  { name: 'Left Back', x: 20, y: 75, abbr: 'LB' },
  { name: 'Center Back (Left)', x: 35, y: 80, abbr: 'CB' },
  { name: 'Center Back (Right)', x: 65, y: 80, abbr: 'CB' },
  { name: 'Right Back', x: 80, y: 75, abbr: 'RB' },
  { name: 'Defensive Midfielder', x: 50, y: 65, abbr: 'CDM' },
  { name: 'Left Midfielder', x: 20, y: 50, abbr: 'LM' },
  { name: 'Center Midfielder (Left)', x: 40, y: 50, abbr: 'CM' },
  { name: 'Center Midfielder (Right)', x: 60, y: 50, abbr: 'CM' },
  { name: 'Right Midfielder', x: 80, y: 50, abbr: 'RM' },
  { name: 'Attacking Midfielder', x: 50, y: 35, abbr: 'CAM' },
  { name: 'Left Winger', x: 20, y: 25, abbr: 'LW' },
  { name: 'Right Winger', x: 80, y: 25, abbr: 'RW' },
  { name: 'Striker (Left)', x: 40, y: 15, abbr: 'ST' },
  { name: 'Striker (Right)', x: 60, y: 15, abbr: 'ST' },
];

export function SoccerFieldSelector({ selectedPosition, onPositionChange }: SoccerFieldSelectorProps) {
  const [hoveredPosition, setHoveredPosition] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Soccer Field */}
      <div className="relative w-full bg-green-600 rounded-lg shadow-lg overflow-hidden" style={{ aspectRatio: '2/3', maxHeight: '500px' }}>
        {/* Field Lines */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 150" preserveAspectRatio="none">
          {/* Outer boundary */}
          <rect x="2" y="2" width="96" height="146" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />

          {/* Center line */}
          <line x1="2" y1="75" x2="98" y2="75" stroke="white" strokeWidth="0.5" opacity="0.6" />

          {/* Center circle */}
          <circle cx="50" cy="75" r="10" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <circle cx="50" cy="75" r="0.8" fill="white" opacity="0.6" />

          {/* Penalty boxes */}
          <rect x="20" y="2" width="60" height="16" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <rect x="20" y="132" width="60" height="16" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />

          {/* Goal boxes */}
          <rect x="35" y="2" width="30" height="6" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <rect x="35" y="142" width="30" height="6" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />

          {/* Penalty spots */}
          <circle cx="50" cy="12" r="0.8" fill="white" opacity="0.6" />
          <circle cx="50" cy="138" r="0.8" fill="white" opacity="0.6" />
        </svg>

        {/* Position Markers */}
        {POSITIONS.map((pos) => {
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
          {POSITIONS.map((pos) => (
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
