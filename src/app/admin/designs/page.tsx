import { requireAdmin } from '@/lib/auth/admin-guard';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import DesignsGrid from './DesignsGrid';

interface Design {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  designer_name: string | null;
  style_tags: string[];
  color_scheme: string[];
  is_customizable: boolean;
  allows_recoloring: boolean;
  featured: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
  mockup_count?: number;
  available_sports?: string[];
  available_product_types?: string[];
  primary_mockup_url?: string | null;
}

export default async function AdminDesignsPage() {
  await requireAdmin();

  const supabase = createSupabaseServer();

  // Fetch all designs with mockups
  const { data: designs, error } = await supabase
    .from('designs')
    .select(`
      *,
      design_mockups (
        id,
        sport_id,
        product_type_slug,
        mockup_url,
        is_primary,
        sports:sport_id (
          id,
          slug,
          name
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
          Failed to load designs: {error.message}
        </div>
      </div>
    );
  }

  // Transform data: Add summary info
  const transformedDesigns: Design[] = (designs || []).map((design: any) => {
    const mockups = design.design_mockups || [];
    const availableSports = [...new Set(mockups.map((m: any) => m.sports?.slug).filter(Boolean))];
    const availableProductTypes = [...new Set(mockups.map((m: any) => m.product_type_slug).filter(Boolean))];
    const primaryMockup = mockups.find((m: any) => m.is_primary) || mockups[0];

    return {
      id: design.id,
      name: design.name,
      slug: design.slug,
      description: design.description,
      designer_name: design.designer_name,
      style_tags: design.style_tags || [],
      color_scheme: design.color_scheme || [],
      is_customizable: design.is_customizable,
      allows_recoloring: design.allows_recoloring,
      featured: design.featured,
      active: design.active,
      created_at: design.created_at,
      updated_at: design.updated_at,
      mockup_count: mockups.length,
      available_sports: availableSports,
      available_product_types: availableProductTypes,
      primary_mockup_url: primaryMockup?.mockup_url || null,
    };
  });

  return <DesignsGrid designs={transformedDesigns} />;
}
