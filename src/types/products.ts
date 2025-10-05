// Product types for the Deserve app catalog

export type ProductStatus = 'draft' | 'active' | 'archived';

export type ApparelCategory = 'camiseta' | 'shorts' | 'poleron' | 'medias' | 'chaqueta';

export interface Product {
  id: string;
  sport_id: string;
  category: ApparelCategory;
  name: string;
  slug: string;
  description?: string;
  price_cents: number;
  status: ProductStatus;
  hero_path?: string;
  tags: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
  images?: ProductImage[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  path: string;
  alt?: string;
  position: number;
  created_at: string;
}
