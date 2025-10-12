/**
 * Sports Slug Mapping
 *
 * Maps Spanish database slugs to English field layout keys
 * This ensures field visualizations work correctly with Spanish sport names
 */

export type SpanishSportSlug = 'futbol' | 'basquetbol' | 'voleibol' | 'rugby';
export type EnglishSportSlug = 'soccer' | 'basketball' | 'volleyball' | 'rugby';

/**
 * Map Spanish DB slugs to English field layout keys
 */
export const SPANISH_TO_ENGLISH_SPORT_MAP: Record<SpanishSportSlug, EnglishSportSlug> = {
  'futbol': 'soccer',
  'basquetbol': 'basketball',
  'voleibol': 'volleyball',
  'rugby': 'rugby'
};

/**
 * Map English slugs back to Spanish DB slugs
 */
export const ENGLISH_TO_SPANISH_SPORT_MAP: Record<EnglishSportSlug, SpanishSportSlug> = {
  'soccer': 'futbol',
  'basketball': 'basquetbol',
  'volleyball': 'voleibol',
  'rugby': 'rugby'
};

/**
 * Sport display information (matches database)
 */
export const SPORT_INFO: Record<SpanishSportSlug, {
  slug: SpanishSportSlug;
  displayName: string;
  emoji: string;
  englishSlug: EnglishSportSlug;
}> = {
  'futbol': {
    slug: 'futbol',
    displayName: 'Fútbol',
    emoji: '⚽',
    englishSlug: 'soccer'
  },
  'basquetbol': {
    slug: 'basquetbol',
    displayName: 'Básquetbol',
    emoji: '🏀',
    englishSlug: 'basketball'
  },
  'voleibol': {
    slug: 'voleibol',
    displayName: 'Vóleibol',
    emoji: '🏐',
    englishSlug: 'volleyball'
  },
  'rugby': {
    slug: 'rugby',
    displayName: 'Rugby',
    emoji: '🏉',
    englishSlug: 'rugby'
  }
};

/**
 * Convert Spanish DB slug to English layout key
 */
export function toEnglishSlug(spanishSlug: string): EnglishSportSlug {
  const mapped = SPANISH_TO_ENGLISH_SPORT_MAP[spanishSlug as SpanishSportSlug];
  if (!mapped) {
    console.warn(`Unknown Spanish sport slug: ${spanishSlug}, defaulting to soccer`);
    return 'soccer';
  }
  return mapped;
}

/**
 * Convert English layout key to Spanish DB slug
 */
export function toSpanishSlug(englishSlug: string): SpanishSportSlug {
  const mapped = ENGLISH_TO_SPANISH_SPORT_MAP[englishSlug as EnglishSportSlug];
  if (!mapped) {
    console.warn(`Unknown English sport slug: ${englishSlug}, defaulting to futbol`);
    return 'futbol';
  }
  return mapped;
}

/**
 * Get sport info by Spanish slug
 */
export function getSportInfo(spanishSlug: string) {
  return SPORT_INFO[spanishSlug as SpanishSportSlug] || SPORT_INFO['futbol'];
}

/**
 * Check if a slug is a valid Spanish sport slug
 */
export function isValidSpanishSlug(slug: string): slug is SpanishSportSlug {
  return slug in SPANISH_TO_ENGLISH_SPORT_MAP;
}

/**
 * Check if a slug is a valid English sport slug
 */
export function isValidEnglishSlug(slug: string): slug is EnglishSportSlug {
  return slug in ENGLISH_TO_SPANISH_SPORT_MAP;
}
