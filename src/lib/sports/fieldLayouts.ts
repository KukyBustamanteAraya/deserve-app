// Sport-specific field layouts with position coordinates
import { toEnglishSlug, isValidSpanishSlug } from './sportsMapping';

export type SportSlug = 'soccer' | 'basketball' | 'volleyball' | 'baseball' | 'rugby' | 'golf' | 'crossfit' | 'training' | 'padel' | 'yoga-pilates';

export interface FieldPosition {
  name: string;
  abbr: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
}

export interface FieldLayout {
  sport: SportSlug;
  positions: FieldPosition[];
  fieldType: 'horizontal' | 'vertical';
  aspectRatio: string;
}

// Soccer - Vertical orientation
export const soccerLayout: FieldLayout = {
  sport: 'soccer',
  fieldType: 'vertical',
  aspectRatio: '2/3',
  positions: [
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
  ],
};

// Basketball - Horizontal orientation
export const basketballLayout: FieldLayout = {
  sport: 'basketball',
  fieldType: 'horizontal',
  aspectRatio: '16/9',
  positions: [
    { name: 'Point Guard', x: 30, y: 50, abbr: 'PG' },
    { name: 'Shooting Guard', x: 50, y: 30, abbr: 'SG' },
    { name: 'Small Forward', x: 65, y: 50, abbr: 'SF' },
    { name: 'Power Forward', x: 75, y: 35, abbr: 'PF' },
    { name: 'Center', x: 80, y: 50, abbr: 'C' },
  ],
};

// Volleyball - Horizontal orientation
export const volleyballLayout: FieldLayout = {
  sport: 'volleyball',
  fieldType: 'horizontal',
  aspectRatio: '3/2',
  positions: [
    { name: 'Setter', x: 65, y: 50, abbr: 'S' },
    { name: 'Outside Hitter (Left)', x: 40, y: 30, abbr: 'OH' },
    { name: 'Outside Hitter (Right)', x: 40, y: 70, abbr: 'OH' },
    { name: 'Middle Blocker (Left)', x: 65, y: 35, abbr: 'MB' },
    { name: 'Middle Blocker (Right)', x: 65, y: 65, abbr: 'MB' },
    { name: 'Opposite Hitter', x: 65, y: 50, abbr: 'OP' },
    { name: 'Libero', x: 40, y: 50, abbr: 'L' },
  ],
};

// Baseball - Diamond shape
export const baseballLayout: FieldLayout = {
  sport: 'baseball',
  fieldType: 'horizontal',
  aspectRatio: '1/1',
  positions: [
    { name: 'Pitcher', x: 50, y: 60, abbr: 'P' },
    { name: 'Catcher', x: 50, y: 90, abbr: 'C' },
    { name: 'First Base', x: 70, y: 70, abbr: '1B' },
    { name: 'Second Base', x: 50, y: 40, abbr: '2B' },
    { name: 'Third Base', x: 30, y: 70, abbr: '3B' },
    { name: 'Shortstop', x: 40, y: 50, abbr: 'SS' },
    { name: 'Left Field', x: 20, y: 20, abbr: 'LF' },
    { name: 'Center Field', x: 50, y: 10, abbr: 'CF' },
    { name: 'Right Field', x: 80, y: 20, abbr: 'RF' },
  ],
};

// Rugby - Vertical orientation
export const rugbyLayout: FieldLayout = {
  sport: 'rugby',
  fieldType: 'vertical',
  aspectRatio: '2/3',
  positions: [
    { name: 'Fullback', x: 50, y: 95, abbr: 'FB' },
    { name: 'Left Wing', x: 15, y: 85, abbr: 'LW' },
    { name: 'Right Wing', x: 85, y: 85, abbr: 'RW' },
    { name: 'Outside Center', x: 35, y: 75, abbr: 'OC' },
    { name: 'Inside Center', x: 65, y: 75, abbr: 'IC' },
    { name: 'Fly-half', x: 50, y: 65, abbr: 'FH' },
    { name: 'Scrum-half', x: 50, y: 55, abbr: 'SH' },
    { name: 'Number 8', x: 50, y: 45, abbr: '8' },
    { name: 'Flanker (Left)', x: 30, y: 40, abbr: 'FL' },
    { name: 'Flanker (Right)', x: 70, y: 40, abbr: 'FR' },
    { name: 'Lock (Left)', x: 35, y: 35, abbr: 'LK' },
    { name: 'Lock (Right)', x: 65, y: 35, abbr: 'LK' },
    { name: 'Prop (Left)', x: 30, y: 28, abbr: 'LP' },
    { name: 'Hooker', x: 50, y: 28, abbr: 'HK' },
    { name: 'Prop (Right)', x: 70, y: 28, abbr: 'RP' },
  ],
};

// Golf - Simple course layout
export const golfLayout: FieldLayout = {
  sport: 'golf',
  fieldType: 'horizontal',
  aspectRatio: '16/9',
  positions: [
    { name: 'Player', x: 50, y: 50, abbr: 'P' },
  ],
};

// CrossFit - Training area
export const crossfitLayout: FieldLayout = {
  sport: 'crossfit',
  fieldType: 'horizontal',
  aspectRatio: '16/9',
  positions: [
    { name: 'Athlete', x: 50, y: 50, abbr: 'A' },
  ],
};

// Training - General training
export const trainingLayout: FieldLayout = {
  sport: 'training',
  fieldType: 'horizontal',
  aspectRatio: '16/9',
  positions: [
    { name: 'Athlete', x: 50, y: 50, abbr: 'A' },
  ],
};

// Padel - Horizontal court
export const padelLayout: FieldLayout = {
  sport: 'padel',
  fieldType: 'horizontal',
  aspectRatio: '3/2',
  positions: [
    { name: 'Player 1 (Left)', x: 35, y: 40, abbr: 'P1' },
    { name: 'Player 1 (Right)', x: 35, y: 60, abbr: 'P1' },
    { name: 'Player 2 (Left)', x: 65, y: 40, abbr: 'P2' },
    { name: 'Player 2 (Right)', x: 65, y: 60, abbr: 'P2' },
  ],
};

// Yoga/Pilates - Studio layout
export const yogaPilatesLayout: FieldLayout = {
  sport: 'yoga-pilates',
  fieldType: 'horizontal',
  aspectRatio: '16/9',
  positions: [
    { name: 'Participant', x: 50, y: 50, abbr: 'P' },
  ],
};

// Lookup function - supports both English and Spanish slugs
export function getFieldLayout(sport: SportSlug | string): FieldLayout {
  // Convert Spanish slug to English if needed
  let sportKey: SportSlug = sport as SportSlug;

  if (isValidSpanishSlug(sport)) {
    sportKey = toEnglishSlug(sport) as SportSlug;
  }

  switch (sportKey) {
    case 'soccer':
      return soccerLayout;
    case 'basketball':
      return basketballLayout;
    case 'volleyball':
      return volleyballLayout;
    case 'baseball':
      return baseballLayout;
    case 'rugby':
      return rugbyLayout;
    case 'golf':
      return golfLayout;
    case 'crossfit':
      return crossfitLayout;
    case 'training':
      return trainingLayout;
    case 'padel':
      return padelLayout;
    case 'yoga-pilates':
      return yogaPilatesLayout;
    default:
      console.warn(`Unknown sport slug: ${sport}, using soccer layout`);
      return soccerLayout; // Fallback
  }
}

// Helper to match player position to field coordinate
// Supports both Spanish and English sport slugs
export function findPositionCoordinates(
  sport: SportSlug | string,
  playerPosition: string
): { x: number; y: number } | null {
  const layout = getFieldLayout(sport);
  const position = layout.positions.find(
    (pos) =>
      pos.name.toLowerCase() === playerPosition.toLowerCase() ||
      pos.abbr.toLowerCase() === playerPosition.toLowerCase()
  );

  return position ? { x: position.x, y: position.y } : null;
}
