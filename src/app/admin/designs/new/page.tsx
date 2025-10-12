import { requireAdmin } from '@/lib/auth/admin-guard';
import DesignForm from '@/components/admin/DesignForm';

export default async function NewDesignPage() {
  await requireAdmin();

  return <DesignForm mode="create" />;
}
