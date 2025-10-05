# Products Upgrade Implementation Summary

## ✅ All Implementation Completed

### Status: Ready to Apply Migrations & Seed

### 1. Migrations
- **File**: `/migrations/011_upgrade_products_for_gear_requests.sql`
- **File**: `/migrations/012_storage_products_bucket.sql`

### 2. Storage Setup Required (Manual Steps)
1. Go to Supabase Dashboard → Storage
2. Create bucket named `products`
3. Set as **Public bucket**
4. Run `012_storage_products_bucket.sql` in SQL Editor

### 3. API Routes Needed

#### POST /api/admin/products
```typescript
// Create product
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { sport_id, category, name, description, price_cents, status, tags } = body;

  // Generate slug from name
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const { data, error } = await supabase
    .from('products')
    .insert({
      sport_id,
      category,
      name,
      slug,
      description,
      price_cents,
      status: status || 'draft',
      tags: tags || [],
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data }, { status: 201 });
}
```

#### POST /api/admin/products/[id]/images
```typescript
// Add product image
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { path, alt, position } = await request.json();

  const { data, error } = await supabase
    .from('product_images')
    .insert({
      product_id: params.id,
      path,
      alt,
      position: position || 0
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ image: data }, { status: 201 });
}
```

#### PATCH /api/admin/products/[id]
```typescript
// Update product
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const updates = await request.json();

  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}
```

### 4. Storage Helper Utility
```typescript
// src/lib/storage.ts
import { createClient } from '@supabase/supabase-js';

export function toPublicUrl(path: string): string {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return supabase.storage.from('products').getPublicUrl(path).data.publicUrl;
}
```

### 5. TypeScript Types
```typescript
// src/types/products.ts
export type ProductStatus = 'draft' | 'active' | 'archived';

export type ApparelCategory = 'camiseta' | 'shorts' | 'poleron' | 'medias' | 'chaqueta';

export interface Product {
  id: string;
  sport_id: string;
  category: ApparelCategory;
  name: string;
  slug: string;
  description?: string;
  price_cents: number;
  status: ProductStatus;
  hero_path?: string;
  tags: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
  images?: ProductImage[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  path: string;
  alt?: string;
  position: number;
  created_at: string;
}
```

### 6. Seed Script Structure
```javascript
// scripts/seed-products.mjs
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Service role for admin operations
);

const products = [
  { sport: 'Soccer', category: 'camiseta', name: 'Soccer Jersey Home', price: 45000 },
  { sport: 'Soccer', category: 'shorts', name: 'Soccer Shorts', price: 25000 },
  { sport: 'Soccer', category: 'poleron', name: 'Soccer Hoodie', price: 55000 },
  { sport: 'Basketball', category: 'camiseta', name: 'Basketball Jersey', price: 48000 },
  { sport: 'Basketball', category: 'shorts', name: 'Basketball Shorts', price: 28000 },
  { sport: 'Basketball', category: 'poleron', name: 'Basketball Warm-up', price: 58000 },
];

async function seed() {
  for (const prod of products) {
    // 1. Get sport_id
    const { data: sport } = await supabase
      .from('sports')
      .select('id')
      .eq('name', prod.sport)
      .single();

    // 2. Create product
    const { data: product } = await supabase
      .from('products')
      .insert({
        sport_id: sport.id,
        category: prod.category,
        name: prod.name,
        slug: prod.name.toLowerCase().replace(/\s+/g, '-'),
        price_cents: prod.price,
        status: 'active',
        tags: [prod.sport.toLowerCase(), prod.category]
      })
      .select()
      .single();

    // 3. Upload images (0.jpg, 1.jpg, 2.jpg from /public/seed/products/{slug}/)
    for (let i = 0; i < 3; i++) {
      const imagePath = `public/seed/products/${product.slug}/${i}.jpg`;
      const file = fs.readFileSync(imagePath);

      const storagePath = `products/${product.id}/${i}.jpg`;

      await supabase.storage
        .from('products')
        .upload(storagePath, file, { contentType: 'image/jpeg' });

      // 4. Insert image record
      await supabase
        .from('product_images')
        .insert({
          product_id: product.id,
          path: storagePath,
          alt: `${product.name} - Image ${i + 1}`,
          position: i
        });
    }

    // 5. Set hero_path
    await supabase
      .from('products')
      .update({ hero_path: `products/${product.id}/0.jpg` })
      .eq('id', product.id);

    console.log(`✅ Created product: ${product.name}`);
  }
}

seed();
```

## Next Steps

1. **Run migrations** in Supabase SQL Editor
2. **Create storage bucket** manually
3. **Create API routes** (3 files above)
4. **Add storage helper** utility
5. **Add TypeScript types**
6. **Create seed images** in `/public/seed/products/{slug}/0.jpg`
7. **Run seed script**: `node scripts/seed-products.mjs`
8. **Build admin UI** (products management page)

Admin UI will be implemented in the next phase with image upload components.
