import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const CreateProductSchema = z.object({
  sportId: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  priceCents: z.number().int().min(0),
  description: z.string().optional(),
  active: z.boolean().optional().default(true),
});

const UpdateProductSchema = CreateProductSchema.partial();

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createSupabaseServer();

    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        slug,
        name,
        description,
        price_cents,
        active,
        created_at,
        updated_at,
        sports!inner (
          id,
          slug,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching products:', error);
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      );
    }

    return NextResponse.json({ products });
  } catch (error) {
    logger.error('Admin products GET error:', error);
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
    const supabase = createSupabaseServer();

    // Check if sport exists
    const { data: sport, error: sportError } = await supabase
      .from('sports')
      .select('id')
      .eq('id', validatedData.sportId)
      .single();

    if (sportError || !sport) {
      return NextResponse.json(
        { error: 'Sport not found' },
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

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        sport_id: validatedData.sportId,
        name: validatedData.name,
        slug: validatedData.slug,
        price_cents: validatedData.priceCents,
        description: validatedData.description,
        active: validatedData.active,
      })
      .select(`
        id,
        slug,
        name,
        description,
        price_cents,
        active,
        created_at,
        updated_at,
        sports!inner (
          id,
          slug,
          name
        )
      `)
      .single();

    if (error) {
      logger.error('Error creating product:', error);
      return NextResponse.json(
        { error: 'Failed to create product' },
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

    logger.error('Admin products POST error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}