'use client';

import { useState } from 'react';
import { getFieldLayout, findPositionCoordinates, type SportSlug } from '@/lib/sports/fieldLayouts';

interface Player {
  id: string;
  player_name: string;
  jersey_number?: string;
  size: string;
  position?: string;
}

interface MiniFieldMapProps {
  sport: SportSlug;
  players: Player[];
  onPlayerClick?: (player: Player) => void;
}

export function MiniFieldMap({ sport, players, onPlayerClick }: MiniFieldMapProps) {
  const [hoveredPlayer, setHoveredPlayer] = useState<Player | null>(null);
  const layout = getFieldLayout(sport);

  // Render sport-specific field background
  const renderFieldSVG = () => {
    if (sport === 'soccer') {
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

    if (sport === 'basketball') {
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 90" preserveAspectRatio="none">
          <rect x="2" y="2" width="156" height="86" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <line x1="80" y1="2" x2="80" y2="88" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <circle cx="80" cy="45" r="12" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          {/* 3-point lines */}
          <path d="M 2 10 Q 25 45 2 80" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <path d="M 158 10 Q 135 45 158 80" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          {/* Free throw lanes */}
          <rect x="2" y="30" width="19" height="30" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <rect x="139" y="30" width="19" height="30" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
        </svg>
      );
    }

    if (sport === 'volleyball') {
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 150 100" preserveAspectRatio="none">
          <rect x="2" y="2" width="146" height="96" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <line x1="2" y1="50" x2="148" y2="50" stroke="white" strokeWidth="0.5" opacity="0.6" />
          {/* Attack lines */}
          <line x1="2" y1="33" x2="148" y2="33" stroke="white" strokeWidth="0.3" opacity="0.4" strokeDasharray="2" />
          <line x1="2" y1="67" x2="148" y2="67" stroke="white" strokeWidth="0.3" opacity="0.4" strokeDasharray="2" />
          {/* Net */}
          <line x1="75" y1="35" x2="75" y2="65" stroke="white" strokeWidth="1" opacity="0.8" />
        </svg>
      );
    }

    if (sport === 'baseball') {
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Diamond */}
          <path d="M 50 90 L 70 70 L 50 40 L 30 70 Z" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          {/* Bases */}
          <rect x="48" y="88" width="4" height="4" fill="white" opacity="0.6" />
          <rect x="68" y="68" width="4" height="4" fill="white" opacity="0.6" />
          <rect x="48" y="38" width="4" height="4" fill="white" opacity="0.6" />
          <rect x="28" y="68" width="4" height="4" fill="white" opacity="0.6" />
          {/* Pitcher's mound */}
          <circle cx="50" cy="60" r="3" fill="white" opacity="0.6" />
          {/* Outfield arc */}
          <path d="M 10 95 Q 50 10 90 95" fill="none" stroke="white" strokeWidth="0.5" opacity="0.4" />
        </svg>
      );
    }

    if (sport === 'rugby') {
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 150" preserveAspectRatio="none">
          <rect x="2" y="2" width="96" height="146" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
          {/* 22m lines */}
          <line x1="2" y1="22" x2="98" y2="22" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <line x1="2" y1="128" x2="98" y2="128" stroke="white" strokeWidth="0.5" opacity="0.6" />
          {/* 10m lines */}
          <line x1="2" y1="65" x2="98" y2="65" stroke="white" strokeWidth="0.3" opacity="0.4" strokeDasharray="2" />
          <line x1="2" y1="85" x2="98" y2="85" stroke="white" strokeWidth="0.3" opacity="0.4" strokeDasharray="2" />
          {/* Halfway line */}
          <line x1="2" y1="75" x2="98" y2="75" stroke="white" strokeWidth="0.5" opacity="0.6" />
          {/* Try lines */}
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
          {/* Service lines */}
          <line x1="2" y1="33" x2="148" y2="33" stroke="white" strokeWidth="0.3" opacity="0.4" strokeDasharray="2" />
          <line x1="2" y1="67" x2="148" y2="67" stroke="white" strokeWidth="0.3" opacity="0.4" strokeDasharray="2" />
        </svg>
      );
    }

    if (sport === 'golf' || sport === 'crossfit' || sport === 'training' || sport === 'yoga-pilates') {
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 90" preserveAspectRatio="none">
          <rect x="2" y="2" width="156" height="86" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" />
        </svg>
      );
    }

    return null;
  };

  // Get background color based on sport
  const getBgColor = () => {
    if (sport === 'basketball') return 'bg-orange-800';
    if (sport === 'volleyball') return 'bg-blue-700';
    if (sport === 'baseball') return 'bg-amber-700';
    if (sport === 'padel') return 'bg-cyan-700';
    if (sport === 'golf') return 'bg-emerald-700';
    if (sport === 'crossfit') return 'bg-red-700';
    if (sport === 'training') return 'bg-purple-700';
    if (sport === 'yoga-pilates') return 'bg-pink-700';
    return 'bg-green-600'; // Default for soccer/rugby
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Team Lineup</h3>
        <div className="text-sm text-gray-600">
          {players.length} {players.length === 1 ? 'player' : 'players'}
        </div>
      </div>

      {/* Field Visualization */}
      <div
        className={`relative w-full ${getBgColor()} rounded-lg shadow-lg overflow-hidden`}
        style={{ aspectRatio: layout.aspectRatio, maxHeight: '500px' }}
      >
        {/* Field Lines */}
        {renderFieldSVG()}

        {/* Player Markers */}
        {players.map((player) => {
          const coordinates = player.position
            ? findPositionCoordinates(sport, player.position)
            : null;

          // If no position or coordinates found, skip this player
          if (!coordinates) return null;

          const isHovered = hoveredPlayer?.id === player.id;

          return (
            <div key={player.id} className="absolute" style={{ left: `${coordinates.x}%`, top: `${coordinates.y}%` }}>
              {/* Player Icon */}
              <button
                type="button"
                onClick={() => onPlayerClick?.(player)}
                onMouseEnter={() => setHoveredPlayer(player)}
                onMouseLeave={() => setHoveredPlayer(null)}
                className={`transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${
                  isHovered
                    ? 'w-10 h-10 bg-yellow-400 border-4 border-white shadow-lg scale-110 z-20'
                    : 'w-9 h-9 bg-white border-2 border-green-700 hover:border-blue-500 z-10'
                } rounded-full flex items-center justify-center font-bold text-xs`}
              >
                <span className={isHovered ? 'text-green-900' : 'text-green-700'}>
                  {player.jersey_number || '?'}
                </span>
              </button>

              {/* Hover Tooltip */}
              {isHovered && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs whitespace-nowrap z-30 pointer-events-none"
                  style={{ minWidth: '150px' }}
                >
                  <div className="font-bold">{player.player_name}</div>
                  <div className="text-gray-300">
                    #{player.jersey_number || 'N/A'} • Size: {player.size}
                  </div>
                  {player.position && <div className="text-gray-400 text-xs">{player.position}</div>}
                  <div className="text-xs text-gray-400 mt-1">Click for details</div>
                  {/* Arrow pointing up */}
                  <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-gray-900 transform rotate-45" />
                </div>
              )}
            </div>
          );
        })}

        {/* Empty State */}
        {players.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white/80">
              <div className="text-4xl mb-2">👥</div>
              <div className="font-medium">No players yet</div>
              <div className="text-sm text-white/60">Add players to see them on the field</div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white border-2 border-green-700 rounded-full flex items-center justify-center font-bold text-[10px]">
              10
            </div>
            <span>Hover to see player info</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-400 border-2 border-white rounded-full flex items-center justify-center font-bold text-[10px]">
              7
            </div>
            <span>Click to view details</span>
          </div>
        </div>
      </div>
    </div>
  );
}
