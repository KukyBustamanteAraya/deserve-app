import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const UpdateProductSchema = z.object({
  sport_ids: z.array(z.number()).optional(),      // Array of sport IDs (snake_case to match form)
  category: z.string().optional(),                 // Product category
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
  price_cents: z.number().int().min(0).optional(), // Price in cents (snake_case to match form)
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(), // Status enum (to match form)
  product_type_slug: z.string().optional(),        // Product type slug
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const body = await request.json();

    const validatedData = UpdateProductSchema.parse(body);
    const supabase = createSupabaseServer();

    // Check if product exists
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('id, slug')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // If updating slug, check if it's unique (excluding current product)
    if (validatedData.slug && validatedData.slug !== existingProduct.slug) {
      const { data: slugExists } = await supabase
        .from('products')
        .select('id')
        .eq('slug', validatedData.slug)
        .neq('id', params.id)
        .single();

      if (slugExists) {
        return NextResponse.json(
          { error: 'Slug already exists' },
          { status: 400 }
        );
      }
    }

    // Build update object (using snake_case to match database columns)
    const updateData: any = {};
    if (validatedData.sport_ids) updateData.sport_ids = validatedData.sport_ids;
    if (validatedData.category) updateData.category = validatedData.category;
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.slug) updateData.slug = validatedData.slug;
    if (validatedData.price_cents !== undefined) updateData.price_cents = validatedData.price_cents;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;
    if (validatedData.product_type_slug) updateData.product_type_slug = validatedData.product_type_slug;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        id,
        sport_ids,
        category,
        slug,
        name,
        description,
        price_cents,
        status,
        product_type_slug,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      logger.error('Error updating product:', error);
      return NextResponse.json(
        { error: 'Failed to update product', details: error.message },
        { status: 500 }
      );
    }

    // Invalidate catalog cache
    revalidateTag('catalog');

    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Admin products PATCH error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const supabase = createSupabaseServer();

    // Check if product exists
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', params.id);

    if (error) {
      logger.error('Error deleting product:', error);
      return NextResponse.json(
        { error: 'Failed to delete product' },
        { status: 500 }
      );
    }

    // Invalidate catalog cache
    revalidateTag('catalog');

    return NextResponse.json(
      { message: 'Product deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Admin products DELETE error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}