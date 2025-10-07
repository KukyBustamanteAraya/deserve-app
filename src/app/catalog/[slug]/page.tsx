// Product detail page with server-side rendering
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { ProductDetailClientSimplified } from './ProductDetailClientSimplified';
import type { ProductDetail } from '@/types/catalog';

export const dynamic = 'force-dynamic'; // Force dynamic rendering to use cookies()

async function getProduct(slug: string): Promise<ProductDetail | null> {
  const supabase = createSupabaseServer();

  try {
    await requireAuth(supabase);

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        id,
        sport_id,
        slug,
        name,
        description,
        price_cents,
        base_price_cents,
        retail_price_cents,
        product_type_slug,
        status,
        created_at,
        updated_at,
        sports!inner(slug, name),
        product_images(
          id,
          product_id,
          path,
          alt,
          position
        )
      `)
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (error) {
      console.error('Error fetching product:', error);
      return null;
    }

    if (!product) {
      return null;
    }

    // Calculate display_price_cents: COALESCE(retail_price_cents, price_cents, base_price_cents, 0)
    const display_price_cents = product.retail_price_cents ?? product.price_cents ?? product.base_price_cents ?? 0;

    // Log warning if product has no price data
    if (!product.retail_price_cents && !product.price_cents && !product.base_price_cents) {
      console.warn(`⚠️  Product ${product.id} (${product.slug}) has no price data.`);
    }

    // Transform to expected format
    return {
      id: product.id,
      sport_id: product.sport_id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      price_cents: product.price_cents,
      base_price_cents: product.base_price_cents ?? null,
      retail_price_cents: product.retail_price_cents ?? null,
      display_price_cents,
      active: product.status === 'active',
      product_type_slug: product.product_type_slug ?? null,
      created_at: product.created_at,
      updated_at: product.updated_at,
      sport_slug: (product.sports as any)?.slug || '',
      sport_name: (product.sports as any)?.name || '',
      images: (product.product_images || [])
        .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
        .map((img: any) => {
          // Build full Supabase Storage URL
          const imageUrl = img.path
            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${img.path}`
            : null;

          return {
            id: img.id,
            product_id: img.product_id,
            url: imageUrl || '',
            alt_text: img.alt || null,
            sort_order: img.position || 0,
            created_at: img.created_at || new Date().toISOString(),
          };
        }),
    };
  } catch (error) {
    console.error('Error in getProduct:', error);
    return null;
  }
}

// Get related products from the same sport
async function getRelatedProducts(sportId: string, currentProductId: string, limit = 4) {
  const supabase = createSupabaseServer();

  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        slug,
        name,
        price_cents,
        sports!inner(slug, name),
        product_images(path, alt, position)
      `)
      .eq('sport_id', sportId)
      .eq('status', 'active')
      .neq('id', currentProductId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching related products:', error);
      return [];
    }

    return (products || []).map((product: any) => {
      const thumbnailImage = product.product_images
        ?.sort((a: any, b: any) => (a.position || 0) - (b.position || 0))?.[0];

      // Build full Supabase Storage URL
      const thumbnailUrl = thumbnailImage?.path
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${thumbnailImage.path}`
        : null;

      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price_cents: product.price_cents,
        display_price_cents: product.price_cents || 0,
        active: true,
        thumbnail_url: thumbnailUrl,
        thumbnail_alt: thumbnailImage?.alt || product.name,
        sport_slug: product.sports?.slug || '',
        sport_name: product.sports?.name || '',
      };
    });
  } catch (error) {
    console.error('Error in getRelatedProducts:', error);
    return [];
  }
}

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = params;

  // Check authentication server-side
  const supabase = createSupabaseServer();
  try {
    await requireAuth(supabase);
  } catch (error) {
    redirect(`/login?redirect=/catalog/${slug}`);
  }

  // Fetch product data
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  // Fetch related products
  const relatedProducts = await getRelatedProducts(product.sport_id, product.id);

  return (
    <ProductDetailClientSimplified
      product={product}
      relatedProducts={relatedProducts}
    />
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  const { slug } = params;
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: 'Producto no encontrado | Deserve',
      description: 'El producto que buscas no está disponible.',
    };
  }

  return {
    title: `${product.name} - ${product.sport_name} | Deserve`,
    description: product.description || `${product.name} - Uniforme profesional de ${product.sport_name}`,
    openGraph: {
      title: `${product.name} - ${product.sport_name}`,
      description: product.description || `Uniforme profesional de ${product.sport_name}`,
      images: product.images.length > 0 ? [
        {
          url: product.images[0].url,
          width: 800,
          height: 800,
          alt: product.images[0].alt_text || product.name,
        }
      ] : undefined,
    },
  };
}

// Note: generateStaticParams removed because we use dynamic rendering with cookies()
// Products are rendered on-demand to support authentication