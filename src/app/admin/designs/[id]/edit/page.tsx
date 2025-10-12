import { requireAdmin } from '@/lib/auth/admin-guard';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { notFound } from 'next/navigation';
import DesignForm from '@/components/admin/DesignForm';

interface EditDesignPageProps {
  params: {
    id: string;
  };
}

export default async function EditDesignPage({ params }: EditDesignPageProps) {
  await requireAdmin();

  const { id } = params;
  const supabase = createSupabaseServer();

  // Fetch design with mockups
  const { data: design, error } = await supabase
    .from('designs')
    .select(`
      *,
      design_mockups (
        id,
        sport_id,
        product_type_slug,
        mockup_url,
        view_angle,
        is_primary,
        sort_order,
        sports:sport_id (
          id,
          slug,
          name
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error || !design) {
    notFound();
  }

  return <DesignForm mode="edit" design={design} />;
}
