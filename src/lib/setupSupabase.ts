import { supabaseClient } from './supabaseClient';
import { logger } from '@/lib/logger';

// Create products table
export async function createProductsTable() {
  const { error } = await supabaseClient.rpc('create_products_table', {});

  if (error && !error.message.includes('already exists')) {
    logger.error('Error creating products table:', error);
    return false;
  }

  return true;
}

// Create storage bucket for product images
export async function createProductImagesBucket() {
  const { data, error } = await supabaseClient.storage.createBucket('product-images', {
    public: true,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    fileSizeLimit: 5242880, // 5MB
  });

  if (error && !error.message.includes('already exists')) {
    logger.error('Error creating bucket:', error);
    return false;
  }

  return true;
}

// Upload a single image to Supabase Storage
export async function uploadProductImage(file: File, fileName: string): Promise<string | null> {
  const { data, error } = await supabaseClient.storage
    .from('product-images')
    .upload(fileName, file, {
      cacheControl: '31536000', // 1 year cache
      upsert: true
    });

  if (error) {
    logger.error('Error uploading image:', error);
    return null;
  }

  // Get public URL
  const { data: urlData } = supabaseClient.storage
    .from('product-images')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

// Get public URL for existing image
export function getProductImageUrl(fileName: string): string {
  const { data } = supabaseClient.storage
    .from('product-images')
    .getPublicUrl(fileName);

  return data.publicUrl;
}

// Insert product into database
export async function insertProduct(product: {
  name: string;
  price: string;
  sport: string;
  category: string;
  image_url: string;
  image_filename: string;
}) {
  const { data, error } = await supabaseClient
    .from('products')
    .insert([product])
    .select();

  if (error) {
    logger.error('Error inserting product:', error);
    return null;
  }

  return data[0];
}

// Get products by sport
export async function getProductsBySport(sport: string, limit: number = 20, offset: number = 0) {
  const { data, error } = await supabaseClient
    .from('products')
    .select('*')
    .eq('sport', sport)
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching products:', error);
    return [];
  }

  return data || [];
}

// Get total count of products for a sport
export async function getProductsCountBySport(sport: string): Promise<number> {
  const { count, error } = await supabaseClient
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('sport', sport);

  if (error) {
    logger.error('Error counting products:', error);
    return 0;
  }

  return count || 0;
}

// Get sample products for home page (4 per sport)
export async function getSampleProducts() {
  const sports = ['fútbol', 'básquetbol', 'voleibol', 'rugby', 'golf', 'equipo'];
  const results: Record<string, any[]> = {};

  for (const sport of sports) {
    const { data, error } = await supabaseClient
      .from('products')
      .select('*')
      .eq('sport', sport)
      .limit(4);

    if (!error && data) {
      results[sport] = data;
    } else {
      results[sport] = [];
    }
  }

  return results;
}