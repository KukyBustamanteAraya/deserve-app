// Shared utility functions for team pages

import type { SportSlug } from '@/lib/sports/fieldLayouts';

// Map common sport names to SportSlug
export function mapSportToSlug(sport?: string): SportSlug {
  if (!sport) return 'futbol';
  const normalized = sport.toLowerCase().trim();

  if (normalized.includes('soccer') || normalized.includes('futbol') || normalized.includes('fútbol')) {
    return 'futbol';
  }
  if (normalized.includes('basketball') || normalized.includes('basquetbol')) {
    return 'basketball';
  }
  if (normalized.includes('volleyball') || normalized.includes('voleibol')) {
    return 'volleyball';
  }
  if (normalized.includes('baseball') || normalized.includes('béisbol')) {
    return 'baseball';
  }
  if (normalized.includes('rugby')) {
    return 'rugby';
  }

  return 'futbol'; // Default fallback
}

// Get emoji for sport slug
export function getEmojiForSport(sportSlug: string): string {
  return '';
}
