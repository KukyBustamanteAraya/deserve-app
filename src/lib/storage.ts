import { createClient } from '@supabase/supabase-js';

/**
 * Converts a Supabase storage path to a public URL
 * @param path - The storage path (e.g., "products/{id}/0.jpg")
 * @returns The public URL for the storage object
 */
export function toPublicUrl(path: string): string {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return supabase.storage.from('products').getPublicUrl(path).data.publicUrl;
}

/**
 * Download image from URL as Buffer
 * @throws Error if download fails
 */
export async function downloadImage(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error: any) {
    throw new Error(`Failed to download image from ${url}: ${error.message}`);
  }
}

/**
 * Try to download an image, return undefined if it doesn't exist
 * Useful for optional mask files
 */
export async function tryDownload(url: string): Promise<Buffer | undefined> {
  try {
    return await downloadImage(url);
  } catch (error) {
    return undefined;
  }
}

/**
 * Upload PNG buffer to Supabase Storage
 * @param bucket - Supabase storage bucket name
 * @param path - File path within bucket (e.g., "renders/jersey-123.png")
 * @param buffer - PNG image buffer
 * @param supabase - Supabase client instance
 * @returns Public URL of uploaded file
 * @throws Error if upload fails
 */
export async function uploadPng(
  bucket: string,
  path: string,
  buffer: Buffer,
  supabase: any
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: 'image/png',
    cacheControl: '3600',
    upsert: true, // Allow overwrite for retry scenarios
  });

  if (error) {
    throw new Error(`Failed to upload to ${bucket}/${path}: ${error.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return publicUrl;
}
