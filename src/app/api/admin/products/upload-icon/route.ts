import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const productId = formData.get('productId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!productId) {
      return NextResponse.json({ error: 'No product ID provided' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'product-icons');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate filename with product ID and timestamp
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `product-${productId}-${timestamp}.${extension}`;
    const filepath = join(uploadsDir, filename);

    // Write file
    await writeFile(filepath, buffer);

    // Return public URL
    const url = `/uploads/product-icons/${filename}`;

    logger.info(`Product icon uploaded successfully for product ${productId}: ${url}`);

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    logger.error('Error uploading product icon:', toError(error));
    return NextResponse.json(
      { error: 'Failed to upload product icon' },
      { status: 500 }
    );
  }
}
