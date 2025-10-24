export interface Design {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  designer_name: string | null;
  style_tags: string[];
  color_scheme: string[];
  is_customizable: boolean;
  allows_recoloring: boolean;
  featured: boolean;
  active: boolean;
  created_at: string;
  mockup_count?: number;
  available_sports?: string[];
  available_product_types?: string[];
  primary_mockup_url?: string | null;
}

export interface FilterState {
  searchQuery: string;
  statusFilter: string;
  featuredFilter: string;
  sportFilter: string;
  sortBy: string;
  productTypeFilter: string;
}
