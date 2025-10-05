import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { revalidateTag, revalidatePath } from 'next/cache';

function parseStoragePathFromUrl(url: string): string | null {
  try {
    // Extract path after /object/public/product-images/
    const match = url.match(/\/object\/public\/product-images\/(.+)$/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error parsing storage path:', error);
    return null;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { imageId: string } }
) {
  try {
    const { user } = await requireAdmin();
    const supabase = createSupabaseServer();

    // Get the image record first
    const { data: imageRecord, error: fetchError } = await supabase
      .from('product_images')
      .select('id, product_id, url')
      .eq('id', params.imageId)
      .single();

    if (fetchError || !imageRecord) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Parse storage path from URL
    const storagePath = parseStoragePathFromUrl(imageRecord.url);

    if (!storagePath) {
      console.error('Could not parse storage path from URL:', imageRecord.url);
    }

    // Delete from database first (more critical than storage cleanup)
    const { error: dbError } = await supabase
      .from('product_images')
      .delete()
      .eq('id', params.imageId);

    if (dbError) {
      console.error('Database delete error:', dbError);
      return NextResponse.json(
        { error: 'Failed to delete image record' },
        { status: 500 }
      );
    }

    // Try to delete from storage (best effort)
    if (storagePath) {
      try {
        const { error: storageError } = await supabase.storage
          .from('product-images')
          .remove([storagePath]);

        if (storageError) {
          console.warn('Storage delete warning (non-critical):', storageError);
        }
      } catch (error) {
        console.warn('Storage delete failed (non-critical):', error);
      }
    }

    // Create audit log
    await supabase.from('admin_audit_logs').insert({
      actor_id: user.id,
      action: 'product-image.delete',
      entity: 'product_images',
      entity_id: imageRecord.id,
      payload: {
        productId: imageRecord.product_id,
        url: imageRecord.url,
        storagePath: storagePath
      }
    });

    // Invalidate catalog cache
    revalidateTag('catalog');
    revalidatePath('/catalog');

    return NextResponse.json({
      message: 'Image deleted successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Product image delete error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}