import { NextRequest } from 'next/server';
import { queryProducts } from '@/lib/catalog/queryProducts';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { apiSuccess, apiError, apiUnauthorized, apiValidationError } from '@/lib/api-response';

// GET /api/catalog/products - List products with filtering
// Single source of truth for product listings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const sport = searchParams.get('sport');
    const sportId = searchParams.get('sport_id');
    const limit = Number(searchParams.get('limit') || 24);
    const cursor = searchParams.get('cursor');

    const result = await queryProducts({
      sport,
      sportId,
      limit,
      cursor
    });

    const response = apiSuccess(result);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error: any) {
    logger.error('products api error:', error);
    const response = apiError('Failed to load products', 500);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
}

// POST /api/catalog/products - Create new product (admin only)
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return apiUnauthorized();
  }

  try {
    const body = await request.json();

    // Extract fields
    const {
      sport_ids,
      category,
      name,
      slug,
      price_cents,
      status: productStatus,
      product_type_slug
    } = body;

    // Validate required fields
    if (!sport_ids || !Array.isArray(sport_ids) || sport_ids.length === 0) {
      return apiValidationError('Missing required field: sport_ids (must be non-empty array)');
    }
    if (!category || !name) {
      return apiValidationError('Missing required fields: category, name');
    }
    if (!price_cents || price_cents <= 0) {
      return apiValidationError('Missing or invalid price_cents');
    }

    // Check slug uniqueness
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingProduct) {
      return apiError(`Slug "${slug}" already exists. Please choose a different one.`, 409);
    }

    // Build insert payload
    // Products can span multiple sports (e.g., Premium Jersey for Soccer, Basketball, Volleyball)
    // Price is set per product (custom pricing)
    // Products don't have their own images - they display design mockups
    const typeSlug = product_type_slug || category;
    const insertPayload: any = {
      sport_ids: sport_ids,              // Array of sport IDs
      category,
      name,
      slug,
      product_type_slug: typeSlug,
      price_cents: price_cents,
      retail_price_cents: price_cents,
      base_price_cents: price_cents,
      status: productStatus || 'draft',
      created_by: user.id
    };

    // Insert product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert([insertPayload])
      .select()
      .single();

    if (productError) {
      return apiError(productError.message, 500);
    }

    return apiSuccess({ product }, 'Product created successfully', 201);
  } catch (error: any) {
    return apiValidationError(error.message || 'Invalid request');
  }
}