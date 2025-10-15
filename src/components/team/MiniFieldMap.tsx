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
  onPlayerSwap?: (benchPlayerId: string, starterPlayerId: string) => void;
  teamSlug?: string;
  isManager?: boolean;
}

export function MiniFieldMap({ sport, players, onPlayerClick, onPlayerSwap, teamSlug, isManager }: MiniFieldMapProps) {
  const [hoveredPlayer, setHoveredPlayer] = useState<Player | null>(null);
  const [clickedPlayer, setClickedPlayer] = useState<Player | null>(null);
  const layout = getFieldLayout(sport);

  // Separate players into starters (first per position) and bench (duplicates)
  const { starters, bench } = players.reduce((acc, player) => {
    if (!player.position) {
      // Players without positions go to bench
      acc.bench.push(player);
      return acc;
    }

    const existingStarterIndex = acc.starters.findIndex(p => p.position === player.position);
    if (existingStarterIndex === -1) {
      // First player for this position becomes starter
      acc.starters.push(player);
    } else {
      // Subsequent players for this position go to bench
      acc.bench.push(player);
    }
    return acc;
  }, { starters: [] as Player[], bench: [] as Player[] });

  // Handler for swapping bench player with starter
  const handleBenchPlayerClick = (benchPlayer: Player) => {
    if (!benchPlayer.position || !onPlayerSwap) {
      return;
    }

    // Find the starter with the same position
    const starterWithSamePosition = starters.find(s => s.position === benchPlayer.position);

    if (starterWithSamePosition) {
      // Call the swap callback
      onPlayerSwap(benchPlayer.id, starterWithSamePosition.id);
    }
  };

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
      // NBA Half-Court Dimensions (in feet)
      const COURT_WIDTH = 50;
      const COURT_LENGTH = 43;
      const LINE_WIDTH = 0.25;

      const BASELINE = 0;
      const RIM_DISTANCE = 4;
      const KEY_WIDTH = 16;
      const KEY_DEPTH = 19;
      const BACKBOARD_WIDTH = 8;
      const FT_LINE = 19;
      const FT_CIRCLE_RADIUS = 6;
      const THREE_PT_DISTANCE = 23.75;
      const THREE_PT_CORNER_DISTANCE = 16.5;

      const centerX = COURT_WIDTH / 2;
      const keyLeft = centerX - KEY_WIDTH / 2;
      const keyRight = centerX + KEY_WIDTH / 2;
      const backboardLeft = centerX - BACKBOARD_WIDTH / 2;
      const backboardRight = centerX + BACKBOARD_WIDTH / 2;
      const cornerThreeX = 3;

      // Add padding by expanding the viewBox
      const PADDING = 3;
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox={`${-PADDING} ${-PADDING} ${COURT_WIDTH + (PADDING * 2)} ${COURT_LENGTH + (PADDING * 2)}`} preserveAspectRatio="xMidYMid meet">
          {/* Court background - dark theme */}
          <defs>
            <linearGradient id="courtGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#1f2937', stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: '#111827', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#0f172a', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          <rect x={0} y={0} width={COURT_WIDTH} height={COURT_LENGTH} fill="url(#courtGradient)" />

          {/* All court lines in red with glow effect */}
          <g stroke="#e21c21" strokeWidth={LINE_WIDTH} fill="none" strokeLinecap="round" strokeLinejoin="round">
            {/* Side lines (left and right) */}
            <line x1={0} y1={0} x2={0} y2={COURT_LENGTH} strokeWidth={0.42} opacity="0.9" />
            <line x1={COURT_WIDTH} y1={0} x2={COURT_WIDTH} y2={COURT_LENGTH} strokeWidth={0.42} opacity="0.9" />

            {/* Base line (near basket) */}
            <line x1={0} y1={0} x2={COURT_WIDTH} y2={0} strokeWidth={0.42} opacity="0.9" />

            {/* Half court / Midcourt line */}
            <line x1={0} y1={COURT_LENGTH} x2={COURT_WIDTH} y2={COURT_LENGTH} strokeWidth={0.42} opacity="0.9" />

            {/* Backboard */}
            <line x1={backboardLeft} y1={2.5} x2={backboardRight} y2={2.5} strokeWidth={LINE_WIDTH * 2} opacity="0.9" />

            {/* Basketball rim (red to match theme) */}
            <circle cx={centerX} cy={RIM_DISTANCE} r={0.75} stroke="#e21c21" strokeWidth={LINE_WIDTH * 2.5} fill="none" opacity="1" />

            {/* Paint/Key area */}
            <rect x={keyLeft} y={BASELINE} width={KEY_WIDTH} height={KEY_DEPTH} opacity="0.8" />

            {/* Free throw line */}
            <line x1={keyLeft} y1={FT_LINE} x2={keyRight} y2={FT_LINE} opacity="0.8" />

            {/* Free throw circle */}
            <path d={`M ${keyLeft} ${FT_LINE} A ${FT_CIRCLE_RADIUS} ${FT_CIRCLE_RADIUS} 0 0 0 ${keyRight} ${FT_LINE}`} opacity="0.8" />

            {/* Three-point line - Left corner */}
            <line x1={cornerThreeX} y1={BASELINE} x2={cornerThreeX} y2={THREE_PT_CORNER_DISTANCE} opacity="0.8" />

            {/* Three-point line - Right corner */}
            <line x1={COURT_WIDTH - cornerThreeX} y1={BASELINE} x2={COURT_WIDTH - cornerThreeX} y2={THREE_PT_CORNER_DISTANCE} opacity="0.8" />

            {/* Three-point arc */}
            <path d={`M ${cornerThreeX} ${THREE_PT_CORNER_DISTANCE} A ${THREE_PT_DISTANCE} ${THREE_PT_DISTANCE} 0 0 0 ${COURT_WIDTH - cornerThreeX} ${THREE_PT_CORNER_DISTANCE}`} opacity="0.8" />

            {/* Lane hash marks */}
            {[7, 8.5, 11, 14].map((distance, i) => (
              <g key={i} opacity="0.7">
                <line x1={keyLeft - 0.67} y1={distance} x2={keyLeft} y2={distance} strokeWidth={LINE_WIDTH * 1.2} />
                <line x1={keyRight} y1={distance} x2={keyRight + 0.67} y2={distance} strokeWidth={LINE_WIDTH * 1.2} />
              </g>
            ))}
          </g>
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
    if (sport === 'basketball') return ''; // Basketball uses its own glass card
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
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">
          Team Lineup
        </h2>
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-300">
            {players.length} {players.length === 1 ? 'player' : 'players'}
          </div>
          {teamSlug && (
            <a
              href={`/mi-equipo/${teamSlug}/players`}
              className="relative px-4 py-2 bg-gradient-to-br from-blue-600/90 via-blue-700/80 to-blue-800/90 text-white rounded-lg font-medium text-sm overflow-hidden group/btn border border-blue-600/50 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">👥 {isManager ? 'Gestionar Roster' : 'Ver Roster'}</span>
            </a>
          )}
        </div>
      </div>

      {/* Field Visualization */}
      <div>
      <div
        className={`relative ${sport === 'basketball' ? 'w-auto mx-auto' : 'w-full'} ${sport === 'basketball' ? 'bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-md border border-gray-700' : getBgColor()} rounded-lg shadow-lg overflow-hidden ${sport === 'basketball' ? 'group' : ''}`}
        style={{ aspectRatio: layout.aspectRatio, maxHeight: '280px', ...(sport === 'basketball' ? { maxWidth: '320px' } : {}) }}
      >
        {sport === 'basketball' && (
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        )}
        {/* Field Lines */}
        {renderFieldSVG()}

        {/* Player Markers - Only show starters on court */}
        {starters.map((player) => {
          const coordinates = player.position
            ? findPositionCoordinates(sport, player.position)
            : null;

          // If no position or coordinates found, skip this player
          if (!coordinates) return null;

          const isHovered = hoveredPlayer?.id === player.id;
          const isClicked = clickedPlayer?.id === player.id;
          const showTooltip = isHovered || isClicked;

          // Position tooltip on left if player is on right side (x > 50)
          const tooltipOnLeft = coordinates.x > 50;

          return (
            <div key={player.id} className="absolute" style={{ left: `${coordinates.x}%`, top: `${coordinates.y}%` }}>
              {/* Player Icon */}
              <button
                type="button"
                onClick={() => setClickedPlayer(isClicked ? null : player)}
                onMouseEnter={() => setHoveredPlayer(player)}
                onMouseLeave={() => setHoveredPlayer(null)}
                className={`transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${
                  showTooltip
                    ? 'w-8 h-8 bg-yellow-400 border-3 border-white shadow-lg scale-110 z-20'
                    : 'w-7 h-7 bg-white border-2 border-green-700 hover:border-blue-500 z-10'
                } rounded-full flex items-center justify-center font-bold text-[10px]`}
              >
                <span className={showTooltip ? 'text-green-900' : 'text-green-700'}>
                  {player.jersey_number || '?'}
                </span>
              </button>

              {/* Tooltip - Dynamic position based on player location */}
              {showTooltip && (
                <div
                  className={`absolute ${tooltipOnLeft ? 'right-full mr-6' : 'left-full -ml-2'} top-1/2 -translate-y-1/2 bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md border border-gray-700 text-white px-3 py-2 rounded-lg shadow-2xl whitespace-nowrap z-30 pointer-events-none`}
                >
                  <div className="font-bold text-sm">{player.player_name}</div>
                  {player.position && <div className="text-gray-300 text-xs mt-0.5">{player.position}</div>}
                  {/* Arrow pointing to player */}
                  <div className={`absolute ${tooltipOnLeft ? 'left-full -ml-1' : 'right-full -mr-1'} top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-800 ${tooltipOnLeft ? 'border-t border-r' : 'border-t border-l'} border-gray-700 transform ${tooltipOnLeft ? '-rotate-45' : 'rotate-45'}`} />
                </div>
              )}
            </div>
          );
        })}

        {/* Empty State */}
        {starters.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white/80">
              <div className="text-3xl mb-1">👥</div>
              <div className="font-medium text-sm">No players yet</div>
              <div className="text-xs text-white/60">Add players to see them on the field</div>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Bench Players (for basketball) or Legend (for other sports) */}
      {sport === 'basketball' && bench.length > 0 ? (
        <div className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 rounded-lg p-2 border border-gray-700 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="flex flex-wrap gap-2 justify-center relative">
            {bench.map((player) => {
              const isHovered = hoveredPlayer?.id === player.id;
              const isClicked = clickedPlayer?.id === player.id;
              const showTooltip = isHovered || isClicked;

              // Can this player swap? (has a position and there's a starter with that position)
              const canSwap = player.position && starters.some(s => s.position === player.position);

              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => canSwap ? handleBenchPlayerClick(player) : setClickedPlayer(isClicked ? null : player)}
                  onMouseEnter={() => setHoveredPlayer(player)}
                  onMouseLeave={() => setHoveredPlayer(null)}
                  className={`relative flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition-all duration-200 overflow-visible group/bench ${
                    showTooltip
                      ? 'bg-yellow-500/20 border-yellow-400/50 scale-105'
                      : canSwap
                      ? 'bg-gray-800/50 border-gray-700 hover:border-green-600 hover:bg-green-900/20 cursor-pointer'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-600 cursor-default'
                  }`}
                  style={{ minWidth: '60px' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/bench:opacity-100 transition-opacity pointer-events-none"></div>

                  <div className="relative">
                    {/* Jersey Number Circle */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-colors ${
                      showTooltip
                        ? 'bg-yellow-400 border-white text-green-900'
                        : 'bg-white border-green-700 text-green-700'
                    }`}>
                      {player.jersey_number || '?'}
                    </div>
                  </div>

                  {/* Player Name */}
                  <div className="text-[8px] text-white font-medium text-center leading-tight relative max-w-[60px] truncate">
                    {player.player_name.split(' ')[0]}
                  </div>

                  {/* Tooltip - Always to the right */}
                  {showTooltip && (
                    <div
                      className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md border border-gray-700 text-white px-3 py-2 rounded-lg shadow-2xl whitespace-nowrap z-30 pointer-events-none"
                    >
                      <div className="font-bold text-sm">{player.player_name}</div>
                      {player.position && <div className="text-gray-300 text-xs mt-0.5">{player.position}</div>}
                      {canSwap && <div className="text-green-400 text-xs mt-1 font-medium">Click to swap</div>}
                      {/* Arrow pointing left */}
                      <div className="absolute right-full -mr-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-800 border-t border-l border-gray-700 transform rotate-45" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 rounded-lg p-2 border border-gray-700 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="flex items-center gap-4 text-[10px] text-gray-300 relative">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-white border-2 border-green-700 rounded-full flex items-center justify-center font-bold text-[9px] text-green-700">
                10
              </div>
              <span>Hover to see info</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-yellow-400 border-2 border-white rounded-full flex items-center justify-center font-bold text-[9px] text-green-900">
                7
              </div>
              <span>Click for details</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
