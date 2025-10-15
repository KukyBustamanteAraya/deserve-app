import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ error: 'No type provided' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'theme');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `${type}-${timestamp}.${extension}`;
    const filepath = join(uploadsDir, filename);

    // Write file
    await writeFile(filepath, buffer);

    // Return public URL
    const url = `/uploads/theme/${filename}`;

    logger.info(`File uploaded successfully: ${url}`);

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    logger.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
