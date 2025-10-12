import { requireAdmin } from '@/lib/auth/admin-guard';
import ProductForm from '@/components/admin/ProductForm';

export default async function NewProductPage() {
  await requireAdmin();

  return <ProductForm mode="create" />;
}
