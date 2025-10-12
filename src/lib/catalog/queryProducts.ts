// Helper to fetch & shape products with standardized response
import { createSupabaseServer } from '@/lib/supabase/server-client';
import type { ProductListItem, ProductListResult } from '@/types/catalog';
import { logger } from '@/lib/logger';

export interface QueryProductsOptions {
  sport?: string | null;
  sportId?: string | null;
  limit?: number;
  cursor?: string | null; // for future pagination
}

/**
 * Query products with standardized ProductListResult format
 * Uses ACTUAL database schema: path, alt, position (not url, alt_text, sort_order)
 */
export async function queryProducts(options: QueryProductsOptions = {}): Promise<ProductListResult> {
  const { sport, sportId, limit = 12, cursor = null } = options;
  const supabase = createSupabaseServer();

  try {
    // 1) Build count query - filter by status='active' not active=true
    let countQuery = supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Filter by sport_ids array if provided (products can span multiple sports)
    if (sportId) {
      // Check if sport_ids array contains this sportId
      countQuery = countQuery.contains('sport_ids', [parseInt(sportId)]);
    }
    // If sport slug is provided, need to look up sport_id first
    else if (sport) {
      const { data: sportData } = await supabase
        .from('sports')
        .select('id')
        .eq('slug', sport)
        .single();

      if (sportData) {
        // Check if sport_ids array contains this sport's id
        countQuery = countQuery.contains('sport_ids', [sportData.id]);
      }
    }

    const { count } = await countQuery;

    // 2) Build items query - uses OLD schema: path, alt, position
    //    Filter by status='active' (enum) not active (boolean)
    //    Include all price fields for display_price_cents calculation
    //    Updated to use sport_ids array (products can span multiple sports)
    let itemsQuery = supabase
      .from('products')
      .select(`
        id,
        slug,
        name,
        price_cents,
        base_price_cents,
        retail_price_cents,
        status,
        sport_ids,
        product_images!left (
          path,
          alt,
          position
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by sport_ids array if provided (products can span multiple sports)
    if (sportId) {
      // Check if sport_ids array contains this sportId
      itemsQuery = itemsQuery.contains('sport_ids', [parseInt(sportId)]);
    }
    // If sport slug is provided, need to look up sport_id first
    else if (sport) {
      const { data: sportData } = await supabase
        .from('sports')
        .select('id')
        .eq('slug', sport)
        .single();

      if (sportData) {
        // Check if sport_ids array contains this sport's id
        itemsQuery = itemsQuery.contains('sport_ids', [sportData.id]);
      }
    }

    const { data: rows, error } = await itemsQuery;

    if (error) {
      logger.error('queryProducts error:', error);
      throw error;
    }

    // 3) Transform to ProductListItem[] format
    const items: ProductListItem[] = (rows || []).map((p: any) => {
      // Find first image by position (OLD schema)
      const firstImage = Array.isArray(p.product_images)
        ? p.product_images.sort((a: any, b: any) => (a.position || 0) - (b.position || 0))[0]
        : null;

      // Construct full Supabase Storage URL if path exists
      const thumbnailUrl = firstImage?.path
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${firstImage.path}`
        : null;

      // Calculate display_price_cents: COALESCE(retail_price_cents, price_cents, base_price_cents, 0)
      const display_price_cents = p.retail_price_cents ?? p.price_cents ?? p.base_price_cents ?? 0;

      // Log warning if product has no price data
      if (!p.retail_price_cents && !p.price_cents && !p.base_price_cents) {
        logger.warn(`⚠️  Product ${p.id} (${p.slug}) has no price data. Suggested fix: UPDATE products SET base_price_cents = price_cents WHERE id = ${p.id};`);
      }

      return {
        id: p.id,
        slug: p.slug ?? null,
        name: p.name,
        price_cents: p.price_cents ?? null,
        base_price_cents: p.base_price_cents ?? null,
        retail_price_cents: p.retail_price_cents ?? null,
        display_price_cents,
        active: p.status === 'active',  // Map status enum to boolean
        thumbnail_url: thumbnailUrl,  // Full Supabase Storage URL
      };
    });

    return {
      items,
      total: count ?? items.length,
      nextCursor: null, // Add keyset/offset pagination later if needed
    };

  } catch (error) {
    logger.error('queryProducts failed:', error);
    // Return safe empty result on error
    return {
      items: [],
      total: 0,
      nextCursor: null,
    };
  }
}
