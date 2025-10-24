// Fabric recommendation logic: merge universal + sport overrides

import { createSupabaseServer } from '@/lib/supabase/server-client';
import type { FabricRecommendation } from '@/types/taxonomy';
import { logger } from '@/lib/logger';

/**
 * Get fabric recommendations for a product type, optionally with sport-specific overrides
 * @param productTypeSlug - The product type (e.g., 'jersey', 'golf-pants')
 * @param sportSlug - Optional sport for overrides (e.g., 'rugby')
 * @returns Sorted array of fabric recommendations (highest suitability first)
 */
export async function getFabricRecommendations(
  productTypeSlug: string,
  sportSlug?: string | null
): Promise<FabricRecommendation[]> {
  const supabase = await createSupabaseServer();

  // 1. Get universal recommendations for this product type
  const { data: universalRecs, error: universalError } = await supabase
    .from('product_fabric_recommendations')
    .select('fabric_name, suitability')
    .eq('product_type_slug', productTypeSlug);

  if (universalError) {
    logger.error('Error fetching universal fabric recommendations:', universalError);
    return [];
  }

  // Create a map of fabric -> suitability for easy merging
  const fabricMap = new Map<string, number>();

  (universalRecs || []).forEach(rec => {
    fabricMap.set(rec.fabric_name, rec.suitability);
  });

  // 2. If sport is provided, get and merge sport-specific overrides
  if (sportSlug) {
    const { data: overrides, error: overrideError } = await supabase
      .from('sport_fabric_overrides')
      .select('fabric_name, suitability')
      .eq('sport_slug', sportSlug)
      .eq('product_type_slug', productTypeSlug);

    if (!overrideError && overrides) {
      overrides.forEach(override => {
        // Override takes precedence
        fabricMap.set(override.fabric_name, override.suitability);
      });
    }
  }

  // 3. Convert map to array and sort by suitability (descending)
  const recommendations: FabricRecommendation[] = Array.from(fabricMap.entries())
    .map(([fabric_name, suitability]) => ({ fabric_name, suitability }))
    .sort((a, b) => b.suitability - a.suitability);

  return recommendations;
}

/**
 * Normalize fabric alias to canonical name
 * @param fabricName - The fabric name (may be an alias)
 * @returns Canonical fabric name
 */
export async function normalizeFabricName(fabricName: string): Promise<string> {
  const supabase = await createSupabaseServer();

  const { data: alias } = await supabase
    .from('fabric_aliases')
    .select('canonical_name')
    .eq('alias', fabricName)
    .single();

  return alias?.canonical_name || fabricName;
}

/**
 * Get all available fabrics with details
 */
export async function getAllFabrics() {
  const supabase = await createSupabaseServer();

  const { data: fabrics, error } = await supabase
    .from('fabrics')
    .select('*')
    .order('name');

  if (error) {
    logger.error('Error fetching fabrics:', error);
    return [];
  }

  return fabrics || [];
}
