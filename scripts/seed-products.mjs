#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Service role for admin operations
);

// Product seed data (2 sports × 3 apparel types = 6 products)
const products = [
  { sport: 'Soccer', category: 'camiseta', name: 'Soccer Jersey Home', description: 'Official home jersey for soccer teams', price: 45000 },
  { sport: 'Soccer', category: 'shorts', name: 'Soccer Shorts', description: 'Professional soccer shorts', price: 25000 },
  { sport: 'Soccer', category: 'poleron', name: 'Soccer Hoodie', description: 'Warm-up hoodie for soccer players', price: 55000 },
  { sport: 'Basketball', category: 'camiseta', name: 'Basketball Jersey', description: 'Official basketball jersey', price: 48000 },
  { sport: 'Basketball', category: 'shorts', name: 'Basketball Shorts', description: 'Professional basketball shorts', price: 28000 },
  { sport: 'Basketball', category: 'poleron', name: 'Basketball Warm-up', description: 'Warm-up jacket for basketball', price: 58000 },
];

async function seedProducts() {
  console.log('🌱 Starting product seed...\n');

  for (const prod of products) {
    console.log(`\n📦 Processing: ${prod.name}...`);

    // 1. Get sport_id
    const { data: sport, error: sportError } = await supabase
      .from('sports')
      .select('id')
      .eq('name', prod.sport)
      .single();

    if (sportError || !sport) {
      console.error(`❌ Sport "${prod.sport}" not found. Skipping ${prod.name}`);
      continue;
    }

    console.log(`   ✓ Found sport: ${prod.sport} (${sport.id})`);

    // 2. Create product
    const slug = prod.name.toLowerCase().replace(/\s+/g, '-');
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        sport_id: sport.id,
        category: prod.category,
        name: prod.name,
        slug,
        description: prod.description,
        price_cents: prod.price,
        status: 'active',
        tags: [prod.sport.toLowerCase(), prod.category]
      })
      .select()
      .single();

    if (productError || !product) {
      console.error(`   ❌ Failed to create product: ${productError?.message}`);
      continue;
    }

    console.log(`   ✓ Created product: ${product.name} (${product.id})`);

    // 3. Upload placeholder images (0.jpg, 1.jpg, 2.jpg)
    const imagePromises = [];
    for (let i = 0; i < 3; i++) {
      const imageName = `${i}.jpg`;
      const storagePath = `products/${product.id}/${imageName}`;

      // Create a simple placeholder image buffer (1x1 pixel JPEG)
      // In production, you would upload actual images from /public/seed/products/{slug}/
      const placeholderBuffer = Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlbaWmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==',
        'base64'
      );

      // Upload to storage
      const uploadPromise = supabase.storage
        .from('products')
        .upload(storagePath, placeholderBuffer, {
          contentType: 'image/jpeg',
          upsert: false
        })
        .then(({ data, error }) => {
          if (error) {
            console.error(`   ❌ Failed to upload ${imageName}: ${error.message}`);
            return null;
          }
          console.log(`   ✓ Uploaded ${imageName}`);
          return { path: storagePath, position: i };
        });

      imagePromises.push(uploadPromise);
    }

    const uploadedImages = (await Promise.all(imagePromises)).filter(Boolean);

    // 4. Insert image records
    for (const { path: imgPath, position } of uploadedImages) {
      const { error: imgError } = await supabase
        .from('product_images')
        .insert({
          product_id: product.id,
          path: imgPath,
          alt: `${product.name} - Image ${position + 1}`,
          position
        });

      if (imgError) {
        console.error(`   ❌ Failed to create image record: ${imgError.message}`);
      } else {
        console.log(`   ✓ Created image record (position ${position})`);
      }
    }

    // 5. Set hero_path to first image
    if (uploadedImages.length > 0) {
      const heroPath = `products/${product.id}/0.jpg`;
      const { error: heroError } = await supabase
        .from('products')
        .update({ hero_path: heroPath })
        .eq('id', product.id);

      if (heroError) {
        console.error(`   ❌ Failed to set hero_path: ${heroError.message}`);
      } else {
        console.log(`   ✓ Set hero_path: ${heroPath}`);
      }
    }

    console.log(`✅ Completed: ${product.name}`);
  }

  console.log('\n🎉 Seed complete!\n');
}

// Run seed
seedProducts().catch(error => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
