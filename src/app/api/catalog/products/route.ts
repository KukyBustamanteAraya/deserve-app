import { NextRequest, NextResponse } from 'next/server';
import { queryProducts } from '@/lib/catalog/queryProducts';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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

    return NextResponse.json(
      { data: result },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' }
      }
    );
  } catch (error: any) {
    console.error('products api error:', error);
    return NextResponse.json(
      {
        data: { items: [], total: 0, nextCursor: null },
        error: 'Failed to load products'
      },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' }
      }
    );
  }
}

// POST /api/catalog/products - Create new product (admin only)
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Normalize and validate price_cents (accept string or number)
    const cents = Number(body.price_cents ?? body.price ?? 0);
    if (!Number.isFinite(cents) || cents < 0) {
      return NextResponse.json(
        { error: 'Invalid price: must be a non-negative number' },
        { status: 400 }
      );
    }

    // Extract fields, explicitly excluding 'price' to avoid sending null to DB
    const {
      price,           // eslint-disable-line @typescript-eslint/no-unused-vars
      price_cents,     // eslint-disable-line @typescript-eslint/no-unused-vars
      sport_id,
      category,
      name,
      slug,
      description,
      status: productStatus,
      tags,
      imageData,
      hero_path,
      tempImageFolder
    } = body;

    // Validate required fields
    if (!sport_id || !category || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: sport_id, category, name, price_cents' },
        { status: 400 }
      );
    }

    // Validate hero_path for active products
    if (productStatus === 'active' && !hero_path) {
      return NextResponse.json(
        { error: 'Para publicar como Activo, sube una imagen y selecciona una portada (Hero).' },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingProduct) {
      return NextResponse.json(
        { error: `Slug "${slug}" already exists. Please choose a different one.` },
        { status: 409 }
      );
    }

    // Build insert payload - only include price_cents (integer), NOT price
    // The DB trigger will populate the price column from price_cents
    // IMPORTANT: Include hero_path (temp) to satisfy products_active_needs_hero constraint
    const insertPayload: any = {
      sport_id,
      category,
      name,
      slug,
      description: description || null,
      price_cents: Math.round(cents), // Ensure integer
      status: productStatus || 'draft',
      tags: tags || [],
      created_by: user.id,
      hero_path: hero_path ?? null  // Include temp path for active products
      // Do NOT include 'price' key - DB trigger handles it
    };

    // Insert product with temp hero_path (satisfies constraint for active status)
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert([insertPayload])
      .select()
      .single();

    if (productError) {
      return NextResponse.json({ error: productError.message }, { status: 500 });
    }

    // Handle images if provided
    if (imageData && imageData.images && imageData.images.length > 0) {
      const { tempFolderId, images } = imageData;

      // Normalize temp folder name to handle both "temp-<uuid>" and "<uuid>" formats
      const rawTempFolder = (tempImageFolder ?? tempFolderId ?? '').toString().trim();
      const tempSuffix = rawTempFolder.replace(/^temp-/, ''); // Strip leading "temp-" if present
      const tempPrefix = `temp-${tempSuffix}`;                 // Guaranteed form: "temp-<uuid>"

      // Step 1: Copy files from temp folder to final product folder
      const { data: files, error: listErr } = await supabase.storage
        .from('products')
        .list(tempPrefix, { limit: 100 });

      if (listErr) {
        console.error('Failed to list temp files:', listErr);
        return NextResponse.json(
          { error: 'Product created but failed to process images' },
          { status: 500 }
        );
      }

      // Copy each file from temp to final location
      const copyErrors: string[] = [];
      for (const file of files ?? []) {
        const fromPath = `${tempPrefix}/${file.name}`;
        const toPath = `${product.id}/${file.name}`;

        const { error: copyErr } = await supabase.storage
          .from('products')
          .copy(fromPath, toPath);

        if (copyErr) {
          console.error(`Failed to copy ${fromPath} to ${toPath}:`, copyErr);
          copyErrors.push(file.name);
        }
      }

      // If any copies failed, return error
      if (copyErrors.length > 0) {
        return NextResponse.json(
          { error: `Product created but failed to copy images: ${copyErrors.join(', ')}` },
          { status: 500 }
        );
      }

      // Step 2: Delete temp files after successful copy
      const filesToRemove = (files ?? []).map(f => `${tempPrefix}/${f.name}`);
      if (filesToRemove.length > 0) {
        const { error: removeErr } = await supabase.storage
          .from('products')
          .remove(filesToRemove);

        if (removeErr) {
          console.warn('Failed to cleanup temp files:', removeErr);
          // Don't fail the request, just log warning
        }
      }

      // Step 3: Insert product_images records with final paths
      const updatedImages = images.map((img: any) => ({
        product_id: product.id,
        path: img.path.replace(`temp-${tempFolderId}`, product.id),
        alt: img.alt || '',
        position: img.index,
      }));

      const { error: imagesError } = await supabase
        .from('product_images')
        .insert(updatedImages);

      if (imagesError) {
        console.error('Failed to insert product images:', imagesError);
        return NextResponse.json(
          { error: 'Product created but failed to save image records' },
          { status: 500 }
        );
      }

      // Step 4: Set hero_path with final rewritten path using normalized tempPrefix
      if (hero_path) {
        const finalHeroPath = hero_path.replace(tempPrefix, String(product.id));
        const { error: heroError } = await supabase
          .from('products')
          .update({ hero_path: finalHeroPath })
          .eq('id', product.id);

        if (heroError) {
          console.error('Failed to set hero_path:', heroError);
          return NextResponse.json(
            { error: 'Product created but failed to set hero image' },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Invalid request' }, { status: 400 });
  }
}