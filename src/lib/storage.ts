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
