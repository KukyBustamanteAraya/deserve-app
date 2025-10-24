/**
 * Product Categories for Deserve Athletics
 *
 * Single source of truth for product types and categories.
 *
 * DO NOT hardcode product categories elsewhere - import from this file.
 */

// ============================================================================
// PRODUCT CATEGORIES
// ============================================================================

/**
 * All product categories available in Deserve Athletics catalog
 */
export const PRODUCT_CATEGORIES = [
  'camiseta',   // Jerseys / T-shirts
  'shorts',     // Shorts
  'poleron',    // Hoodies / Sweatshirts
  'medias',     // Socks
  'chaqueta',   // Jackets
] as const;

/**
 * Product category type
 */
export type ProductCategory = typeof PRODUCT_CATEGORIES[number];

// ============================================================================
// DISPLAY LABELS
// ============================================================================

/**
 * Human-readable labels for product categories (Spanish)
 */
export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  camiseta: 'Camiseta',
  shorts: 'Shorts',
  poleron: 'Polerón',
  medias: 'Medias',
  chaqueta: 'Chaqueta',
};

/**
 * English translations (for admin/internal use)
 */
export const PRODUCT_CATEGORY_LABELS_EN: Record<ProductCategory, string> = {
  camiseta: 'Jersey',
  shorts: 'Shorts',
  poleron: 'Hoodie',
  medias: 'Socks',
  chaqueta: 'Jacket',
};

/**
 * Plural forms (Spanish)
 */
export const PRODUCT_CATEGORY_LABELS_PLURAL: Record<ProductCategory, string> = {
  camiseta: 'Camisetas',
  shorts: 'Shorts',
  poleron: 'Polerones',
  medias: 'Medias',
  chaqueta: 'Chaquetas',
};

// ============================================================================
// PRODUCT METADATA
// ============================================================================

/**
 * Product category icons (for UI)
 */
export const PRODUCT_CATEGORY_ICONS: Record<ProductCategory, string> = {
  camiseta: '👕',
  shorts: '🩳',
  poleron: '🧥',
  medias: '🧦',
  chaqueta: '🧥',
};

/**
 * Product categories that require sizing
 */
export const SIZED_PRODUCT_CATEGORIES: ProductCategory[] = [
  'camiseta',
  'shorts',
  'poleron',
  'chaqueta',
];

/**
 * Product categories that typically don't require sizing (or use different sizing)
 */
export const UNSIZED_PRODUCT_CATEGORIES: ProductCategory[] = [
  'medias',
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a product category is valid
 */
export function isValidProductCategory(category: string): category is ProductCategory {
  return PRODUCT_CATEGORIES.includes(category as ProductCategory);
}

/**
 * Get display label for a product category
 */
export function getProductCategoryLabel(category: ProductCategory, plural = false): string {
  return plural
    ? PRODUCT_CATEGORY_LABELS_PLURAL[category]
    : PRODUCT_CATEGORY_LABELS[category];
}

/**
 * Check if a product category requires sizing
 */
export function requiresSizing(category: ProductCategory): boolean {
  return SIZED_PRODUCT_CATEGORIES.includes(category);
}
