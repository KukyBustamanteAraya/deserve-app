// GET /api/catalog/products/[slug] - Returns product detail by slug
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import type { ProductDetail } from '@/types/catalog';
import type { ApiResponse } from '@/types/api';
interface RouteParams {
  params: {
    slug: string;
  };
}

export const revalidate = 60; // Cache for 1 minute

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = createSupabaseServer();
    const { slug } = params;

    // Require authentication
    await requireAuth(supabase);

    if (!slug) {
      return NextResponse.json(
        {
          error: 'Missing product slug',
          message: 'Product slug is required',
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Fetch product with sport and images
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        id,
        sport_id,
        slug,
        name,
        description,
        price_cents,
        active,
        created_at,
        updated_at,
        sports!inner(slug, name),
        product_images(
          id,
          product_id,
          url,
          alt_text,
          sort_order,
          created_at
        )
      `)
      .eq('slug', slug)
      .eq('active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return NextResponse.json(
          {
            error: 'Product not found',
            message: `No product found with slug: ${slug}`,
          } as ApiResponse<null>,
          { status: 404 }
        );
      }

      console.error('Error fetching product:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch product',
          message: error.message,
        } as ApiResponse<null>,
        { status: 500 }
      );
    }

    if (!product) {
      return NextResponse.json(
        {
          error: 'Product not found',
          message: `No product found with slug: ${slug}`,
        } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // Transform to expected format
    const productDetail: ProductDetail = {
      id: product.id,
      sport_id: product.sport_id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      price_cents: product.price_cents,
      active: product.active,
      created_at: product.created_at,
      updated_at: product.updated_at,
      sport_slug: (product.sports as any)?.slug || '',
      sport_name: (product.sports as any)?.name || '',
      images: (product.product_images || [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((img: any) => ({
          id: img.id,
          product_id: img.product_id,
          url: img.url,
          alt_text: img.alt_text,
          sort_order: img.sort_order,
          created_at: img.created_at,
        })),
    };

    return NextResponse.json(
      {
        data: productDetail,
        message: `Product "${product.name}" retrieved successfully`,
      } as ApiResponse<ProductDetail>,
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );

  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'You must be logged in to access product details',
        } as ApiResponse<null>,
        { status: 401 }
      );
    }

    console.error('Unexpected error in product detail endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred while fetching product details',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

// Explicitly disable other methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'POST is not supported on this endpoint' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'PUT is not supported on this endpoint' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'DELETE is not supported on this endpoint' },
    { status: 405 }
  );
}