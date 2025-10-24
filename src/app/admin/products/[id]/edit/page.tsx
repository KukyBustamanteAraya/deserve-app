import { requireAdmin } from '@/lib/auth/admin-guard';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

const ProductForm = dynamic(() => import('@/components/admin/ProductForm'));

export default async function EditProductPage({ params }: { params: { id: string } }) {
  await requireAdmin();

  const supabase = await createSupabaseServer();

  // Fetch product data
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !product) {
    notFound();
  }

  // Convert sport_ids (bigint[]) to string[] for form
  const sportIdsAsStrings = (product.sport_ids || []).map((id: number) => String(id));

  return (
    <ProductForm
      mode="edit"
      productId={params.id}
      initialData={{
        sport_ids: sportIdsAsStrings,
        category: product.category,
        name: product.name,
        price_clp: product.price_clp, // Already in CLP, no conversion needed
        status: product.status,
      }}
    />
  );
}
