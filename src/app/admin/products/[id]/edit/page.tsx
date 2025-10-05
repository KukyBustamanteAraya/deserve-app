import { requireAdmin } from '@/lib/auth/admin-guard';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

const ProductForm = dynamic(() => import('@/components/admin/ProductForm'), { ssr: false });

export default async function EditProductPage({ params }: { params: { id: string } }) {
  await requireAdmin();

  const supabase = createSupabaseServerClient();

  // Fetch product data
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !product) {
    notFound();
  }

  return (
    <ProductForm
      mode="edit"
      productId={params.id}
      initialData={{
        sport_id: product.sport_id,
        category: product.category,
        name: product.name,
        slug: product.slug,
        description: product.description || '',
        price_cents: product.price_cents,
        status: product.status,
        tags: product.tags || [],
      }}
    />
  );
}
