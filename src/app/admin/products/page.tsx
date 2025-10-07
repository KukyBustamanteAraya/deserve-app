import { requireAdmin } from '@/lib/auth/admin-guard';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import ProductsGrid from './ProductsGrid';

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  price_cents: number;
  status: string;
  hero_path: string | null;
  sport_id: string;
  sports?: { name: string };
}

interface ProductWithUrl extends Product {
  hero_url: string | null;
}

export default async function AdminProductsPage() {
  await requireAdmin();

  const supabase = createSupabaseServerClient();

  // Fetch all products with sport names
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      category,
      price_cents,
      status,
      hero_path,
      sport_id,
      sports (name)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
          Failed to load products: {error.message}
        </div>
      </div>
    );
  }

  const typedProducts = (products || []) as unknown as Product[];

  // Convert hero_path to hero_url for each product
  const productsWithUrls: ProductWithUrl[] = typedProducts.map((product) => ({
    ...product,
    hero_url: product.hero_path
      ? supabase.storage.from('products').getPublicUrl(product.hero_path).data.publicUrl
      : null,
  }));

  return <ProductsGrid products={productsWithUrls} />;
}