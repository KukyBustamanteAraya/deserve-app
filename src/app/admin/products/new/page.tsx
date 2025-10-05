import { requireAdmin } from '@/lib/auth/admin-guard';
import dynamic from 'next/dynamic';

const ProductForm = dynamic(() => import('@/components/admin/ProductForm'), { ssr: false });

export default async function NewProductPage() {
  await requireAdmin();

  return <ProductForm mode="create" />;
}
