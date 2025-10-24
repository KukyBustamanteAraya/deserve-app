/**
 * Master Size Definitions for Deserve Athletics
 *
 * Single source of truth for all sizing across the platform.
 *
 * DO NOT create size arrays elsewhere - import from this file.
 * To add a new size (e.g., 4XL), add it here and it will propagate everywhere.
 */

// ============================================================================
// SIZE RANGES
// ============================================================================

/**
 * Complete size range (from XXS to 3XL)
 * Used by the sizing calculator and database
 */
export const ALL_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'] as const;

/**
 * Standard adult sizes (most common range)
 * Used in most UI dropdowns and forms
 */
export const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

/**
 * Extended size range (includes XXL and beyond)
 * Used for comprehensive size selection (player forms, orders)
 */
export const EXTENDED_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'] as const;

/**
 * Legacy "XXXL" notation compatibility
 * Some parts of the codebase use "XXXL" instead of "3XL"
 */
export const SIZES_WITH_XXXL = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;

/**
 * Youth/smaller sizes
 * Includes XXS for younger athletes
 */
export const YOUTH_SIZES = ['XXS', 'XS', 'S', 'M', 'L'] as const;

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

/**
 * Complete size value type
 */
export type SizeValue = typeof ALL_SIZES[number];

/**
 * Standard size option type (for most forms)
 */
export type SizeOption = typeof EXTENDED_SIZES[number];

/**
 * Standard adult sizes type
 */
export type StandardSize = typeof STANDARD_SIZES[number];

/**
 * Legacy XXXL compatibility type
 */
export type SizeWithXXXL = typeof SIZES_WITH_XXXL[number];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get size order index for sorting
 * Returns -1 if size not found
 */
export function getSizeOrderIndex(size: string): number {
  return ALL_SIZES.indexOf(size as SizeValue);
}

/**
 * Sort sizes in correct order (XXS → 3XL)
 *
 * @example
 * sortSizes(['L', 'XS', 'XXL']) // ['XS', 'L', 'XXL']
 */
export function sortSizes<T extends string>(sizes: T[]): T[] {
  return sizes.sort((a, b) => {
    const indexA = getSizeOrderIndex(a);
    const indexB = getSizeOrderIndex(b);

    // If either size not found, maintain original order
    if (indexA === -1 || indexB === -1) return 0;

    return indexA - indexB;
  });
}

/**
 * Check if a size is valid
 */
export function isValidSize(size: string): size is SizeValue {
  return ALL_SIZES.includes(size as SizeValue);
}

/**
 * Normalize size notation
 * Converts "XXXL" to "3XL" for consistency
 */
export function normalizeSize(size: string): SizeValue | string {
  if (size === 'XXXL') return '3XL';
  if (size === '2XXL') return '2XL';
  return size;
}
