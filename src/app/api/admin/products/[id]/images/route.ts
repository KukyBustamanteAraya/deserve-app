import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { revalidateTag, revalidatePath } from 'next/cache';
import { z } from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await requireAdmin();
    const supabase = createSupabaseServer();

    // Verify product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', params.id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sortOrderStr = formData.get('sort_order') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Get next sort_order if not provided
    let sortOrder = 0;
    if (sortOrderStr) {
      sortOrder = parseInt(sortOrderStr);
      if (isNaN(sortOrder)) {
        sortOrder = 0;
      }
    } else {
      // Get max sort_order for this product
      const { data: maxImage } = await supabase
        .from('product_images')
        .select('sort_order')
        .eq('product_id', params.id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

      sortOrder = maxImage ? maxImage.sort_order + 1 : 0;
    }

    // Generate unique file name
    const fileExt = file.name.split('.').pop() || 'jpg';
    const uniqueId = crypto.randomUUID();
    const fileName = `${params.id}/${uniqueId}.${fileExt}`;

    // Convert file to array buffer
    const fileBuffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { error: 'Failed to get image URL' },
        { status: 500 }
      );
    }

    // Insert into product_images table
    const { data: imageRow, error: dbError } = await supabase
      .from('product_images')
      .insert({
        product_id: params.id,
        url: urlData.publicUrl,
        alt_text: product.name,
        sort_order: sortOrder
      })
      .select('id, url, alt_text, sort_order, created_at')
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);

      // Try to clean up uploaded file
      await supabase.storage
        .from('product-images')
        .remove([fileName]);

      return NextResponse.json(
        { error: 'Failed to save image record' },
        { status: 500 }
      );
    }

    // Create audit log
    await supabase.from('admin_audit_logs').insert({
      actor_id: user.id,
      action: 'product-image.upload',
      entity: 'product_images',
      entity_id: imageRow.id,
      payload: {
        productId: params.id,
        url: urlData.publicUrl,
        fileName: fileName
      }
    });

    // Invalidate catalog cache
    revalidateTag('catalog');
    revalidatePath('/catalog');

    return NextResponse.json({
      image: imageRow,
      message: 'Image uploaded successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Product image upload error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}