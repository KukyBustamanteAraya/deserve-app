import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

const CreateProductSchema = z.object({
  sport_ids: z.array(z.number().int().positive()),
  category: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  price_clp: z.number().int().min(0),
  status: z.enum(['draft', 'active', 'archived']).optional().default('draft'),
  product_type_slug: z.string().min(1).max(255),
  description: z.string().optional(),
});

const UpdateProductSchema = CreateProductSchema.partial();

export async function GET() {
  try {
    await requireAdmin();
    const supabase = await createSupabaseServer();

    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching products:', toError(error));
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      );
    }

    return NextResponse.json({ products });
  } catch (error) {
    logger.error('Admin products GET error:', toError(error));
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();

    const validatedData = CreateProductSchema.parse(body);
    const supabase = await createSupabaseServer();

    // Check if all sports exist
    const { data: sports, error: sportsError } = await supabase
      .from('sports')
      .select('id')
      .in('id', validatedData.sport_ids);

    if (sportsError || !sports || sports.length !== validatedData.sport_ids.length) {
      return NextResponse.json(
        { error: 'One or more sports not found' },
        { status: 400 }
      );
    }

    // Check if slug is unique
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('slug', validatedData.slug)
      .single();

    if (existingProduct) {
      return NextResponse.json(
        { error: 'Slug already exists' },
        { status: 400 }
      );
    }

    // Create product with multiple sports
    // Note: This assumes your products table has sport_ids as an array column
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        sport_ids: validatedData.sport_ids,
        category: validatedData.category,
        name: validatedData.name,
        slug: validatedData.slug,
        price_clp: validatedData.price_clp,
        status: validatedData.status,
        product_type_slug: validatedData.product_type_slug,
        description: validatedData.description,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating product:', toError(error));
      return NextResponse.json(
        { error: 'Failed to create product', details: error.message },
        { status: 500 }
      );
    }

    // Invalidate catalog cache
    revalidateTag('catalog');

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Admin products POST error:', toError(error));
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}