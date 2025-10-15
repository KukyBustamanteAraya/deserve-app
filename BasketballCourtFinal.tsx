import React from 'react';

interface PlayerPosition {
  name: string;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  number: string;
}

interface BasketballCourtProps {
  players?: PlayerPosition[];
  showPlayers?: boolean;
}

/**
 * NBA Half-Court Basketball Court with Players
 * Shows court with player positions by default
 */
export const BasketballCourt: React.FC<BasketballCourtProps> = ({ 
  players = [],
  showPlayers = true 
}) => {
  // NBA Half-Court Dimensions (in feet)
  const COURT_WIDTH = 50;
  const COURT_LENGTH = 43;
  const LINE_WIDTH = 0.15;
  
  // Key measurements from baseline
  const BASELINE = 0;
  const RIM_DISTANCE = 4;
  const KEY_WIDTH = 16;
  const KEY_DEPTH = 19;
  const BACKBOARD_WIDTH = 8;
  const FT_LINE = 19;
  const FT_CIRCLE_RADIUS = 6;
  const THREE_PT_DISTANCE = 23.75;
  const THREE_PT_CORNER_DISTANCE = 16.5;
  
  // Centered positions
  const centerX = COURT_WIDTH / 2;
  const keyLeft = centerX - KEY_WIDTH / 2;
  const keyRight = centerX + KEY_WIDTH / 2;
  const backboardLeft = centerX - BACKBOARD_WIDTH / 2;
  const backboardRight = centerX + BACKBOARD_WIDTH / 2;
  const cornerThreeX = 3;

  // Default player positions
  const defaultPlayers: PlayerPosition[] = [
    { name: 'Point Guard', x: 65, y: 82, number: '1' },      // Right of center, closer to half court
    { name: 'Shooting Guard', x: 20, y: 65, number: '2' },   // Left wing, closer to half court
    { name: 'Small Forward', x: 88, y: 48, number: '3' },    // Right wing, closer to sideline and half court
    { name: 'Power Forward', x: 12, y: 25, number: '4' },    // Left block, closer to sideline and half court
    { name: 'Center', x: 70, y: 18, number: '5' },           // Right block
  ];

  const playersToRender = players.length > 0 ? players : defaultPlayers;
  
  return (
    <div className="relative w-full" style={{ aspectRatio: '50/43' }}>
      {/* Basketball Court SVG */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${COURT_WIDTH} ${COURT_LENGTH}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Court background - light wood color */}
        <rect x={0} y={0} width={COURT_WIDTH} height={COURT_LENGTH} fill="#f5f5f0" />
        
        {/* All court lines in red */}
        <g
          stroke="#e21c21"
          strokeWidth={LINE_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Outer boundary rectangle */}
          <rect x={0} y={0} width={COURT_WIDTH} height={COURT_LENGTH} />
          
          {/* Half court / Midcourt line */}
          <line
            x1={0}
            y1={COURT_LENGTH}
            x2={COURT_WIDTH}
            y2={COURT_LENGTH}
            strokeWidth={LINE_WIDTH * 1.5}
          />
          
          {/* Center circle at half court */}
          <circle cx={centerX} cy={COURT_LENGTH} r={6} />
          
          {/* Backboard (2.5ft from baseline, 8ft wide) */}
          <line
            x1={backboardLeft}
            y1={2.5}
            x2={backboardRight}
            y2={2.5}
            strokeWidth={LINE_WIDTH * 2}
          />
          
          {/* Basketball rim (orange) */}
          <circle
            cx={centerX}
            cy={RIM_DISTANCE}
            r={0.75}
            stroke="#ff6b35"
            strokeWidth={LINE_WIDTH * 2}
            fill="none"
          />
          
          {/* Paint/Key area (16ft wide × 19ft deep) */}
          <rect
            x={keyLeft}
            y={BASELINE}
            width={KEY_WIDTH}
            height={KEY_DEPTH}
          />
          
          {/* Free throw line */}
          <line
            x1={keyLeft}
            y1={FT_LINE}
            x2={keyRight}
            y2={FT_LINE}
          />
          
          {/* Free throw circle - curves toward basket (inside the paint) */}
          <path
            d={`M ${keyLeft} ${FT_LINE} 
                A ${FT_CIRCLE_RADIUS} ${FT_CIRCLE_RADIUS} 0 0 0 ${keyRight} ${FT_LINE}`}
          />
          
          {/* Three-point line - Left corner straight section */}
          <line
            x1={cornerThreeX}
            y1={BASELINE}
            x2={cornerThreeX}
            y2={THREE_PT_CORNER_DISTANCE}
          />
          
          {/* Three-point line - Right corner straight section */}
          <line
            x1={COURT_WIDTH - cornerThreeX}
            y1={BASELINE}
            x2={COURT_WIDTH - cornerThreeX}
            y2={THREE_PT_CORNER_DISTANCE}
          />
          
          {/* Three-point arc connecting the corners - CURVING AWAY from basket */}
          <path
            d={`M ${cornerThreeX} ${THREE_PT_CORNER_DISTANCE}
                A ${THREE_PT_DISTANCE} ${THREE_PT_DISTANCE} 0 0 0 ${COURT_WIDTH - cornerThreeX} ${THREE_PT_CORNER_DISTANCE}`}
          />
          
          {/* Lane hash marks (block positions) */}
          {[7, 8.5, 11, 14].map((distance, i) => (
            <g key={i}>
              {/* Left side block */}
              <line
                x1={keyLeft - 0.67}
                y1={distance}
                x2={keyLeft}
                y2={distance}
                strokeWidth={LINE_WIDTH * 1.2}
              />
              {/* Right side block */}
              <line
                x1={keyRight}
                y1={distance}
                x2={keyRight + 0.67}
                y2={distance}
                strokeWidth={LINE_WIDTH * 1.2}
              />
            </g>
          ))}
        </g>
      </svg>

      {/* Player markers */}
      {showPlayers && playersToRender.map((player, idx) => (
        <div
          key={idx}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-110"
          style={{
            left: `${player.x}%`,
            top: `${player.y}%`,
          }}
        >
          <div className="relative group">
            {/* Player circle */}
            <div className="w-10 h-10 bg-gray-900 border-3 border-red-600 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-lg group-hover:bg-red-600 group-hover:border-gray-900 transition-all cursor-pointer">
              {player.number}
            </div>
            
            {/* Hover tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-3 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {player.name}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BasketballCourt;
