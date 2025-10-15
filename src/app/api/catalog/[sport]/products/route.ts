// GET /api/catalog/[sport]/products
// Returns list of product types available for a specific sport
// Example: GET /api/catalog/futbol/products

import { createSupabaseServer } from '@/lib/supabase/server-client';
import { apiSuccess, apiError } from '@/lib/api-response';
import { logger } from '@/lib/logger';

export async function GET(
  request: Request,
  { params }: { params: { sport: string } }
) {
  try {
    const { sport: sportSlug } = params;
    const supabase = createSupabaseServer();

    // 1. Look up sport by slug
    const { data: sport, error: sportError } = await supabase
      .from('sports')
      .select('id, name, slug')
      .eq('slug', sportSlug)
      .single();

    if (sportError || !sport) {
      logger.error('Sport not found:', sportSlug);
      return apiError(`Sport "${sportSlug}" not found`, 404);
    }

    // 2. Get all products for this sport
    // Products can span multiple sports via sport_ids array
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        category,
        price_clp,
        status,
        product_type_slug,
        product_type_name,
        sort_order,
        sport_ids
      `)
      .eq('status', 'active')
      .contains('sport_ids', [sport.id])
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (productsError) {
      logger.error('Error fetching products:', productsError);
      return apiError('Failed to fetch products', 500);
    }

    if (!products || products.length === 0) {
      return apiSuccess([], `No products found for ${sport.name}`);
    }

    // 3. For each product, count how many designs are available
    // Designs are available if they have at least one design_mockup for this sport+product
    const productsWithDesignCounts = await Promise.all(
      products.map(async (product) => {
        // Count unique designs that have mockups for this sport+product combination
        const { count: designCount } = await supabase
          .from('design_mockups')
          .select('design_id', { count: 'exact', head: true })
          .eq('sport_id', sport.id)
          .eq('product_id', product.id);

        // Get a sample primary mockup for this product+sport
        const { data: sampleMockup } = await supabase
          .from('design_mockups')
          .select('mockup_url')
          .eq('sport_id', sport.id)
          .eq('product_id', product.id)
          .eq('is_primary', true)
          .limit(1)
          .single();

        return {
          product_id: product.id,
          product_name: product.name,
          product_slug: product.slug,
          product_type_slug: product.product_type_slug,
          product_type_name: product.product_type_name || product.name,
          category: product.category,
          price_clp: product.price_clp,
          available_designs_count: designCount || 0,
          sample_design_mockup: sampleMockup?.mockup_url || null,
          sort_order: product.sort_order,
        };
      })
    );

    // 4. Return product catalog for this sport
    return apiSuccess(
      {
        sport: {
          id: sport.id,
          slug: sport.slug,
          name: sport.name,
        },
        products: productsWithDesignCounts,
        total_products: productsWithDesignCounts.length,
      },
      `Found ${productsWithDesignCounts.length} product(s) for ${sport.name}`
    );

  } catch (error) {
    logger.error('Unexpected error in catalog products API:', error);
    return apiError('An unexpected error occurred');
  }
}

// Disable other HTTP methods
export async function POST() {
  return apiError('Method not allowed', 405);
}

export async function PATCH() {
  return apiError('Method not allowed', 405);
}

export async function PUT() {
  return apiError('Method not allowed', 405);
}

export async function DELETE() {
  return apiError('Method not allowed', 405);
}
