// Taxonomy types for product types, sports, bundles, and fabric recommendations

export interface ProductType {
  id: number;
  slug: string;
  display_name: string;
  category: 'Top' | 'Bottom' | 'Outerwear' | 'Socks' | 'Accessory';
  variant: string | null;
  notes: string | null;
  created_at: string;
}

export interface Sport {
  slug: string;
  display_name: string;
  created_at: string;
}

export interface BundleComponent {
  type_slug: string;
  qty: number;
}

export interface Bundle {
  id: number;
  code: string;
  name: string;
  description: string | null;
  components: BundleComponent[];
  created_at: string;
}

export interface FabricRecommendation {
  fabric_name: string;
  suitability: number;
}

export interface FabricAlias {
  alias: string;
  canonical_name: string;
}
