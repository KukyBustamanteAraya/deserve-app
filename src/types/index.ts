// Barrel export for all types (conflict-safe)
export * from './catalog';

// Taxonomy: re-export explicitly, renaming Sport → TaxonomySport
export type {
  Sport as TaxonomySport,
  ProductType,
  Bundle,
  FabricRecommendation,
  FabricAlias,
} from './taxonomy';

export * from './roster';
export * from './design';
export * from './orders';
export * from './products';
export * from './user';
