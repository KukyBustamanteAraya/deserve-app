import { requireAdmin } from '@/lib/auth/admin-guard';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import ProductsGrid from './ProductsGrid';

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  price_clp: number;
  status: string;
  hero_path: string | null;
  icon_url: string | null;
  sport_id?: string;                      // DEPRECATED
  sport_ids: number[];                    // Array of sport IDs
  sport_names?: string[];                 // Array of sport names for display
}

interface ProductWithUrl extends Product {
  hero_url: string | null;
}

export default async function AdminProductsPage() {
  await requireAdmin();

  const supabase = await createSupabaseServer();

  // Fetch all products with sport_ids
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      category,
      price_clp,
      status,
      hero_path,
      icon_url,
      sport_ids
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

  // Fetch all sports
  const { data: sports } = await supabase
    .from('sports')
    .select('id, name')
    .order('name');

  const sportsMap = new Map((sports || []).map(s => [s.id, s.name]));

  const typedProducts = (products || []) as unknown as Product[];

  // Map sport_ids to sport_names and convert hero_path to hero_url
  const productsWithUrls: ProductWithUrl[] = typedProducts.map((product) => ({
    ...product,
    sport_names: (product.sport_ids || [])
      .map(id => sportsMap.get(id))
      .filter((name): name is string => !!name),
    hero_url: product.hero_path
      ? supabase.storage.from('products').getPublicUrl(product.hero_path).data.publicUrl
      : null,
  }));

  return <ProductsGrid products={productsWithUrls} />;
}