// Product types for the Deserve app catalog

export type ProductStatus = 'draft' | 'active' | 'archived';

export type ApparelCategory = 'camiseta' | 'shorts' | 'poleron' | 'medias' | 'chaqueta';

export interface Product {
  id: string;
  sport_id?: string;                      // DEPRECATED: Use sport_ids instead
  sport_ids: number[];                    // Array of sport IDs (e.g., [1, 2, 3] for Soccer, Basketball, Volleyball)
  category: ApparelCategory;
  name: string;
  slug: string;
  description?: string;
  price_clp: number;                      // Custom price in Chilean Pesos (full amount, not cents)
  status: ProductStatus;
  hero_path?: string;                     // DEPRECATED: Products display design mockups
  icon_url?: string;                      // Product symbol/icon URL for selection grids
  tags: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
  images?: ProductImage[];                // DEPRECATED: Products display design mockups
}

export interface ProductImage {
  id: string;
  product_id: string;
  path: string;
  alt?: string;
  position: number;
  created_at: string;
}
