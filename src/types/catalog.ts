// Types for catalog data structures
export interface Sport {
  id: string;
  slug: string;
  name: string;
  created_at: string;
}

export interface ProductBase {
  id: string;
  sport_id?: string | null;                    // DEPRECATED: For backward compatibility
  sport_ids: number[];                         // Array of sport IDs (products can span multiple sports)
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  base_price_cents?: number | null;
  retail_price_cents?: number | null;
  display_price_cents?: number;
  active: boolean;
  product_type_slug?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  created_at: string;
}

export interface ProductDetail extends ProductBase {
  sport_slug?: string;                         // DEPRECATED: First sport for backward compatibility
  sport_name?: string;                         // DEPRECATED: First sport for backward compatibility
  sports?: Array<{ slug: string; name: string }>; // NEW: All sports this product is available for
  images: ProductImage[];
}

export type ProductListItem = {
  id: number | string;
  slug: string | null;
  name: string;
  price_cents: number | null;
  base_price_cents?: number | null;
  retail_price_cents?: number | null;
  display_price_cents: number;
  active: boolean | null;
  thumbnail_url: string | null;
  thumbnail_alt?: string | null;
  sport_name?: string;
};

export type ProductListResult = {
  items: ProductListItem[];
  total: number;
  nextCursor: string | null;
};

export interface Team {
  id: string;
  name: string;
  slug: string;
  sport_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'customer' | 'admin';
  team_id: string | null;
  created_at: string;
  updated_at: string;
}

// Legacy type for backwards compatibility
export interface Product extends ProductBase {}
export interface ProductWithDetails extends ProductDetail {}

// Composite types for API responses
export interface CatalogPreviewResponse {
  sports: Sport[];
  products: ProductWithDetails[];
  total_products: number;
}

// Utility types
export type SportSlug = 'soccer' | 'basketball' | 'volleyball' | 'rugby' | 'golf';

export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

// Currency types
export type Currency = 'CLP' | 'USD' | 'EUR';

export interface PriceFormat {
  cents: number;
  currency?: Currency;
}