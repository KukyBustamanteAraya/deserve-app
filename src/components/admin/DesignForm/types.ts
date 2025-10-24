export interface Sport {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  price_clp: number;
  sport_ids: number[];
  product_type_slug: string;
}

// Design Image - represents an actual design image for a specific sport+product combination
// Note: Database table is called "design_mockups" for backward compatibility
// but these are actual design images, not mockups (mockups are for customer customizations)
export interface DesignImage {
  id?: string;
  sport_id: string;
  product_type_slug: string;
  product_id?: string;
  mockup_url: string;
  view_angle: string;
  is_primary: boolean;
  sort_order: number;
  sports?: Sport;
  product?: Product;
  _isNew?: boolean;
  _file?: File;
}

export interface Design {
  id?: string;
  name: string;
  slug: string;
  description: string;
  designer_name: string;
  style_tags: string[];
  color_scheme: string[];
  is_customizable: boolean;
  allows_recoloring: boolean;
  featured: boolean;
  active: boolean;
  design_mockups?: DesignImage[];
}

export interface DesignFormProps {
  design?: Design;
  mode: 'create' | 'edit';
}
